import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = new URL("..", import.meta.url);
const texturesDir = path.join(projectRoot.pathname, "client/public/sprites/buildings/textures");

const explicitToktx = process.env.TOKTX_BIN?.trim();
const which = explicitToktx
  ? { status: 0, stdout: explicitToktx }
  : spawnSync("bash", ["-lc", "command -v toktx"], { encoding: "utf8" });

if (which.status !== 0 || !which.stdout.trim()) {
  console.error("toktx not found. Install KTX-Software first, then rerun `corepack pnpm textures:ktx2`.");
  process.exit(1);
}

const toktx = which.stdout.trim();
const pngFiles = fs.readdirSync(texturesDir).filter(file => file.endsWith(".png"));

for (const file of pngFiles) {
  const input = path.join(texturesDir, file);
  const output = input.replace(/\.png$/i, ".ktx2");
  const args = [
    "--t2",
    "--encode",
    "uastc",
    "--zcmp",
    "18",
    "--genmipmap",
    output,
    input,
  ];

  const result = spawnSync(toktx, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Generated ${pngFiles.length} KTX2 textures in ${texturesDir}`);
