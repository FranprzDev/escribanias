import raw from "../data/escribanias.json";

export interface Escribania {
  slug: string;
  nombre: string;
  registro: string;
  titular: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  /** Opcional: "#primario,#acento" para personalizar los colores. */
  colores?: string;
}

export const ESCRIBANIAS: Escribania[] = raw as Escribania[];

export const DEFAULT_NAME = "Escribanía Demo";

export function findEscribania(data: Escribania[], slug: string | null | undefined): Escribania | null {
  if (!slug) return null;
  return data.find((d) => d.slug === slug) ?? null;
}

/** Devuelve las variables CSS de color si la escribanía define `colores`. */
export function themeStyle(e: Escribania | null): string {
  if (!e?.colores) return "";
  const [primary, accent] = e.colores.split(",").map((c) => c.trim());
  const ok = (c?: string) => !!c && /^#[0-9a-f]{3,8}$/i.test(c);
  return [ok(primary) ? `--c-primary:${primary}` : "", ok(accent) ? `--c-accent:${accent}` : ""].filter(Boolean).join(";");
}
