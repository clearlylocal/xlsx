import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./build.mjs";

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = join(root, "upstream/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

let version = process.argv[2];

if (!version) {
  const bytes = await download("https://cdn.sheetjs.com/xlsx-latest/package/package.json");
  version = JSON.parse(bytes.toString("utf8")).version;
}

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
if (!SEMVER_RE.test(version)) {
  throw new Error(`Invalid release version: ${version}`);
}

const currentVersion = manifest.version.split(".").map(Number);
const nextVersion = version.split(".").map(Number);
const changedPart = nextVersion.findIndex((part, i) => part !== currentVersion[i]);

if (changedPart === -1 || nextVersion[changedPart] < currentVersion[changedPart]) {
  console.info(`Already at ${manifest.version}; no newer release selected.`);
  process.exit(0);
}

const staging = await mkdtemp(join(tmpdir(), "sheetjs-update-"));

try {
  for (const directory of ["patches", "scripts", "tests"]) {
    await cp(join(root, directory), join(staging, directory), { recursive: true });
  }

  const nextManifest = { ...manifest, version, files: {} };

  for (const filename of Object.keys(manifest.files)) {
    const url = `https://cdn.sheetjs.com/xlsx-${version}/package/${filename}`;
    const bytes = await download(url);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const destination = join(staging, "upstream", filename);

    nextManifest.files[filename] = { url, sha256 };

    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }

  const nextManifestPath = join(staging, "upstream/manifest.json");
  await writeFile(nextManifestPath, JSON.stringify(nextManifest, null, 2) + "\n");
  await build(staging);

  const testDirectory = join(staging, "tests");
  const filenames = await readdir(testDirectory);
  const testPaths = filenames
    .filter((filename) => filename.endsWith(".test.mjs"))
    .sort()
    .map((filename) => join(testDirectory, filename));

  execFileSync(process.execPath, ["--test", ...testPaths], { stdio: "inherit" });

  // Replace working files only after the candidate builds and passes its tests.
  await cp(join(staging, "upstream"), join(root, "upstream"), { recursive: true });

  for (const filename of Object.keys(nextManifest.files)) {
    await cp(join(staging, filename), join(root, filename));
  }

  const packagePath = join(root, "package.json");
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  pkg.version = version;

  await writeFile(packagePath, JSON.stringify(pkg, null, "\t") + "\n");
  console.info(`Updated to SheetJS ${version}.`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
