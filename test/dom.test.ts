// Prueba de punta a punta sobre el DOM real que genera Astro: reserva completa,
// requisitos, chat de WhatsApp, panel (agenda, bloqueos, trámites, CSV) y #slug.
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { Window } from "happy-dom";
import { beforeEach, describe, expect, it } from "vitest";
import Index from "../src/pages/index.astro";
import SlugPage from "../src/pages/[slug].astro";
import data from "../src/data/escribanias.json";
import { initApp } from "../src/scripts/app";

const NOW = new Date(2026, 9, 14, 10); // miércoles

// Astro renderiza en Node (Container API) y el DOM lo da happy-dom.
let window: Window;
let document: Document;
let Event: typeof globalThis.Event;
async function mount(html: string, hash = "") {
  window = new Window({ url: "http://localhost/" + hash });
  document = window.document as unknown as Document;
  Event = window.Event as unknown as typeof globalThis.Event;
  // Cargamos el HTML renderizado sin ejecutar el <script type="module">.
  document.write(html.replace(/<script type="module"[\s\S]*?<\/script>/g, ""));
  return initApp(document, window as unknown as globalThis.Window, NOW);
}
const $ = (id: string) => document.getElementById(id)!;
const click = (el: Element | null) => (el as HTMLElement).click();
const fill = (name: string, v: string) => {
  const i = document.querySelector<HTMLInputElement>(`#form [name="${name}"]`)!;
  i.value = v;
  i.dispatchEvent(new Event("input", { bubbles: true }));
};

let indexHTML = "";
let slugHTML = "";
beforeEach(async () => {
  const c = await AstroContainer.create();
  indexHTML ||= await c.renderToString(Index);
  slugHTML ||= await c.renderToString(SlugPage, { params: { slug: data[1].slug }, props: { office: data[1] } });
});

