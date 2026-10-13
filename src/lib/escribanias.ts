// Tipos y utilidades de una escribanía. Este módulo NO importa los datos:
// lo usa el cliente, y el bundle de JS nunca debe contener otras escribanías.

export interface Escribania {
  slug: string;
  /** Token aleatorio que vuelve la URL no adivinable: /e/<slug>-<token>/ */
  token?: string;
  nombre: string;
  registro: string;
  titular: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  /** Sin uso: todas las páginas comparten el mismo tema notarial. */
  colores?: string;
}

export const DEFAULT_NAME = "Escribanía Demo";

/** Segmento de URL de la página privada de una escribanía. */
export const pageId = (e: Escribania) => (e.token ? `${e.slug}-${e.token}` : e.slug);

/** Dirección para mostrar: la primera, sin código postal, sin prefijos sueltos ni ", Argentina". */
export function shortAddress(dir: string | undefined | null): string {
  return (dir || "")
    .split(";")[0]
    .replace(/^[A-Z]{2,4},\s*/, "")
    .replace(/^T?\d{4}[A-Z]{0,3},\s*/, "")
    .replace(/\bT\d{4}[A-Z]{0,3}\s+/g, "")
    .replace(/,\s*Argentina\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Primer teléfono de la lista ("a / b / c"). */
export const firstPhone = (tel: string | undefined | null) => (tel || "").split("/")[0].trim();

/** Inicial para el sello: la primera palabra que no sea "Escribanía", "Registro", etc. */
export function monogram(nombre: string): string {
  const skip = /^(escriban[ií]as?|escribanas?|escribanos?|estudio|notarial|registro|reg\.?|de|del|la|el|y|dr\.?|dra\.?|esc\.?|n[º°o.]*)$/i;
  const w = nombre.replace(/[:,.]/g, " ").split(/\s+/).find((x) => x && !skip.test(x) && /[a-záéíóúñ]/i.test(x));
  return (w ? w[0] : "E").toUpperCase();
}

/** Horario de atención que ofrece la demo (coincide con SLOTS en turnero.ts). */
export const HORARIO = "Lunes a viernes, de 8 a 13 y de 17 a 20 hs";

/** Nombre para mostrar: las palabras escritas TODO EN MAYÚSCULAS pasan a tipo título. */
export function displayName(nombre: string): string {
  const low = new Set(["de", "del", "la", "las", "los", "y", "e"]);
  return nombre
    .split(" ")
    .map((w, i) => {
      if (w !== w.toUpperCase() || !/[A-ZÁÉÍÓÚÑ]/.test(w)) return w;
      const l = w.toLowerCase();
      if (i > 0 && low.has(l)) return l;
      return w.length < 4 ? w : l[0].toUpperCase() + l.slice(1);
    })
    .join(" ");
}
