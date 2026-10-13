// Bot de WhatsApp simulado: sacar turno, estado de trámite, requisitos y contacto.
import { TRAMITES, requisitos } from "../lib/tramites";
import { fmtDay, newCode, normCode, type Store } from "../lib/turnero";
import { byId } from "./dom";

export function initChat(store: Store, doc: Document, win: Window) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => byId<T>(id, doc);
  const chat = { mode: null as null | "name" | "code", t: "", day: null as Date | null, time: "" };
  const log = $("wa-log");
  const input = $<HTMLInputElement>("wa-input");

  function say(text: string, me = false) {
    const m = doc.createElement("div");
    m.className = "wa__msg" + (me ? " me" : "");
    m.textContent = text;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }
  function opts(list: [string, () => void][]) {
    const box = doc.createElement("div");
    box.className = "wa__opts";
    list.forEach(([label, fn]) => {
      const b = doc.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", () => { box.remove(); say(label, true); fn(); });
      box.appendChild(b);
    });
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }
  function ask(mode: "name" | "code") {
    chat.mode = mode;
    $("wa-form").hidden = false;
    input.value = "";
    input.focus();
  }
  function menu() {
    chat.mode = null;
    $("wa-form").hidden = true;
    opts([
      ["Sacar turno", chatTurno],
      ["Estado de mi trámite", () => { say("Pasame tu código de turno (ej. ESC-1234)."); ask("code"); }],
      ["Requisitos", chatReqs],
      ["Hablar con la escribanía", chatHablar],
    ]);
  }
  function chatTurno() {
    say("¿Qué trámite necesitás?");
    opts(TRAMITES.map((t) => [t.nombre, () => { chat.t = t.nombre; chatDia(); }]));
  }
  function chatDia() {
    say("¿Qué día te queda bien?");
    opts(store.DAYS.slice(0, 3).map((d) => [fmtDay(d, true), () => { chat.day = d; chatHora(); }]));
  }
  function chatHora() {
    const free = store.freeSlots(chat.day!).slice(0, 3);
    if (!free.length) { say("Ese día no quedan horarios. Probá otro."); return chatDia(); }
    say("Tengo estos horarios libres:");
    opts(free.map((t) => [t + " hs", () => { chat.time = t; say("¿A nombre de quién saco el turno? Escribí nombre y apellido."); ask("name"); }]));
  }
  function chatReqs() {
    say(TRAMITES.map((t) => `• ${t.nombre}: ${t.requisitos.join(", ")}.`).join("\n"));
    say("¿Te ayudo con algo más?");
    menu();
  }
  function chatHablar() {
    const o = store.office;
    say(o && o.telefono ? `Podés llamar a ${store.officeName()} al ${o.telefono}.` : `Por ahora no tenemos un teléfono cargado de ${store.officeName()}.`);
    say("¿Te ayudo con algo más?");
    menu();
  }
  $("wa-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    say(v, true);
    input.value = "";
    if (chat.mode === "name") {
      const code = newCode(Date.now() + v);
      store.addBooking({ code, tramite: chat.t, day: chat.day!, time: chat.time, nombre: v, wa: "chat", chat: true });
      say(`¡Listo, ${v.split(/\s+/)[0]}! Tu turno quedó confirmado.\n${chat.t}\n${fmtDay(chat.day!, true)} a las ${chat.time} hs\nCódigo: ${code}\nTraé: ${requisitos(chat.t).join(", ")}.\n(Demo: no se envían turnos reales.)`);
    } else if (chat.mode === "code") {
      say(store.statusText(normCode(v)));
    }
    say("¿Te ayudo con algo más?");
    menu();
  });
  function open(on: boolean) {
    $("wa").hidden = !on;
    $("wa-fab").setAttribute("aria-expanded", String(on));
    if (on && !log.children.length) {
      $("wa-name").textContent = `Asistente de ${store.officeName()}`;
      say(`¡Hola! Soy el asistente de ${store.officeName()}. ¿En qué te ayudo?`);
      menu();
    }
  }
  $("wa-fab").addEventListener("click", () => open(!!$("wa").hidden));
  $("wa-close").addEventListener("click", () => open(false));
  // Al cambiar de escribanía, el chat arranca de nuevo.
  win.addEventListener("hashchange", () => {
    log.innerHTML = "";
    $("wa-form").hidden = true;
    if (!$("wa").hidden) open(true);
  });
  return { open };
}
