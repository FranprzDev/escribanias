#!/usr/bin/env node
// Asigna un token aleatorio (8 caracteres) a cada escribanía que no tenga uno y, opcionalmente,
// escribe el mapeo privado nombre,slug,url. Los tokens existentes NUNCA se cambian, así las URLs
// ya enviadas siguen funcionando.
//   node tools/assign-tokens.mjs [--data src/data/escribanias.json] [--site https://x.netlify.app] [--csv ../urls.csv]
// El CSV de URLs es privado: no lo subas a ningún repo público.
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : d; };
const dataPath = opt("data", "src/data/escribanias.json");
const site = (opt("site", "") || "").replace(/\/$/, "");
const csvPath = opt("csv", "");

const ALPHA = "abcdefghijkmnpqrstuvwxyz23456789"; // sin 0/o/1/l para que se lea bien
const token = () => [...randomBytes(8)].map((b) => ALPHA[b % ALPHA.length]).join("");

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const used = new Set(data.map((d) => d.token).filter(Boolean));
let added = 0;
for (const d of data) {
  if (/^[a-z0-9]{8}$/.test(d.token || "")) continue;
  let t;
  do t = token(); while (used.has(t));
  used.add(t);
  d.token = t;
  added++;
}
writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");
console.log(`${added} token(s) nuevos, ${data.length} escribanías en ${dataPath}`);

if (csvPath) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["nombre", "slug", "url"], ...data.map((d) => [d.nombre, d.slug, `${site}/e/${d.slug}-${d.token}/`])];
  writeFileSync(csvPath, rows.map((r) => r.map(q).join(",")).join("\n") + "\n");
  console.log(`Mapeo privado escrito en ${csvPath}`);
}
