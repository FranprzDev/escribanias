#!/usr/bin/env node
// Verifica sobre dist/ que ninguna página ni archivo JS/CSS revele otras escribanías:
// cada /e/<slug>-<token>/ contiene sólo su escribanía, la raíz y el 404 no contienen ninguna,
// no hay páginas /<slug>/ adivinables, y robots/noindex están en su lugar.
//   node tools/check-isolation.mjs [--data src/data/escribanias.json] [--dist dist]
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : d; };
const data = JSON.parse(readFileSync(opt("data", "src/data/escribanias.json"), "utf8"));
const dist = opt("dist", "dist");

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk(dist);
const fails = [];
const fail = (m) => fails.push(m);
const norm = (s) => s.normalize("NFC");
// Marcadores únicos de cada escribanía: slug, token, nombre y dirección (sólo los que no se repiten).
const count = (v) => data.filter((d) => [d.nombre, d.direccion].includes(v)).length;
const marks = (d) => [d.slug, d.token, d.nombre, d.direccion].filter((v) => v && v.length > 5 && (v === d.slug || v === d.token || count(v) === 1)).map(norm);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
const contains = (txt, m) => txt.includes(m) || txt.includes(esc(m)) || txt.includes(JSON.stringify(m).slice(1, -1));

const pageOf = new Map();
for (const f of files) {
  const rel = relative(dist, f).replace(/\\/g, "/");
  if (!/\.(html|js|css|json|txt|xml)$/.test(rel)) continue;
  const raw = norm(readFileSync(f, "utf8"));
  let txt = raw;
  const m = rel.match(/^e\/([^/]+)\/index\.html$/);
  const own = m ? data.find((d) => `${d.slug}-${d.token}` === m[1]) : null;
  // Quitamos las apariciones propias (un slug ajeno puede ser prefijo del propio: "x" y "x-34").
  if (own) for (const k of [`${own.slug}-${own.token}`, own.slug, norm(own.nombre), norm(own.direccion)].filter((k) => k && k.length > 3)) txt = txt.split(k).join(" ").split(esc(k)).join(" ");
  if (m && !own) fail(`${rel}: página sin escribanía conocida`);
  if (own) pageOf.set(own.slug, rel);
  for (const d of data) {
    if (d === own) continue;
    for (const k of marks(d)) if (contains(txt, k)) { fail(`${rel} contiene datos de otra escribanía (${d.slug}: "${k}")`); break; }
  }
  if (rel.endsWith(".html") && !/name="robots" content="noindex/.test(raw)) fail(`${rel}: falta <meta name="robots" content="noindex">`);
  if (rel.endsWith(".html") && /id="demo-data"|o-select/.test(raw)) fail(`${rel}: quedó el JSON compartido o el selector de escribanías`);
}
for (const d of data) {
  if (!/^[a-z0-9]{8}$/.test(d.token || "")) fail(`${d.slug}: token ausente o inválido`);
  if (!pageOf.has(d.slug)) fail(`${d.slug}: no se generó /e/${d.slug}-${d.token}/`);
  if (existsSync(join(dist, d.slug))) fail(`${d.slug}: existe la ruta adivinable /${d.slug}/`);
}
const robots = existsSync(join(dist, "robots.txt")) ? readFileSync(join(dist, "robots.txt"), "utf8") : "";
if (!/Disallow:\s*\/\s*$/m.test(robots)) fail("robots.txt no tiene Disallow: /");
if (files.some((f) => /sitemap/i.test(f))) fail("hay un sitemap en dist/");
if (!existsSync(join(dist, "index.html"))) fail("falta index.html en la raíz");

console.log(fails.length ? fails.slice(0, 40).join("\n") + `\n${fails.length} PROBLEMAS` : `AISLAMIENTO OK: ${data.length} páginas privadas, ${files.length} archivos revisados`);
process.exit(fails.length ? 1 : 0);
