// Arranque del turnero en el navegador. Todo vive en memoria: no hay backend.
import type { Escribania } from "../lib/escribanias";
import { runSelfTest } from "../lib/selftest";
import { createStore } from "../lib/turnero";
import { initBooking } from "./booking";
import { initChat } from "./chat";
import { initMis } from "./mis";
import { renderOffice } from "./office";
import { initPanel } from "./panel";
import { initTabs } from "./tabs";

export function initApp(doc: Document = document, win: Window = window, now: Date = new Date()) {
  // Sólo la escribanía de esta página (o null en la demo general).
  const office = JSON.parse(doc.getElementById("office-data")?.textContent || "null") as Escribania | null;
  const store = createStore(office, now);
  const tabs = initTabs(doc);
  const booking = initBooking(store, doc);
  initMis(store, doc);
  const panel = initPanel(store, doc, win);
  const chat = initChat(store, doc, win);
  renderOffice(store, doc);
  const selfTest = () => runSelfTest(office, now);
  Object.assign(win, { selfTest, turnero: store });
  if (/[?&]selftest\b/.test(win.location.search)) console.table(selfTest());
  return { store, booking, panel, chat, tabs, selfTest };
}
