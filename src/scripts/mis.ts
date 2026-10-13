// "Mis turnos" y consulta de estado de trámite por código.
import { ESTADOS_TRAMITE } from "../lib/tramites";
import { esc, fmtDay, normCode, type Store } from "../lib/turnero";
import { icon, TRAMITE_ICON } from "../lib/icons";
import { byId } from "./dom";

export function lookupHTML(store: Store, code: string) {
  const b = store.find(code);
  if (!b) return `<p class="msg msg--warn">${icon("info", 18)}No encontramos el código ${esc(code)}. Revisalo e intentá de nuevo.</p>`;
  const e = store.tramEstado(b.code);
  const i = store.tramIndex(b.code);
  return `<div class="track"><p class="track__head"><span class="track__code">${esc(b.code)}</span>${esc(b.tramite)}</p><ol class="track__steps">${ESTADOS_TRAMITE.map((s, j) => `<li class="${j < i ? "done" : j === i ? "now" : ""}"><span class="track__dot">${j < i ? icon("check", 12) : ""}</span>${s}</li>`).join("")}</ol><p class="fineprint">Estado: <strong>${esc(e)}</strong>. Turno el ${esc(fmtDay(b.day, true))} a las ${b.time} hs (${esc(b.estado.toLowerCase())}).</p></div>`;
}

export function initMis(store: Store, doc: Document) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => byId<T>(id, doc);
  const lk = { code: "" };
  const chip = (estado: string) => `<span class="chip chip--${estado.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}">${esc(estado)}</span>`;

  function render() {
    $("mis-list").innerHTML = store.bookings.length
      ? store.bookings
          .map((b) => `<li class="turno"><span class="turno__ico">${icon(TRAMITE_ICON[b.tramite] ?? "help", 20)}</span><span class="turno__body"><b>${esc(b.tramite)}</b><span>${esc(fmtDay(b.day, true))}, ${b.time} hs</span><small>${esc(b.code)}${b.chat ? " · vía WhatsApp" : ""} · Trámite: ${esc(store.tramEstado(b.code))}</small></span>${chip(b.estado)}</li>`)
          .join("")
      : `<li class="turno turno--empty">${icon("calendar", 20)}<span>Todavía no sacaste turnos. Reservá uno arriba o probá el bot de WhatsApp.</span></li>`;
    if (lk.code) $("lookup-out").innerHTML = lookupHTML(store, lk.code);
  }
  const form = $<HTMLFormElement>("lookup");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = (form.elements.namedItem("code") as HTMLInputElement).value.trim();
    lk.code = v ? normCode(v) : "";
    $("lookup-out").innerHTML = lk.code ? lookupHTML(store, lk.code) : `<p class="msg msg--warn">${icon("info", 18)}Ingresá tu código de turno.</p>`;
  });
  store.subscribe(render);
  render();
}
