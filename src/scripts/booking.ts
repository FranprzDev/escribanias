// Flujo de reserva en 4 pasos: trámite (+requisitos) → fecha/hora → datos → confirmar.
import { dayKey, esc, fmtDay, newCode, RULES, SLOTS, type Campo, type Store, type Turno } from "../lib/turnero";
import { requisitos } from "../lib/tramites";
import { byId, optButton, scrollToEl } from "./dom";

export function initBooking(store: Store, doc: Document) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => byId<T>(id, doc);
  const form = $<HTMLFormElement>("form");
  const st = { step: 1, tramite: null as string | null, day: null as Date | null, time: null as string | null, datos: {} as Record<string, string> };

  function renderTramites() {
    $("tramites").querySelectorAll<HTMLButtonElement>("[data-tramite]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tramite === st.tramite)));
    const reqs = $("reqs");
    reqs.hidden = !st.tramite;
    if (st.tramite) reqs.innerHTML = `<h3>Qué traer: ${esc(st.tramite)}</h3><ul>${requisitos(st.tramite).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`;
  }
  function renderDays() {
    const g = $("days");
    g.innerHTML = "";
    store.DAYS.forEach((d) =>
      g.appendChild(optButton(doc, esc(fmtDay(d)), !!st.day && dayKey(st.day) === dayKey(d), () => {
        st.day = d;
        st.time = null;
        renderDays();
        renderSlots();
      })),
    );
  }
  function renderSlots() {
    const g = $("slots");
    g.innerHTML = "";
    if (!st.day) {
      g.innerHTML = '<p class="fineprint">Elegí un día para ver los horarios.</p>';
      update();
      return;
    }
    const day = st.day;
    if (st.time && store.isBusy(day, st.time)) st.time = null;
    SLOTS.forEach((t) => {
      const busy = store.isBusy(day, t);
      const b = optButton(doc, t + (busy ? "<small>ocupado</small>" : ""), st.time === t, () => { st.time = t; renderSlots(); }, busy);
      b.dataset.time = t;
      if (busy) b.setAttribute("aria-label", `${t} ocupado`);
      g.appendChild(b);
    });
    update();
  }

  function validate(show: boolean) {
    let ok = true;
    for (const [k, [fn, msg]] of Object.entries(RULES) as [Campo, [(v: string) => boolean, string]][]) {
      const inp = form.elements.namedItem(k) as HTMLInputElement;
      const good = fn(inp.value);
      if (show) {
        inp.setAttribute("aria-invalid", good ? "false" : "true");
        (inp.nextElementSibling as HTMLElement).textContent = good ? "" : msg;
      }
      if (good) st.datos[k] = inp.value.trim();
      else ok = false;
    }
    return ok;
  }
  form.addEventListener("input", () => validate(false));
  form.addEventListener("submit", (e) => { e.preventDefault(); $("next").click(); });

  function renderSummary() {
    const rows: [string, string][] = [
      ["Trámite", st.tramite!], ["Fecha", fmtDay(st.day!, true)], ["Hora", st.time + " hs"], ["Nombre", st.datos.nombre],
      ["DNI", st.datos.dni], ["WhatsApp", st.datos.wa], ["Email", st.datos.email], ["Lugar", store.office ? store.office.direccion : store.officeName()],
    ];
    $("summary").innerHTML = rows.map(([a, b]) => `<div class="row"><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("");
  }

  function update() {
    for (let i = 1; i <= 4; i++) $("s" + i).hidden = st.step !== i;
    $("done").hidden = st.step !== 5;
    $("nav").hidden = st.step === 5;
    [...$("bar").children].forEach((li, i) => li.classList.toggle("on", i < st.step));
    $("back").hidden = st.step === 1;
    const next = $<HTMLButtonElement>("next");
    next.textContent = st.step === 4 ? "Confirmar turno" : "Continuar";
    next.disabled = (st.step === 1 && !st.tramite) || (st.step === 2 && !st.time);
  }

  function confirmar() {
    const code = newCode(Date.now() + st.datos.dni);
    const b: Turno = store.addBooking({ code, tramite: st.tramite!, day: st.day!, time: st.time!, nombre: st.datos.nombre, wa: st.datos.wa });
    $<HTMLAnchorElement>("gcal").href = store.gcalLink(b);
    $("code").textContent = code;
    $("done-lead").innerHTML = `<strong>${esc(b.tramite)}</strong>, ${esc(fmtDay(b.day, true))} a las ${b.time} hs en ${esc(store.officeName())}.`;
    st.step = 5;
    update();
  }

  $("tramites").addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("[data-tramite]");
    if (!b) return;
    st.tramite = b.dataset.tramite!;
    renderTramites();
    update();
  });
  $("next").addEventListener("click", () => {
    if (st.step === 3 && !validate(true)) return;
    if (st.step === 3) renderSummary();
    if (st.step === 4) return confirmar();
    st.step++;
    if (st.step === 2) { renderDays(); renderSlots(); }
    update();
    scrollToEl($("turno"));
  });
  $("back").addEventListener("click", () => { st.step--; update(); });
  $("again").addEventListener("click", () => {
    Object.assign(st, { step: 1, tramite: null, day: null, time: null, datos: {} });
    form.reset();
    renderTramites();
    update();
    scrollToEl($("turno"));
  });

  // Cambios externos (otra escribanía, bloqueos, turnos del chat) recalculan los horarios.
  store.subscribe(() => { if (st.step === 2) renderSlots(); });

  renderTramites();
  update();
  return { state: st };
}
