const fs = await import("node:fs");
const path = await import("node:path");
const root = process.cwd();
const banned = [new RegExp(["619", "97"].join(""), "g"), new RegExp(["studio", "-dev"].join(""), "gi")];
const allowedDirs = new Set(["node_modules", ".next", ".git"]);
let bad = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (allowedDirs.has(name)) continue;
    const p = path.join(dir, name);
    const relative = path.relative(root, p).split(path.sep).join("/");
    if (relative === "scripts/network-check.mjs") continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs|json|py|example)$/.test(name) || name === ".env.example") {
      const text = fs.readFileSync(p, "utf8");
      for (const re of banned) if (re.test(text)) bad.push(path.relative(root, p));
    }
  }
}
walk(root);
const constants = fs.readFileSync(path.join(root, "lib/constants.ts"), "utf8");
if (!constants.includes("61999") || !constants.includes("https://studio.genlayer.com/api")) bad.push("lib/constants.ts missing required Studionet values");
if (bad.length) {
  console.error("Network contamination/configuration check failed:", [...new Set(bad)]);
  process.exit(1);
}
console.log("Network check passed: Studionet 61999 only.");
