import { mkdtemp, mkdir, readFile, readdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSourceBuild, exists, installBundle, installPaths, manageStartup, sourcePaths, startupPlist } from "./installation.mjs";

const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
async function fixture() {
  const home = await mkdtemp(join(tmpdir(), "companion-install-"));
  directories.push(home);
  const paths = installPaths(home, "T3 Companion", "test.companion", join(home, "Apps & Tools"));
  const source = join(home, "build.app");
  await mkdir(source);
  await writeFile(join(source, "version"), "new");
  return { home, source, paths };
}

describe("bundle installation", () => {
  it("keeps framework symlinks relative so the installed bundle survives removing the build", async () => {
    const { source, paths } = await fixture();
    await mkdir(join(source, "Framework", "Versions", "A"), { recursive: true });
    await writeFile(join(source, "Framework", "Versions", "A", "resource"), "framework data");
    await symlink("A", join(source, "Framework", "Versions", "Current"));
    await symlink("Versions/Current/resource", join(source, "Framework", "resource"));
    await installBundle(source, paths.bundle);
    await rm(source, { recursive: true });
    expect(await readlink(join(paths.bundle, "Framework", "Versions", "Current"))).toBe("A");
    expect(await readFile(join(paths.bundle, "Framework", "resource"), "utf8")).toBe("framework data");
  });
  it("installs and updates a path with spaces without leaving staging directories", async () => {
    const { source, paths } = await fixture();
    await installBundle(source, paths.bundle);
    expect(await readFile(join(paths.bundle, "version"), "utf8")).toBe("new");
    await writeFile(join(source, "version"), "updated");
    await installBundle(source, paths.bundle);
    expect(await readFile(join(paths.bundle, "version"), "utf8")).toBe("updated");
    expect(await readdir(join(paths.bundle, ".."))).toEqual(["T3 Companion.app"]);
  });

  it("preserves the installed version if staging fails halfway through a copy", async () => {
    const { source, paths } = await fixture();
    await installBundle(source, paths.bundle);
    await expect(installBundle(source, paths.bundle, async (_source, stage) => {
      await mkdir(stage);
      await writeFile(join(stage, "partial"), "incomplete");
      throw new Error("disk full");
    })).rejects.toThrow("disk full");
    expect(await readFile(join(paths.bundle, "version"), "utf8")).toBe("new");
    expect(await readdir(join(paths.bundle, ".."))).toEqual(["T3 Companion.app"]);
  });
});

describe("startup registration", () => {
  it("runs the checkout with an absolute Electron executable and working directory", async () => {
    const { home } = await fixture();
    const root = join(home, "Source & Files");
    const executable = join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
    const paths = sourcePaths(home, root, executable, "test.companion");
    const plist = startupPlist(paths);
    expect(plist).toContain(`<key>WorkingDirectory</key><string>${home}/Source &amp; Files</string>`);
    expect(plist).toContain("node_modules/electron/dist/Electron.app/Contents/MacOS/Electron</string>");
    expect(plist).not.toContain("/usr/bin/open");
    expect(paths.launchArguments).toEqual([executable, root]);
    await expect(assertSourceBuild(paths)).rejects.toThrow("pnpm build");
    for (const file of ["out/main/index.js", "out/preload/index.cjs", "out/renderer/index.html", "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"]) {
      await mkdir(join(root, file, ".."), { recursive: true });
      await writeFile(join(root, file), "fixture");
    }
    await expect(assertSourceBuild(paths)).resolves.toBeUndefined();
  });

  it("does not report the source target enabled when startup points at an installed bundle", async () => {
    const { home, paths } = await fixture();
    await mkdir(join(paths.startupFile, ".."), { recursive: true });
    await writeFile(paths.startupFile, startupPlist(paths));
    const source = sourcePaths(home, join(home, "checkout"), join(home, "Electron"), "test.companion");
    expect(await manageStartup("status", source, 501, async () => ({ code: 0 }))).toEqual({
      enabled: false, registered: true, loaded: true, targetMatches: false,
    });
    expect(await readFile(paths.startupFile, "utf8")).toBe(startupPlist(paths));
  });

  it("preserves startup owned by another setup when disabling or uninstalling", async () => {
    const { home, paths } = await fixture();
    const source = sourcePaths(home, join(home, "checkout"), join(home, "Electron"), "test.companion");
    const otherSource = sourcePaths(home, join(home, "other checkout"), join(home, "Electron"), "test.companion");
    await mkdir(join(paths.startupFile, ".."), { recursive: true });
    for (const [registered, requested] of [[source, paths], [paths, source], [source, otherSource]]) {
      const plist = startupPlist(registered);
      await writeFile(paths.startupFile, plist);
      const run = vi.fn(async () => ({ code: 0, stdout: "", stderr: "" }));
      expect(await manageStartup("disable", requested, 501, run)).toMatchObject({
        enabled: false, registered: true, loaded: true, targetMatches: false,
      });
      expect(await readFile(paths.startupFile, "utf8")).toBe(plist);
      expect(run.mock.calls.map((call) => call[1][0])).toEqual(["print"]);
    }
  });

  it("escapes the plist and sends paths as individual arguments, with repeatable enable and disable", async () => {
    const { paths } = await fixture();
    await mkdir(join(paths.executable, ".."), { recursive: true });
    await writeFile(paths.executable, "binary");
    let loaded = false;
    const run = vi.fn(async (_file, args) => {
      if (args[0] === "print") return { code: loaded ? 0 : 3, stdout: "", stderr: "" };
      loaded = args[0] === "bootstrap";
      return { code: 0, stdout: "", stderr: "" };
    });
    expect(startupPlist(paths)).toContain("Apps &amp; Tools");
    expect(await manageStartup("enable", paths, 501, run)).toMatchObject({ enabled: true });
    expect(await readFile(paths.startupFile, "utf8")).toContain("<string>/usr/bin/open</string>");
    await manageStartup("enable", paths, 501, run);
    expect(run.mock.calls.filter((call) => call[1][0] === "bootstrap")).toHaveLength(1);
    expect(run).toHaveBeenCalledWith("/bin/launchctl", ["bootstrap", "gui/501", paths.startupFile]);
    expect(await manageStartup("status", paths, 501, run)).toMatchObject({ enabled: true });
    await manageStartup("disable", paths, 501, run);
    await manageStartup("disable", paths, 501, run);
    expect(await exists(paths.startupFile)).toBe(false);
    expect(loaded).toBe(false);
  });

  it("removes a failed new registration and reports launchctl errors", async () => {
    const { paths } = await fixture();
    await mkdir(join(paths.executable, ".."), { recursive: true });
    await writeFile(paths.executable, "binary");
    const run = vi.fn(async () => ({ code: 3, stdout: "", stderr: "no GUI session" }));
    await expect(manageStartup("enable", paths, 501, run)).rejects.toThrow("no GUI session");
    expect(await exists(paths.startupFile)).toBe(false);
  });

  it("refuses to register a missing app", async () => {
    const { paths } = await fixture();
    await expect(manageStartup("enable", paths, 501, async () => ({ code: 3 }))).rejects.toThrow("Install");
  });
});
