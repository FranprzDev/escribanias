// Pestañas Clientes / Panel y navegación por anclas internas.
import { byId, scrollToEl } from "./dom";

export function initTabs(doc: Document) {
  const $ = (id: string) => byId(id, doc);
  const show = (panel: boolean) => {
    $("pane-c").hidden = panel;
    $("pane-p").hidden = !panel;
    $("tab-c").setAttribute("aria-selected", String(!panel));
    $("tab-p").setAttribute("aria-selected", String(panel));
  };
  $("tab-c").addEventListener("click", () => show(false));
  $("tab-p").addEventListener("click", () => show(true));
  // Las anclas (#turno, #panel…) no deben cambiar el hash: el hash elige la escribanía.
  doc.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!a) return;
      const t = doc.getElementById(decodeURIComponent(a.getAttribute("href")!.slice(1)));
      if (!t) return;
      e.preventDefault();
      if ($("pane-p").contains(t) && $("pane-p").hidden) show(true);
      else if ($("pane-c").contains(t) && $("pane-c").hidden) show(false);
      scrollToEl(t);
    },
    true,
  );
  return { show };
}
