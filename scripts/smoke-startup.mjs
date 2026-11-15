import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { exists, installPaths, manageStartup, sourcePaths } from "./installation.mjs";

// A disposable background app writes one marker. The user's app and login registration
// are never touched, and the temporary launchd service is removed even on failure.
const execute = promisify(execFile);
const run = async (file, args) => {
  try { const result = await execute(file, args); return { code: 0, ...result }; }
  catch (error) { return { code: error.code ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? error.message }; }
};
const temporary = await mkdtemp(join(tmpdir(), "companion-startup-smoke-"));
const identity = `com.vedank.companion.smoke-${randomUUID()}`;
const paths = installPaths(temporary, "Companion Startup Test", identity);
const marker = join(temporary, "started");
const sourceRoot = join(temporary, "Source & Files");
const sourceExecutable = join(temporary, "source-runtime");
const source = sourcePaths(temporary, sourceRoot, sourceExecutable, `${identity}.source`);
const sourceMarker = join(temporary, "source-started");
try {
  await mkdir(join(paths.bundle, "Contents", "MacOS"), { recursive: true });
  await writeFile(join(paths.bundle, "Contents", "Info.plist"), `<?xml version="1.0"?><plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>${identity}</string><key>CFBundleName</key><string>Companion Startup Test</string>
<key>CFBundleExecutable</key><string>t3-companion</string><key>CFBundlePackageType</key><string>APPL</string>
<key>LSUIElement</key><true/></dict></plist>`);
  await writeFile(paths.executable, `#!/bin/sh\nprintf 'started' > '${marker.replaceAll("'", "'\\''")}'\n`);
  await chmod(paths.executable, 0o755);
  assert.equal((await manageStartup("enable", paths, process.getuid(), run)).enabled, true);
  const deadline = Date.now() + 10_000;
  while (!(await exists(marker)) && Date.now() < deadline) await delay(100);
  assert.equal(await readFile(marker, "utf8"), "started");
  assert.equal((await manageStartup("status", paths, process.getuid(), run)).loaded, true);
  await manageStartup("enable", paths, process.getuid(), run);
  await manageStartup("disable", paths, process.getuid(), run);
  assert.equal((await manageStartup("status", paths, process.getuid(), run)).registered, false);
  assert.equal((await manageStartup("status", paths, process.getuid(), run)).loaded, false);
  await mkdir(sourceRoot);
  await writeFile(sourceExecutable, `#!/bin/sh\nprintf '%s\\n%s' "$PWD" "$1" > '${sourceMarker.replaceAll("'", "'\\''")}'\n`);
  await chmod(sourceExecutable, 0o755);
  await manageStartup("enable", source, process.getuid(), run);
  const sourceDeadline = Date.now() + 10_000;
  while (!(await exists(sourceMarker)) && Date.now() < sourceDeadline) await delay(100);
  assert.equal(await readFile(sourceMarker, "utf8"), `${await realpath(sourceRoot)}\n${sourceRoot}`);
  assert.equal((await manageStartup("status", source, process.getuid(), run)).targetMatches, true);
  await manageStartup("disable", source, process.getuid(), run);
  console.log("Native startup smoke checks passed for app bundle and source checkout: launch, working directory, arguments, status, repeated enable, disable, removal.");
} finally {
  await manageStartup("disable", source, process.getuid(), run);
  await manageStartup("disable", paths, process.getuid(), run);
  await rm(temporary, { recursive: true, force: true });
}
