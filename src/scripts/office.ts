// Personalización por escribanía: #slug, ?e=slug o la ruta /[slug].
import { esc, type Store } from "../lib/turnero";
import { DEFAULT_NAME, themeStyle } from "../lib/escribanias";
import { byId } from "./dom";

export function getSlug(doc: Document, loc: Location): string {
  const h = decodeURIComponent(loc.hash.slice(1));
  if (h && !doc.getElementById(h)) return h;
  return new URLSearchParams(loc.search).get("e") || doc.body.dataset.slug || "";
}

export function renderOffice(store: Store, doc: Document) {
  const $ = (id: string) => byId(id, doc);
  const o = store.office;
  const name = o ? o.nombre : DEFAULT_NAME;
  $("o-nombre").textContent = name;
  $("foot-text").textContent = `Demo creada por Francisco Perez para ${name}. Es una demostración: no se envían turnos reales.`;
  doc.title = `Turnero · ${name}`;
  $("o-pick").hidden = !!o;
  $("o-info").innerHTML = o
    ? `<p>Registro Nº ${esc(o.registro)} · ${esc(o.titular)}</p><p>${esc(o.direccion)}</p><p>Tel. ${esc(o.telefono)}</p>`
    : "";
  const theme = themeStyle(o);
  doc.body.style.removeProperty("--c-primary");
  doc.body.style.removeProperty("--c-accent");
  if (theme) theme.split(";").forEach((p) => { const [k, v] = p.split(":"); doc.body.style.setProperty(k, v); });
}

export function initOffice(store: Store, doc: Document, win: Window) {
  const select = byId<HTMLSelectElement>("o-select", doc);
  select.addEventListener("change", () => {
    if (select.value) win.location.hash = select.value;
  });
  win.addEventListener("hashchange", () => store.setOffice(getSlug(doc, win.location)));
  store.setOffice(getSlug(doc, win.location));
}
