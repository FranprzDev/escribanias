// Valida src/data/escribanias.json: campos obligatorios y slugs aptos para URL.
import { describe, expect, it } from "vitest";
import data from "../src/data/escribanias.json";

const CAMPOS = ["slug", "nombre", "registro", "titular", "direccion", "ciudad", "telefono"] as const;

describe("escribanias.json", () => {
  it("tiene al menos una escribanía", () => expect(data.length).toBeGreaterThan(0));
  it("slugs únicos y válidos para URL", () => {
    const slugs = data.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
  it("tokens de 8 caracteres, únicos", () => {
    const t = data.map((d) => d.token);
    for (const x of t) expect(x).toMatch(/^[a-z0-9]{8}$/);
    expect(new Set(t).size).toBe(t.length);
  });
  it("todas tienen los campos obligatorios", () => {
    for (const d of data) for (const c of CAMPOS) expect(typeof (d as Record<string, unknown>)[c], `${d.slug}.${c}`).toBe("string");
  });
  it("colores, si está, es '#primario,#acento' (uno puede faltar)", () => {
    for (const d of data) if (d.colores) expect(d.colores).toMatch(/^(#[0-9a-f]{3}|#[0-9a-f]{6})?\s*,\s*(#[0-9a-f]{3}|#[0-9a-f]{6})?$|^(#[0-9a-f]{3}|#[0-9a-f]{6})$/i);
  });
});
