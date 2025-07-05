const fs = require("fs");
require('dotenv').config();

const domain =  process.env.DOMAIN;
const rawPaths = process.env.PROXY_PATHS;

if (!domain || !rawPaths) {
  console.error("Missing DOMAIN or PROXY_PATHS env variable");
  process.exit(1);
}

const entries = rawPaths.split(",").map(pair => {
  const [path, target] = pair.split("=");
  return { path, target };
});

let caddyConfig = `${domain} {\n`;

for (const { path, target } of entries) {
  caddyConfig += `  reverse_proxy ${path}* ${target}\n`;
}

caddyConfig += "}\n";

console.log(caddyConfig);
fs.writeFileSync("/etc/caddy/Caddyfile", caddyConfig);
console.log("✅ Caddyfile generated!");
