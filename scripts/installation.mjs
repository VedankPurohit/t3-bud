import { cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const exists = (path) => stat(path).then(() => true, (error) => {
  if (error.code === "ENOENT") return false;
  throw error;
});

export function installPaths(home, productName, appId, appDirectory = join(home, "Applications")) {
  const bundle = join(resolve(appDirectory), `${productName}.app`);
  return {
    bundle,
    executable: join(bundle, "Contents", "MacOS", "t3-companion"),
    label: `${appId}.startup`,
    startupFile: join(home, "Library", "LaunchAgents", `${appId}.startup.plist`),
  };
}

export function sourcePaths(home, sourceRoot, executable, appId) {
  const root = resolve(sourceRoot);
  return {
    executable,
    sourceRoot: root,
    workingDirectory: root,
    launchArguments: [executable, root],
    label: `${appId}.startup`,
    startupFile: join(home, "Library", "LaunchAgents", `${appId}.startup.plist`),
  };
}

export async function assertSourceBuild(paths) {
  for (const file of ["out/main/index.js", "out/preload/index.cjs", "out/renderer/index.html"]) {
    if (!(await exists(join(paths.sourceRoot, file))))
      throw new Error("The checkout has no complete build. Run pnpm install --frozen-lockfile and pnpm build first.");
  }
  if (!(await exists(paths.executable))) throw new Error("Electron is missing. Run pnpm install --frozen-lockfile first.");
}

/** Stage the whole bundle before touching the existing installation. */
export async function installBundle(source, destination, copy = cp) {
  await mkdir(dirname(destination), { recursive: true });
  const stage = `${destination}.install-${randomUUID()}`;
  const backup = `${stage}.previous`;
  let backedUp = false;
  try {
    await copy(source, stage, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true, errorOnExist: true, force: false });
    if (await exists(destination)) {
      await rename(destination, backup);
      backedUp = true;
    }
    try {
      await rename(stage, destination);
    } catch (error) {
      if (backedUp) await rename(backup, destination);
      throw error;
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  if (backedUp) await rm(backup, { recursive: true, force: true });
}

const xml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

export function startupPlist(paths) {
  const arguments_ = paths.launchArguments ?? ["/usr/bin/open", "-a", paths.bundle];
  const workingDirectory = paths.workingDirectory
    ? `<key>WorkingDirectory</key><string>${xml(paths.workingDirectory)}</string>\n` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(paths.label)}</string>
<key>ProgramArguments</key><array>${arguments_.map((argument) => `<string>${xml(argument)}</string>`).join("")}</array>
${workingDirectory}<key>RunAtLoad</key><true/>
<key>LimitLoadToSessionType</key><string>Aqua</string>
</dict></plist>
`;
}

/** `run` returns {code, stdout, stderr}; argv are passed directly to launchctl. */
export async function manageStartup(action, paths, uid, run) {
  if (!["enable", "disable", "status"].includes(action)) throw new Error("Use startup enable, disable, or status.");
  const service = `gui/${uid}/${paths.label}`;
  const previous = await exists(paths.startupFile) ? await readFile(paths.startupFile, "utf8") : null;
  const loaded = (await run("/bin/launchctl", ["print", service])).code === 0;
  const invoke = async (args) => {
    const result = await run("/bin/launchctl", args);
    if (result.code !== 0) throw new Error(`launchctl ${args[0]} failed. ${result.stderr.trim()}`);
  };
  if (action === "status") return {
    enabled: previous === startupPlist(paths) && loaded,
    registered: previous !== null,
    loaded,
    targetMatches: previous === startupPlist(paths),
  };
  if (action === "disable") {
    if ((previous !== null || loaded) && previous !== startupPlist(paths)) return {
      enabled: false, registered: previous !== null, loaded, targetMatches: false, preserved: true,
    };
    if (loaded) await invoke(["bootout", service]);
    await rm(paths.startupFile, { force: true });
    return { enabled: false, registered: false, loaded: false };
  }
  if (!(await exists(paths.executable))) throw new Error("Install the app before enabling startup.");
  const next = startupPlist(paths);
  if (loaded && previous === next) return { enabled: true, registered: true, loaded: true };
  await mkdir(dirname(paths.startupFile), { recursive: true });
  if (loaded) await invoke(["bootout", service]);
  const temporary = `${paths.startupFile}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, next, { mode: 0o600 });
    await rename(temporary, paths.startupFile);
    await invoke(["bootstrap", `gui/${uid}`, paths.startupFile]);
  } catch (error) {
    if (previous === null) await rm(paths.startupFile, { force: true });
    else {
      await writeFile(paths.startupFile, previous, { mode: 0o600 });
      if (loaded) await run("/bin/launchctl", ["bootstrap", `gui/${uid}`, paths.startupFile]);
    }
    throw error;
  } finally {
    await rm(temporary, { force: true });
  }
  return { enabled: true, registered: true, loaded: true };
}