describe("turnero en el DOM", () => {
  it("reserva un turno de punta a punta", async () => {
    const app = await mount(indexHTML);
    expect($("next")).toHaveProperty("disabled", true);
    click(document.querySelector('[data-tramite="Poder"]'));
    expect($("reqs").hidden).toBe(false);
    expect($("reqs").textContent).toContain("Datos del apoderado");
    click($("next"));
    expect($("s2").hidden).toBe(false);
    click($("days").querySelector("button"));
    const free = $("slots").querySelector<HTMLButtonElement>("button:not([disabled])")!;
    const time = free.dataset.time!;
    click(free);
    expect($("next")).toHaveProperty("disabled", false);
    click($("next"));
    // validación
    click($("next"));
    expect($("s3").hidden).toBe(false);
    expect(document.querySelector('[name="dni"]')!.getAttribute("aria-invalid")).toBe("true");
    fill("nombre", "Ana Pérez");
    fill("dni", "30123456");
    fill("wa", "381 5123456");
    fill("email", "ana@example.com");
    click($("next"));
    expect($("s4").hidden).toBe(false);
    expect($("summary").textContent).toContain("Ana Pérez");
    click($("next"));
    expect($("done").hidden).toBe(false);
    expect($("code").textContent).toMatch(/^ESC-\d{4}$/);
    expect($("gcal").getAttribute("href")).toContain("calendar.google.com");
    expect($("mis-list").textContent).toContain("Poder");
    // el horario tomado queda ocupado para el próximo turno
    expect(app.store.isBusy(app.store.DAYS[0], time)).toBe(true);
    // consulta de estado
    const code = $("code").textContent!;
    (document.querySelector('#lookup [name="code"]') as HTMLInputElement).value = code.toLowerCase();
    $("lookup").dispatchEvent(new Event("submit", { cancelable: true }));
    expect($("lookup-out").innerHTML).toContain("<strong>Recibido</strong>");
  });

  it("panel: agenda, estados, bloqueos, trámites y CSV", async () => {
    const app = await mount(indexHTML);
    click($("tab-p"));
    expect($("pane-p").hidden).toBe(false);
    expect($("p-login").textContent).toBe("Entrar como Escribano/a titular");
    click($("p-login"));
    expect($("p-app").hidden).toBe(false);
    expect($("p-rows").querySelectorAll("tr").length).toBeGreaterThan(0);
    expect(Number($("k-sem").textContent)).toBe(8);
    // confirmar un turno pendiente
    const conf = $("p-rows").querySelector<HTMLButtonElement>('[data-act="Confirmado"]:not([disabled])');
    if (conf) {
      click(conf);
      expect($("p-rows").innerHTML).toContain("chip--solid");
    }
    // recordatorio
    const before = Number($("k-rec").textContent);
    const a = $("p-rows").querySelector<HTMLAnchorElement>('[data-act="remind"]')!;
    expect(a.href).toContain("https://wa.me/549");
    a.addEventListener("click", (e) => e.preventDefault());
    click(a);
    expect(Number($("k-rec").textContent)).toBe(before + 1);
    // navegar días
    const d0 = $("p-day").textContent;
    click($("p-next"));
    expect($("p-day").textContent).not.toBe(d0);
    // bloquear horario
    ($("blk-desde") as HTMLSelectElement).value = "8:00";
    ($("blk-hasta") as HTMLSelectElement).value = "9:00";
    $("blk-form").dispatchEvent(new Event("submit", { cancelable: true }));
    expect($("blk-msg").textContent).toMatch(/^Listo: 2 horarios bloqueados/);
    expect($("blk-list").hidden).toBe(false);
    expect(app.store.isBusy(app.store.DAYS[0], "8:00")).toBe(true);
    click($("blk-list").querySelector("[data-unblock]"));
    expect($("blk-list").hidden).toBe(true);
    // estado de trámite
    const sel = $("t-rows").querySelector<HTMLSelectElement>('select[data-code="ESC-2041"]')!;
    sel.value = "Firmado";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(app.store.statusText("ESC-2041")).toContain("Firmado");
    // CSV
    expect(app.store.buildCSV().split("\r\n").length).toBe(app.store.allTurnos().length + 1);
    click($("p-logout"));
    expect($("p-gate").hidden).toBe(false);
  });

  it("chat de WhatsApp: saca un turno que aparece en el panel", async () => {
    const app = await mount(indexHTML);
    click($("wa-fab"));
    expect($("wa").hidden).toBe(false);
    expect($("wa-log").textContent).toContain("Soy el asistente de Escribanía Demo");
    const opt = (label: string) => [...$("wa-log").querySelectorAll<HTMLButtonElement>(".wa__opts button")].find((b) => b.textContent!.startsWith(label))!;
    click(opt("Requisitos"));
    expect($("wa-log").textContent).toContain("Partida de nacimiento");
    click(opt("Sacar turno"));
    click(opt("Consulta general"));
    const dayBtn = [...$("wa-log").querySelectorAll<HTMLButtonElement>(".wa__opts button")].pop()!.parentElement!.querySelector("button")!;
    click(dayBtn);
    const hour = [...$("wa-log").querySelectorAll<HTMLButtonElement>(".wa__opts button")].find((b) => b.textContent!.endsWith(" hs"))!;
    click(hour);
    expect($("wa-form").hidden).toBe(false);
    ($("wa-input") as HTMLInputElement).value = "Juan Gómez";
    $("wa-form").dispatchEvent(new Event("submit", { cancelable: true }));
    expect($("wa-log").textContent).toContain("¡Listo, Juan!");
    const b = app.store.bookings.at(-1)!;
    expect(b.chat).toBe(true);
    expect($("mis-list").textContent).toContain("vía WhatsApp");
    // estado por chat
    click(opt("Estado de mi trámite"));
    ($("wa-input") as HTMLInputElement).value = b.code.slice(4);
    $("wa-form").dispatchEvent(new Event("submit", { cancelable: true }));
    expect($("wa-log").textContent).toContain(`Trámite ${b.code}: Recibido`);
  });

  it("personaliza por #slug", async () => {
    const app = await mount(indexHTML, "#" + data[0].slug);
    expect($("o-nombre").textContent).toBe(data[0].nombre);
    expect($("o-pick").hidden).toBe(true);
    expect($("o-info").textContent).toContain(data[0].direccion);
    expect(document.title).toBe(`Turnero · ${data[0].nombre}`);
    expect($("p-login").textContent).toBe(`Entrar como ${data[0].titular}`);
    expect(app.store.office?.slug).toBe(data[0].slug);
  });

  it("sin slug muestra el selector; slug desconocido vuelve al nombre por defecto", async () => {
    await mount(indexHTML, "#no-existe");
    expect($("o-nombre").textContent).toBe("Escribanía Demo");
    expect($("o-pick").hidden).toBe(false);
    expect($("o-select").querySelectorAll("option").length).toBe(data.length + 1);
  });

  it("ruta estática /[slug] prerenderiza la escribanía y el #slug la puede cambiar", async () => {
    expect(slugHTML).toContain(data[1].nombre);
    expect(slugHTML).toContain(`data-slug="${data[1].slug}"`);
    await mount(slugHTML);
    expect($("o-nombre").textContent).toBe(data[1].nombre);
    await mount(slugHTML, "#" + data[0].slug);
    expect($("o-nombre").textContent).toBe(data[0].nombre);
  });

  it("los anclas internas no cambian la escribanía", async () => {
    await mount(indexHTML, "#" + data[0].slug);
    click(document.querySelector('a[href="#panel"]'));
    expect($("pane-p").hidden).toBe(false);
    expect(window.location.hash).toBe("#" + data[0].slug);
  });
});
