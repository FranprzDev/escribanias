// Helpers mínimos de DOM (sin frameworks).
export type El<T extends HTMLElement = HTMLElement> = T;

export function byId<T extends HTMLElement = HTMLElement>(id: string, doc: Document = document): T {
  const el = doc.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id}`);
  return el as T;
}

export function optButton(doc: Document, html: string, pressed: boolean, onClick: () => void, disabled = false): HTMLButtonElement {
  const b = doc.createElement("button");
  b.type = "button";
  b.className = "opt";
  b.innerHTML = html;
  b.setAttribute("aria-pressed", pressed ? "true" : "false");
  if (disabled) b.disabled = true;
  b.addEventListener("click", onClick);
  return b;
}

export function scrollToEl(el: Element) {
  el.scrollIntoView?.({ behavior: "smooth", block: "start" });
}
