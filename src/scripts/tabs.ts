// Pestañas Clientes / Panel y navegación por anclas internas.
import { byId, scrollToEl } from "./dom";

export function initTabs(doc: Document) {
  const $ = (id: string) => byId(id, doc);
  const show = (panel: boolean) => {
    $("pane-c").hidden = panel;
    $("pane-p").hidden = !panel;
    $("tab-c").setAttribute("aria-selected", String(!panel));
    $("tab-p").setAttribute("aria-selected", String(panel));
    $("tab-c").tabIndex = panel ? -1 : 0;
    $("tab-p").tabIndex = panel ? 0 : -1;
  };
  $("tab-c").addEventListener("click", () => show(false));
  $("tab-p").addEventListener("click", () => show(true));
  // Flechas izquierda/derecha entre pestañas (patrón ARIA tabs).
  for (const id of ["tab-c", "tab-p"]) {
    const t = $(id);
    t.tabIndex = t.getAttribute("aria-selected") === "true" ? 0 : -1;
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const toPanel = id === "tab-c";
      show(toPanel);
      $(toPanel ? "tab-p" : "tab-c").focus();
    });
  }
  // Las anclas internas (#turno, #panel…) cambian de pestaña si hace falta y hacen scroll suave.
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
