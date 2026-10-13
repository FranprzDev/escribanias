// Flujo de reserva en 4 pasos: trámite (+requisitos) → fecha/hora → datos → confirmar.
import { dayKey, esc, fmtDay, newCode, RULES, SLOTS, type Campo, type Store, type Turno } from "../lib/turnero";
import { requisitos, tramite } from "../lib/tramites";
import { icon } from "../lib/icons";
import { monogram, shortAddress } from "../lib/escribanias";
import { byId, optButton, scrollToEl } from "./dom";

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const ticks = (list: string[]) => `<ul class="ticks">${list.map((r) => `<li>${icon("check", 16)}${esc(r)}</li>`).join("")}</ul>`;
function dayTile(d: Date) {
  const wd = d.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
  const mo = d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
  return `<span class="day__wd">${esc(cap(wd))}</span><span class="day__n">${d.getDate()}</span><span class="day__mo">${esc(mo)}</span>`;
}

export function initBooking(store: Store, doc: Document) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => byId<T>(id, doc);
  const form = $<HTMLFormElement>("form");
  const st = { step: 1, tramite: null as string | null, day: null as Date | null, time: null as string | null, datos: {} as Record<string, string> };

  function renderTramites() {
    $("tramites").querySelectorAll<HTMLButtonElement>("[data-tramite]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tramite === st.tramite)));
    const reqs = $("reqs");
    reqs.hidden = !st.tramite;
    if (st.tramite) reqs.innerHTML = `<p class="reqs__title">${icon("info", 18)}Para «${esc(st.tramite)}» traé:</p>${ticks(requisitos(st.tramite))}`;
    renderRail();
  }
  function renderRail() {
    const set = (k: string, v: string | null) => {
      const row = $("rail").querySelector<HTMLElement>(`[data-k="${k}"]`)!;
      row.querySelector("dd")!.textContent = v || "Sin elegir";
      row.classList.toggle("is-set", !!v);
    };
    set("tramite", st.tramite);
    set("duracion", st.tramite ? `${tramite(st.tramite)?.duracion ?? ""} aprox.` : null);
    set("fecha", st.day ? cap(fmtDay(st.day, true)) + (st.time ? `, ${st.time} hs` : "") : null);
  }
  function renderDays() {
    const g = $("days");
    g.innerHTML = "";
    store.DAYS.forEach((d) =>
      {
        const b = optButton(doc, dayTile(d), !!st.day && dayKey(st.day) === dayKey(d), () => {
          st.day = d;
          st.time = null;
          renderDays();
          renderSlots();
        });
        b.className = "day";
        b.setAttribute("aria-label", cap(fmtDay(d, true)));
        g.appendChild(b);
      },
    );
  }
  function renderSlots() {
    const g = $("slots");
    g.innerHTML = "";
    if (!st.day) {
      g.innerHTML = `<p class="empty">${icon("calendar", 18)}Elegí un día para ver los horarios libres.</p>`;
      renderRail();
      update();
      return;
    }
    const day = st.day;
    if (st.time && store.isBusy(day, st.time)) st.time = null;
    for (const [label, from, to] of [["Mañana", 0, 13 * 60], ["Tarde", 13 * 60, 24 * 60]] as const) {
      const grp = doc.createElement("div");
      grp.className = "slots__group";
      grp.innerHTML = `<p class="slots__label">${label}</p>`;
      const grid = doc.createElement("div");
      grid.className = "slots__grid";
      SLOTS.filter((t) => { const m = Number(t.split(":")[0]) * 60 + Number(t.split(":")[1]); return m >= from && m < to; }).forEach((t) => {
        const busy = store.isBusy(day, t);
        const b = optButton(doc, esc(t), st.time === t, () => { st.time = t; renderSlots(); }, busy);
        b.className = "slot";
        b.dataset.time = t;
        b.setAttribute("aria-label", busy ? `${t} ocupado` : `${t} libre`);
        grid.appendChild(b);
      });
      grp.appendChild(grid);
      g.appendChild(grp);
    }
    renderRail();
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
      ["Trámite", st.tramite!], ["Fecha", cap(fmtDay(st.day!, true))], ["Hora", st.time + " hs"], ["Lugar", (store.office && shortAddress(store.office.direccion)) || store.officeName()],
      ["Nombre", st.datos.nombre], ["DNI", st.datos.dni], ["WhatsApp", st.datos.wa], ["Email", st.datos.email],
    ];
    $("summary").innerHTML = rows.map(([a, b]) => `<div class="summary__row"><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("");
  }

  function update() {
    for (let i = 1; i <= 4; i++) $("s" + i).hidden = st.step !== i;
    $("done").hidden = st.step !== 5;
    $("turno").dataset.step = String(st.step);
    $("nav").hidden = st.step === 5;
    [...$("bar").children].forEach((li, i) => {
      li.classList.toggle("on", i < st.step);
      li.classList.toggle("done", i < st.step - 1);
      if (i === st.step - 1) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    $("bar").hidden = st.step === 5;
    $("back").hidden = st.step === 1;
    const next = $<HTMLButtonElement>("next");
    $("next-label").textContent = st.step === 4 ? "Confirmar turno" : "Continuar";
    next.disabled = (st.step === 1 && !st.tramite) || (st.step === 2 && !st.time);
  }

  // Sólo sube si el principio de la reserva quedó fuera de la pantalla.
  function toTop() {
    const el = $("turno").querySelector(".flow") ?? $("turno");
    const r = el.getBoundingClientRect?.();
    if (!r || r.top < 0) scrollToEl(el);
  }
  function confirmar() {
    const code = newCode(Date.now() + st.datos.dni);
    const b: Turno = store.addBooking({ code, tramite: st.tramite!, day: st.day!, time: st.time!, nombre: st.datos.nombre, wa: st.datos.wa });
    $<HTMLAnchorElement>("gcal").href = store.gcalLink(b);
    $("code").textContent = code;
    $("done-lead").innerHTML = `<strong>${esc(b.tramite)}</strong><br>${esc(cap(fmtDay(b.day, true)))}, ${b.time} hs<br>${esc(store.officeName())}${store.office && shortAddress(store.office.direccion) ? `, ${esc(shortAddress(store.office.direccion))}` : ""}`;
    $("done-bring").innerHTML = `<p class="reqs__title">Traé:</p>${ticks(requisitos(b.tramite))}`;
    const o = store.office;
    $("done-seal").innerHTML = `<span class="seal__letter">${esc(o ? monogram(o.nombre) : "E")}</span><span class="seal__reg">${o?.registro ? `Nº ${esc(o.registro)}` : "Demo"}</span>`;
    st.step = 5;
    update();
    toTop();
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
    toTop();
  });
  $("back").addEventListener("click", () => { st.step--; update(); });
  $("again").addEventListener("click", () => {
    Object.assign(st, { step: 1, tramite: null, day: null, time: null, datos: {} });
    form.reset();
    renderTramites();
    renderRail();
    update();
    toTop();
  });

  // Cambios externos (otra escribanía, bloqueos, turnos del chat) recalculan los horarios.
  store.subscribe(() => { if (st.step === 2) renderSlots(); });

  renderTramites();
  update();
  return { state: st };
}
