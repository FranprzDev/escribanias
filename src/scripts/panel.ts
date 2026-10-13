// Panel del escribano: KPIs, agenda diaria, bloqueos, estados de trámite y CSV.
import { ESTADOS_TRAMITE, type EstadoTurno } from "../lib/tramites";
import { addDays, dayKey, esc, fmtDay, fromMin, isWeekday, parseKey, SLOTS, toMin, type Store } from "../lib/turnero";
import { icon } from "../lib/icons";
import { byId } from "./dom";

const chipCls = (e: string) => "chip chip--" + e.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function initPanel(store: Store, doc: Document, win: Window) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => byId<T>(id, doc);
  const pst = { logged: false, day: store.firstWork };

  function renderKpis() {
    const k = store.kpis();
    $("k-hoy").textContent = String(k.hoy);
    $("k-sem").textContent = String(k.semana);
    $("k-rec").textContent = String(k.recordatorios);
    $("k-tra").textContent = String(k.tramites);
  }
  function renderDay() {
    const all = store.allTurnos();
    const rows = store.dayRows(pst.day);
    const d = fmtDay(pst.day, true);
    $("p-day").innerHTML = `<span>${esc(d.charAt(0).toUpperCase() + d.slice(1))}${dayKey(pst.day) === dayKey(store.today) ? '<span class="today">Hoy</span>' : ""}</span><small>${rows.length} turno${rows.length === 1 ? "" : "s"}</small>`;
    const dis = (c: boolean) => (c ? " disabled" : "");
    $("p-rows").innerHTML = rows.length
      ? rows
          .map((b) => {
            const i = all.indexOf(b);
            return `<tr>
          <th scope="row" data-label="Hora"><span class="t-time">${b.time}</span><small class="t-code">${esc(b.code)}${b.chat ? " · chat" : ""}</small></th><td data-label="Cliente">${esc(b.nombre)}</td><td data-label="Trámite">${esc(b.tramite)}</td>
          <td data-label="Estado"><span class="${chipCls(b.estado)}">${esc(b.estado)}</span></td>
          <td data-label="Acciones" class="t-acts"><div class="acts">
            <button class="btn btn--sm ${b.estado === "Pendiente" ? "btn--primary" : "btn--ghost"}" type="button" data-act="Confirmado" data-i="${i}"${dis(b.estado !== "Pendiente")}>Confirmar</button>
            <button class="btn btn--sm btn--ghost" type="button" data-act="Asistió" data-i="${i}"${dis(b.estado === "Asistió")}>Asistió</button>
            <button class="btn btn--sm btn--ghost" type="button" data-act="No asistió" data-i="${i}"${dis(b.estado === "No asistió")}>No asistió</button>
            <button class="btn btn--sm btn--ghost btn--danger" type="button" data-act="Cancelado" data-i="${i}">Cancelar</button>
            <a class="btn btn--sm btn--wa" data-act="remind" href="${esc(store.waLink(b))}" target="_blank" rel="noopener">${icon("whatsapp", 16)}Recordar</a>
          </div></td></tr>`;
          })
          .join("")
      : `<tr class="t-empty"><td colspan="5" data-label="Agenda">${icon("calendar", 18)}Sin turnos este día.</td></tr>`;
  }
  function renderTram() {
    $("t-rows").innerHTML = store
      .tramList()
      .map((b) => {
        const e = store.tramEstado(b.code);
        return `<tr><th scope="row" data-label="Código">${esc(b.code)}</th><td data-label="Cliente">${esc(b.nombre)}</td><td data-label="Trámite">${esc(b.tramite)}</td>
          <td data-label="Estado"><select class="sel" data-code="${esc(b.code)}" aria-label="Estado de ${esc(b.code)}">${ESTADOS_TRAMITE.map((s) => `<option${s === e ? " selected" : ""}>${s}</option>`).join("")}</select></td></tr>`;
      })
      .join("");
  }
  function renderBlocks() {
    $("blk-list").hidden = !store.blocked.length;
    $("blk-list").innerHTML = store.blocked
      .map((b, i) => `<li class="block"><span class="block__body"><b>${esc(fmtDay(parseKey(b.key), true))}</b><span>${b.desde} a ${b.hasta} hs</span></span><button class="btn btn--sm btn--ghost" type="button" data-unblock="${i}">Desbloquear</button></li>`)
      .join("");
  }
  function render() {
    const titular = store.titular();
    $("p-login").textContent = `Entrar como ${titular}`;
    $("p-gate").hidden = pst.logged;
    $("p-app").hidden = !pst.logged;
    $("p-tools").hidden = !pst.logged;
    $("p-sub").textContent = pst.logged ? `Sesión de demo: ${titular} · ${store.officeName()}.` : "Agenda, recordatorios, bloqueos y trámites en un solo lugar.";
    renderKpis();
    renderDay();
    renderTram();
    renderBlocks();
  }

  function shiftDay(n: number) {
    let d = addDays(pst.day, n);
    while (!isWeekday(d)) d = addDays(d, n);
    pst.day = d;
    renderDay();
  }
  function exportCSV() {
    const url = URL.createObjectURL(new Blob(["\ufeff" + store.buildCSV()], { type: "text/csv;charset=utf-8" }));
    const a = doc.createElement("a");
    a.href = url;
    a.download = store.csvFilename();
    doc.body.appendChild(a);
    a.click();
    a.remove();
    win.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $("p-login").addEventListener("click", () => { pst.logged = true; render(); });
  $("p-logout").addEventListener("click", () => { pst.logged = false; render(); });
  $("p-prev").addEventListener("click", () => shiftDay(-1));
  $("p-next").addEventListener("click", () => shiftDay(1));
  $("p-rows").addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-act]");
    if (!el) return;
    if (el.dataset.act === "remind") return store.remind();
    const b = store.allTurnos()[Number(el.dataset.i)];
    if (b) store.setEstado(b, el.dataset.act as EstadoTurno);
  });
  $("t-rows").addEventListener("change", (e) => {
    const sel = e.target as HTMLSelectElement;
    if (sel.dataset.code) store.setTram(sel.dataset.code, sel.value);
  });
  $("blk-list").addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-unblock]");
    if (el) store.removeBlock(Number(el.dataset.unblock));
  });
  $("blk-desde").innerHTML = SLOTS.map((t) => `<option>${t}</option>`).join("");
  $("blk-hasta").innerHTML = SLOTS.map((t, i) => `<option${i === 3 ? " selected" : ""}>${fromMin(toMin(t) + 30)}</option>`).join("");
  $<HTMLInputElement>("blk-fecha").min = dayKey(store.today);
  $<HTMLInputElement>("blk-fecha").value = dayKey(store.DAYS[0]);
  $<HTMLFormElement>("blk-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = $<HTMLFormElement>("blk-form").elements as unknown as Record<string, HTMLInputElement>;
    $("blk-msg").textContent = store.addBlock(f.fecha.value, f.desde.value, f.hasta.value).msg;
  });
  $("p-csv").addEventListener("click", exportCSV);

  store.subscribe(render);
  render();
  return { state: pst };
}
