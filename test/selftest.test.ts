// Port del selfTest() original: corre la autoprueba de la lógica en distintas fechas.
import { describe, expect, it } from "vitest";
import data from "../src/data/escribanias.json";
import { runSelfTest } from "../src/lib/selftest";

const fechas = {
  "un lunes": new Date(2026, 9, 12, 10),
  "un viernes": new Date(2026, 9, 16, 18),
  "un sábado": new Date(2026, 9, 17, 9),
  "un domingo": new Date(2026, 9, 18, 9),
  hoy: new Date(),
};

describe("selfTest", () => {
  for (const [nombre, fecha] of Object.entries(fechas)) {
    it(`pasa completo en ${nombre}`, () => {
      for (const office of [null, ...data]) {
        const res = runSelfTest(office, fecha);
        expect(res.length).toBeGreaterThan(15);
        const fallas = res.filter((r) => !r.pass).map((r) => r.test);
        expect(fallas).toEqual([]);
      }
    });
  }
});
