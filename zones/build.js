const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "server", "dns-config.json");
const OUT_DIR = path.join(__dirname, "dist");

// MUST match domainToInt in index.html and extension/background.js
function domainToInt(domain) {
  let h = 0;
  for (const ch of domain) {
    h = (h * 31 + ch.codePointAt(0)) >>> 0;
  }
  return h;
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const entries = Object.entries(config);
const count = entries.length;
const shards = Math.max(1, Math.ceil(count / 150));

const buckets = {};
for (const [domain, target] of entries) {
  const bucket = domainToInt(domain) % shards;
  if (!buckets[bucket]) buckets[bucket] = {};
  buckets[bucket][domain] = target;
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT_DIR, "zones"), { recursive: true });

fs.writeFileSync(
  path.join(OUT_DIR, "count.json"),
  JSON.stringify({ count, shards })
);

for (const [bucket, data] of Object.entries(buckets)) {
  fs.writeFileSync(
    path.join(OUT_DIR, "zones", `${bucket}.json`),
    JSON.stringify(data)
  );
}

console.log(`Built ${Object.keys(buckets).length} shards from ${count} entries`);
