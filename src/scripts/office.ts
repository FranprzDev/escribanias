// Datos de la escribanía de ESTA página. La página ya viene prerenderizada con su
// nombre y datos; acá sólo se sincronizan los textos que dependen del store.
import type { Store } from "../lib/turnero";
import { byId } from "./dom";

export function renderOffice(store: Store, doc: Document) {
  const $ = (id: string) => byId(id, doc);
  const name = store.officeName();
  $("o-nombre").textContent = name;
  $("foot-text").textContent = `Demo creada por Francisco Perez para ${name}. Es una demostración: no se envían turnos reales.`;
  doc.title = `Turnero · ${name}`;
}
