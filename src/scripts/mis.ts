// "Mis turnos" y consulta de estado de trámite por código.
import { ESTADOS_TRAMITE } from "../lib/tramites";
import { esc, fmtDay, normCode, type Store } from "../lib/turnero";
import { byId } from "./dom";

export function lookupHTML(store: Store, code: string) {
  const b = store.find(code);
  if (!b) return `<p class="msg">No encontramos el código ${esc(code)}. Revisalo e intentá de nuevo.</p>`;
  const e = store.tramEstado(b.code);
  const i = store.tramIndex(b.code);
  return `<div class="aside"><h3>${esc(b.code)} · ${esc(b.tramite)}</h3><ol class="steps">${ESTADOS_TRAMITE.map((s, j) => `<li class="${j <= i ? "on" : ""}">${s}</li>`).join("")}</ol><p class="fineprint">Estado: <strong>${esc(e)}</strong>. Turno el ${esc(fmtDay(b.day, true))} a las ${b.time} hs (${esc(b.estado.toLowerCase())}).</p></div>`;
}

export function initMis(store: Store, doc: Document) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => byId<T>(id, doc);
  const lk = { code: "" };
  const chip = (estado: string) => `<span class="chip${estado === "Confirmado" ? " chip--solid" : ""}">${esc(estado)}</span>`;

  function render() {
    $("mis-list").innerHTML = store.bookings.length
      ? store.bookings
          .map((b) => `<li><span class="checklist__item">${esc(b.tramite)} <small>${esc(fmtDay(b.day, true))} · ${b.time} hs</small></span>${chip(b.estado)}<span class="checklist__note">${esc(b.code)}${b.chat ? " · vía WhatsApp" : ""} · Trámite: ${esc(store.tramEstado(b.code))}</span></li>`)
          .join("")
      : '<li><span class="checklist__item">Todavía no sacaste turnos <small>Sacá uno arriba o por WhatsApp</small></span></li>';
    if (lk.code) $("lookup-out").innerHTML = lookupHTML(store, lk.code);
  }
  const form = $<HTMLFormElement>("lookup");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (form.elements.namedItem("code") as HTMLInputElement).value.trim();
    lk.code = v ? normCode(v) : "";
    $("lookup-out").innerHTML = lk.code ? lookupHTML(store, lk.code) : '<p class="msg">Ingresá tu código de turno.</p>';
  });
  store.subscribe(render);
  render();
}
