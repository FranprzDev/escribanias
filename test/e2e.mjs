// Prueba E2E en un navegador real (Playwright + Chromium) sobre el sitio construido.
// Uso: npm run build && npx playwright install chromium && npm run test:e2e
// Levanta un servidor estático propio sobre dist/ y guarda capturas en e2e-output/.
import { createServer } from "node:http";
import { mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const out = fileURLToPath(new URL("../e2e-output/", import.meta.url));
if (!existsSync(root)) {
  console.error("No existe dist/. Corré `npm run build` primero.");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const server = createServer((req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let f = join(root, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!existsSync(f)) return res.writeHead(404).end("404");
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }).end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const results = [];
const check = (name, pass, extra = "") => {
  results.push({ name, pass: !!pass });
  console.log(pass ? "PASS" : "FAIL", name, extra);
};

const data = JSON.parse(readFileSync(new URL("../src/data/escribanias.json", import.meta.url), "utf8"));
const pageUrl = (o) => `${base}/e/${o.slug}-${o.token}/`;
// CHROMIUM_PATH permite usar un Chromium del sistema (p. ej. /usr/bin/chromium en ARM).
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  // ---------- escritorio ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${base}/?selftest`);
  const st = await page.evaluate(() => window.selfTest());
  check(`selfTest() en el navegador (${st.length} pruebas)`, st.every((r) => r.pass), JSON.stringify(st.filter((r) => !r.pass)));

  await page.goto(`${base}/`);
  check("Raíz: demo neutra", (await page.textContent("#o-nombre")) === "Escribanía Demo");
  check("Raíz: sin selector ni lista de escribanías", (await page.locator("#o-select").count()) === 0);
  await page.goto(pageUrl(data[0]));
  check("Página privada /e/<slug>-<token>/ personaliza el nombre", (await page.textContent("#o-nombre")) === data[0].nombre);
  await page.screenshot({ path: out + "desktop-inicio.png", fullPage: true });

  // Reserva completa
  await page.click('[data-tramite="Firma de escritura"]');
  check("Requisitos del trámite visibles", (await page.textContent("#reqs")).includes("Título anterior"));
  await page.click("#next");
  await page.click("#days button >> nth=0");
  await page.click("#slots button:not([disabled]) >> nth=0");
  await page.click("#next");
  await page.click("#next"); // sin datos: debe mostrar errores
  check("Validación muestra errores", (await page.locator(".err:not(:empty)").count()) === 4);
  await page.fill('#form [name="nombre"]', "Ana Pérez");
  await page.fill('#form [name="dni"]', "30.123.456");
  await page.fill('#form [name="wa"]', "381 5123456");
  await page.fill('#form [name="email"]', "ana@example.com");
  await page.click("#next");
  check("Resumen con los datos", (await page.textContent("#summary")).includes("Ana Pérez"));
  await page.click("#next");
  const code = (await page.textContent("#code")).trim();
  check("Turno confirmado con código", /^ESC-\d{4}$/.test(code), code);
  await page.screenshot({ path: out + "desktop-confirmado.png" });
  check("Aparece en Mis turnos", (await page.textContent("#mis-list")).includes(code));
  await page.fill('#lookup [name="code"]', code.slice(4));
  await page.click('#lookup button[type="submit"]');
  check("Consulta de estado por código", (await page.textContent("#lookup-out")).includes("Recibido"));

  // Chat de WhatsApp
  await page.click("#wa-fab");
  await page.click('#wa-log .wa__opts button:has-text("Sacar turno")');
  await page.click('#wa-log .wa__opts button:has-text("Poder")');
  await page.click("#wa-log .wa__opts >> nth=-1 >> button >> nth=0");
  await page.click("#wa-log .wa__opts >> nth=-1 >> button >> nth=0");
  await page.fill("#wa-input", "Juan Gómez");
  await page.press("#wa-input", "Enter");
  check("Bot de WhatsApp confirma el turno", (await page.textContent("#wa-log")).includes("¡Listo, Juan!"));
  await page.screenshot({ path: out + "desktop-chat.png" });
  await page.click("#wa-close");

  // Panel del escribano
  await page.click("#tab-p");
  await page.click("#p-login");
  check("Panel: login con titular", (await page.textContent("#p-sub")).includes(data[0].titular));
  const tram = await page.textContent("#t-rows");
  check("Panel: turnos de la web y del chat en Trámites", tram.includes(code) && tram.includes("Juan Gómez"));
  await page.selectOption(`#t-rows select[data-code="${code}"]`, "Listo para firmar");
  await page.selectOption("#blk-desde", "8:00");
  await page.selectOption("#blk-hasta", "9:00");
  await page.click('#blk-form button[type="submit"]');
  check("Panel: bloqueo de horario", (await page.textContent("#blk-msg")).startsWith("Listo"));
  const before = await page.textContent("#p-day");
  await page.click("#p-next");
  check("Panel: navegar días", (await page.textContent("#p-day")) !== before);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#p-csv")]);
  check("Panel: exporta CSV", dl.suggestedFilename().startsWith(`agenda-${data[0].slug}-`), dl.suggestedFilename());
  await page.screenshot({ path: out + "desktop-panel.png", fullPage: true });
  await page.click("#tab-c");
  await page.fill('#lookup [name="code"]', code);
  await page.click('#lookup button[type="submit"]');
  check("Cliente ve el estado que cambió el escribano", (await page.textContent("#lookup-out")).includes("Listo para firmar"));

  // Ruta estática
  await page.goto(pageUrl(data[1]) + "#" + data[0].slug);
  check("Otra página privada; el #hash no cambia la escribanía", (await page.textContent("#o-nombre")) === data[1].nombre);
  const r404 = await page.goto(`${base}/${data[1].slug}/`);
  check("La ruta adivinable /<slug>/ ya no existe", r404.status() === 404);
  check("Sin errores de JavaScript", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // ---------- celular ----------
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(pageUrl(data[1]));
  const overflow = () => mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("Celular: sin scroll horizontal (cliente)", (await overflow()) <= 0, String(await overflow()));
  await mp.screenshot({ path: out + "mobile-inicio.png", fullPage: true });
  await mp.click('[data-tramite="Poder"]');
  await mp.click("#next");
  await mp.click("#days button >> nth=0");
  await mp.screenshot({ path: out + "mobile-horarios.png" });
  await mp.click("#tab-p");
  await mp.click("#p-login");
  check("Celular: sin scroll horizontal (panel)", (await overflow()) <= 0, String(await overflow()));
  await mp.screenshot({ path: out + "mobile-panel.png", fullPage: true });
  await mp.click("#wa-fab");
  await mp.screenshot({ path: out + "mobile-chat.png" });
  await m.close();
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `${failed.length} FALLARON` : `TODO OK (${results.length} chequeos)`);
process.exit(failed.length ? 1 : 0);
