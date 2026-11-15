import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { createRequire } from "node:module";

// Exercise a built checkout or installed executable with a disposable server and profile.
// Chromium's test keychain keeps repeated builds from touching the user's real Keychain.
// This never pairs the user's T3 server, opens a window, or changes startup registration.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const metadata = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const fromSource = process.argv[2] === "--source";
const appDirectory = fromSource ? null : process.argv[2];
if (!fromSource && !appDirectory) throw new Error("Pass --source or the directory containing the installed .app.");
let executable;
if (fromSource) {
  const relativeExecutable = (await readFile(join(root, "node_modules", "electron", "path.txt"), "utf8")).trim();
  executable = join(root, "node_modules", "electron", "dist", relativeExecutable);
} else {
  executable = join(resolve(appDirectory), `${metadata.productName}.app`, "Contents", "MacOS", "t3-companion");
  const builderRequire = createRequire(import.meta.resolve("electron-builder"));
  const asar = createRequire(builderRequire.resolve("app-builder-lib"))("@electron/asar");
  const packagedFiles = asar.listPackage(join(resolve(appDirectory), `${metadata.productName}.app`, "Contents", "Resources", "app.asar"));
  for (const notice of ["/LICENSE", "/THIRD_PARTY_NOTICES.md", "/licenses/T3-Code-MIT.txt", "/licenses/T3-Tots-MIT.txt"])
    assert(packagedFiles.includes(notice), `Missing packaged notice: ${notice}`);
  assert(!packagedFiles.some((path) => /^\/(src|scripts|docs)\//.test(path)), "Development files were packaged");
}
const temporary = await mkdtemp(join(tmpdir(), "companion-smoke-"));
const token = "smoke-session-credential";
const code = "23456789ABCD";
let revoked = false;
let protocol = 2;
let exchanged = false;
const server = createServer(async (request, response) => {
  const reply = (body, status = 200) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); };
  if (request.url === "/.well-known/t3/environment") return reply({ environmentId: "smoke-env", label: "Smoke", orchestrationProtocolVersion: protocol });
  if (request.url === "/oauth/token") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const fields = new URLSearchParams(body);
    if (fields.get("subject_token") !== code) return reply({}, 401);
    exchanged = true;
    return reply({ access_token: token, expires_in: 3600, scope: "orchestration:read orchestration:operate" });
  }
  if (request.url === "/api/auth/websocket-ticket/rpc") {
    if (revoked || request.headers.authorization !== `Bearer ${token}`) return reply({}, 401);
    return reply({ ticket: "smoke-ticket" });
  }
  reply({}, 404);
});
const ws = new WebSocketServer({ server, path: "/ws" });
ws.on("connection", (socket, request) => {
  if (new URL(request.url, "http://localhost").searchParams.get("wsTicket") !== "smoke-ticket") return socket.close();
  socket.on("message", (data) => {
    const frame = JSON.parse(data.toString());
    if (frame._tag === "Ping") socket.send(JSON.stringify({ _tag: "Pong" }));
    if (frame._tag === "Request") socket.send(JSON.stringify({ _tag: "Exit", requestId: frame.id,
      exit: { _tag: "Success", value: { providers: [] } } }));
  });
});

async function command(action, input) {
  return new Promise((resolveCommand, reject) => {
    const env = { ...process.env, T3_COMPANION_USER_DATA: join(temporary, "data") };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(executable, [...(fromSource ? [root] : []), "--use-mock-keychain", `--companion-command=${action}`], { env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`Packaged ${action} command timed out.`)); }, 60_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      try {
        assert(!stdout.includes(token) && !stdout.includes(code), "Command output leaked credentials");
        assert(!stderr.includes(token) && !stderr.includes(code), "Diagnostic output leaked credentials");
        resolveCommand({ code: exitCode, body: JSON.parse(stdout.trim()) });
      } catch (error) {
        const diagnostic = stderr.replaceAll(token, "<redacted>").replaceAll(code, "<redacted>");
        reject(new Error(`Packaged ${action} failed, exit=${exitCode}, signal=${signal}: ${error.message}. ${diagnostic.slice(-1500)}`));
      }
    });
  });
}

try {
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const base = `http://127.0.0.1:${server.address().port}`;
  const initial = await command("status");
  assert.equal(initial.code, 2);
  assert.equal(initial.body.paired, false);
  const invalid = await command("pair", `https://app.t3.codes/pair?host=http://&token=${code}`);
  assert.equal(invalid.code, 1);
  const paired = await command("pair", `QR\nPairing URL: ${base}/pair#token=${code}\n`);
  assert.equal(paired.code, 0, paired.body.error);
  assert.equal(exchanged, true);
  const config = await readFile(join(temporary, "data", "config.json"), "utf8");
  assert(!config.includes(token), "Session was stored without encryption");
  const connected = await command("status");
  assert.equal(connected.code, 0, connected.body.error);
  assert.equal(connected.body.connected, true);
  protocol = 3;
  const incompatible = await command("status");
  assert.equal(incompatible.code, 1);
  assert.match(incompatible.body.error, /newer/);
  protocol = 2;
  revoked = true;
  const denied = await command("status");
  assert.equal(denied.code, 1);
  assert.equal(denied.body.connected, false);
  assert.equal((await command("quit")).code, 0);
  console.log(`${fromSource ? "Source checkout" : "Packaged"} smoke checks passed: unpaired status, invalid input, encrypted pairing, authenticated RPC, protocol mismatch, revoked session, quit.`);
} finally {
  for (const client of ws.clients) client.terminate();
  ws.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(temporary, { recursive: true, force: true });
}
