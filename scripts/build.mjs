import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const header = `/// <reference types="./types/index.d.ts" />
// deno-lint-ignore-file

`;

export async function build(root, { check = false } = {}) {
  const manifestPath = join(root, "upstream/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const staging = await mkdtemp(join(tmpdir(), "sheetjs-build-"));

  try {
    for (const [filename, { sha256 }] of Object.entries(manifest.files)) {
      const source = join(root, "upstream", filename);
      const destination = join(staging, filename);

      const bytes = await readFile(source);
      const hash = createHash("sha256").update(bytes).digest("hex");

      if (hash !== sha256) {
        throw new Error(`Upstream hash mismatch: ${filename}`);
      }

      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }

    for (const filename of manifest.patches) {
      const patchPath = join(root, "patches", filename);

      execFileSync("git", ["apply", "--check", patchPath], { cwd: staging, stdio: "pipe" });
      execFileSync("git", ["apply", patchPath], { cwd: staging, stdio: "pipe" });
    }

    const module = join(staging, "xlsx.mjs");
    const source = await readFile(module, "utf8");

    if (!source.includes(`XLSX.version = '${manifest.version}';`)) {
      throw new Error("Upstream module and manifest versions differ");
    }

    await writeFile(module, header + source);

    for (const filename of Object.keys(manifest.files)) {
      const bytes = await readFile(join(staging, filename));
      const destination = join(root, filename);

      if (check) {
        let current = null;

        try {
          current = await readFile(destination);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }

        if (!current?.equals(bytes)) {
          throw new Error(`Generated file differs: ${filename}. Run npm run build.`);
        }

        continue;
      }

      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.some((arg) => arg !== "--check")) {
    throw new Error("Usage: node scripts/build.mjs [--check]");
  }

  const root = fileURLToPath(new URL("../", import.meta.url));
  const check = args.includes("--check");

  await build(root, { check });
  console.info(check ? "Generated files verified." : "Generated files written.");
}
