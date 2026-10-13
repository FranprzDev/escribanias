// Arranque del turnero en el navegador. Todo vive en memoria: no hay backend.
import type { Escribania } from "../lib/escribanias";
import { runSelfTest } from "../lib/selftest";
import { createStore } from "../lib/turnero";
import { initBooking } from "./booking";
import { initChat } from "./chat";
import { initMis } from "./mis";
import { initOffice, renderOffice } from "./office";
import { initPanel } from "./panel";
import { initTabs } from "./tabs";

export function initApp(doc: Document = document, win: Window = window, now: Date = new Date()) {
  const data = JSON.parse(doc.getElementById("demo-data")?.textContent || "[]") as Escribania[];
  const store = createStore(data, now);
  store.subscribe(() => renderOffice(store, doc));
  const tabs = initTabs(doc);
  const booking = initBooking(store, doc);
  initMis(store, doc);
  const panel = initPanel(store, doc, win);
  const chat = initChat(store, doc, win);
  initOffice(store, doc, win); // resuelve el slug y dispara el primer render
  const selfTest = () => runSelfTest(data, now);
  Object.assign(win, { selfTest, turnero: store });
  if (/[?&]selftest\b/.test(win.location.search)) console.table(selfTest());
  return { store, booking, panel, chat, tabs, selfTest };
}
