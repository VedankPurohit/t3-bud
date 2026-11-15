import { spawn } from "node:child_process";
import { readFile, realpath, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertSourceBuild, exists, installBundle, installPaths, manageStartup, sourcePaths } from "./installation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const metadata = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const help = `Usage: pnpm companion <command> [--source | --app-dir <directory>]

Use --source to run from this checkout after pnpm install and pnpm build.
Keep the checkout in place for source startup. Without --source, commands target the installed .app.

install [--no-launch]  Optionally check, package, and copy a .app into ~/Applications.
launch                 Open the app, or launch the built checkout with --source.
pair                   Read a pairing link or t3 pair output from stdin. Never pass it as an argument.
status                 Print JSON. Exit 0 when paired and connected, 1 on failure, 2 when unpaired.
startup enable|disable|status
                       Manage this user's login LaunchAgent. Enabling also opens the app.
quit                   Quit the running companion.
uninstall              Remove startup registration and the installed .app. Keep pairing and drafts.
`;

function execute(file, args, { input, forwardInput = false, inherit = false, timeout = 60_000 } = {}) {
  return new Promise((resolveResult, reject) => {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.ELECTRON_RENDERER_URL;
    const child = spawn(file, args, { cwd: root, env, stdio: inherit ? "inherit" : ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`${file} did not finish in time.`)); }, timeout);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolveResult({ code: code ?? 1, stdout, stderr }); });
    child.stdin?.on("error", () => {});
    if (forwardInput) process.stdin.pipe(child.stdin);
    else child.stdin?.end(input);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help")) { console.log(help); return; }
  if (process.platform !== "darwin") throw new Error("Source installation currently supports macOS only.");
  const fromSource = args.includes("--source");
  if (fromSource) args.splice(args.indexOf("--source"), 1);
  let appDirectory;
  const directoryIndex = args.indexOf("--app-dir");
  if (directoryIndex >= 0) {
    appDirectory = args[directoryIndex + 1];
    if (!appDirectory || appDirectory.startsWith("--")) throw new Error("--app-dir needs a directory.");
    args.splice(directoryIndex, 2);
  }
  const command = args.shift();
  if (fromSource && appDirectory) throw new Error("Choose --source or --app-dir, not both.");
  if (fromSource && ["install", "uninstall"].includes(command))
    throw new Error("For a source checkout, use pnpm install, pnpm build, and companion launch --source. Remove source startup before deleting the checkout.");
  const noLaunch = args.includes("--no-launch");
  if (command !== "install" && noLaunch) throw new Error("--no-launch applies to install only.");
  const startupAction = command === "startup" ? args.shift() : null;
  if (args.some((argument) => argument !== "--no-launch")) throw new Error("Unexpected argument. Use --help.");
  let paths;
  if (fromSource) {
    let relativeExecutable;
    try { relativeExecutable = (await readFile(join(root, "node_modules", "electron", "path.txt"), "utf8")).trim(); }
    catch { throw new Error("Electron is missing. Run pnpm install --frozen-lockfile first."); }
    paths = sourcePaths(homedir(), root, join(root, "node_modules", "electron", "dist", relativeExecutable), metadata.build.appId);
  } else paths = installPaths(homedir(), metadata.productName, metadata.build.appId, appDirectory);
  const output = (body) => console.log(JSON.stringify(body));
  const startup = (action) => manageStartup(action, paths, process.getuid(), execute);
  const appCommand = async (action, input) => {
    if (fromSource) await assertSourceBuild(paths);
    else {
      if (!(await exists(paths.executable))) throw new Error("App not installed. Use --source for a built checkout or run pnpm companion install.");
      await ownBundle();
    }
    const commandArguments = [...(fromSource ? [root] : []), `--companion-command=${action}`];
    const result = await execute(paths.executable, commandArguments, { input, forwardInput: action === "pair" });
    // Only the maintenance command's JSON reaches callers, never Electron's diagnostic logs.
    let body;
    try { body = JSON.parse(result.stdout.trim()); }
    catch { throw new Error("The app did not return a status. Check the build and try again."); }
    return { code: result.code, body };
  };
  const ownBundle = async () => {
    if (!(await exists(paths.bundle))) return;
    const result = await execute("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", join(paths.bundle, "Contents", "Info.plist")]);
    if (result.code !== 0 || result.stdout.trim() !== metadata.build.appId)
      throw new Error(`The existing bundle at ${paths.bundle} belongs to another application.`);
  };
  const launch = async () => {
    if (fromSource) {
      await assertSourceBuild(paths);
      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;
      delete env.ELECTRON_RENDERER_URL;
      await new Promise((resolveLaunch, reject) => {
        const child = spawn(paths.executable, [root], { cwd: root, env, detached: true, stdio: "ignore" });
        child.once("error", reject);
        child.once("spawn", () => { child.unref(); resolveLaunch(); });
      });
      return;
    }
    const result = await execute("/usr/bin/open", ["-a", paths.bundle]);
    if (result.code !== 0) throw new Error("Could not open the installed application.");
  };
  if (command === "install") {
    if (!["arm64", "x64"].includes(process.arch)) throw new Error("Unsupported Mac architecture.");
    for (const task of ["typecheck", "test", "dist"]) {
      const result = await execute("pnpm", [task], { inherit: true, timeout: 600_000 });
      if (result.code !== 0) throw new Error(`${task} failed. The installed app was not replaced.`);
    }
    const source = join(root, "dist", process.arch === "arm64" ? "mac-arm64" : "mac", `${metadata.build.executableName}.app`);
    if (await exists(paths.bundle)) {
      await ownBundle();
      const result = await appCommand("quit");
      if (result.code !== 0) throw new Error("Could not quit the existing app. Close it and retry.");
    }
    await installBundle(source, paths.bundle);
    if (!noLaunch) await launch();
    output({ installed: true, bundle: paths.bundle, version: metadata.version });
  } else if (command === "launch") {
    if (!fromSource) await ownBundle();
    await launch();
    output({ launched: true });
  } else if (command === "startup") {
    if (!startupAction) throw new Error("Use startup enable, disable, or status.");
    if (startupAction === "enable") {
      if (fromSource) await assertSourceBuild(paths);
      else await ownBundle();
    }
    output(await startup(startupAction));
  } else if (command === "status") {
    const result = await appCommand("status");
    output({ ...result.body, mode: fromSource ? "source" : "installed", bundle: paths.bundle,
      sourceDirectory: paths.sourceRoot, startup: await startup("status") });
    process.exitCode = result.code;
  } else if (command === "pair") {
    if (process.stdin.isTTY) throw new Error("Pipe a pairing link or t3 pair output into this command.");
    const result = await appCommand("pair");
    output(result.body);
    process.exitCode = result.code;
    if (result.code === 0) await launch();
  } else if (command === "quit") {
    const result = await appCommand("quit");
    output(result.body);
    process.exitCode = result.code;
  } else if (command === "uninstall") {
    await ownBundle();
    await startup("disable");
    if (await exists(paths.bundle)) {
      const result = await appCommand("quit");
      if (result.code !== 0) throw new Error("Could not quit the app. Close it and retry.");
      // Resolve the parent, preserving the bundle itself so a symlink cannot delete its target.
      const parent = await realpath(dirname(paths.bundle));
      await rm(join(parent, `${metadata.productName}.app`), { recursive: true, force: true });
    }
    output({ uninstalled: true, dataPreserved: true });
  } else throw new Error("Unknown command. Use --help.");
}

main().catch((error) => { console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
