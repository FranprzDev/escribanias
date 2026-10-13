// Autoprueba de la lógica del turnero. La usan los tests (vitest) y el
// navegador: abrí la página con ?selftest o llamá selfTest() en la consola.
import type { Escribania } from "./escribanias";
import { createStore, dayKey, fromMin, normCode, RULES, toMin } from "./turnero";

export interface Resultado {
  test: string;
  pass: boolean;
}

export function runSelfTest(office: Escribania | null, now: Date = new Date()): Resultado[] {
  const out: Resultado[] = [];
  const ok = (test: string, pass: unknown) => out.push({ test, pass: !!pass });
  try {
    const s = createStore(office, now);
    const d = s.DAYS[0];
    const free = s.freeSlots(d)[0];
    s.addBooking({ code: "ESC-T001", tramite: "Poder", day: d, time: free, nombre: 'Test "Uno"', wa: "3810000000" });
    s.addBooking({ code: "ESC-T002", tramite: "Consulta general", day: d, time: s.freeSlots(d)[0], nombre: "Chat Dos", wa: "chat", chat: true });
    const rows = s.dayRows(d);
    ok("Turno de la web aparece en el panel", rows.some((b) => b.nombre === 'Test "Uno"') && s.tramList().some((b) => b.code === "ESC-T001"));
    ok("Turno del chat aparece en el panel", rows.some((b) => b.nombre === "Chat Dos" && b.chat));
    ok("Turno tomado queda ocupado", s.isBusy(d, free));

    s.setTram("ESC-T001", "Listo para firmar");
    ok("Estado de trámite visible en la consulta", s.tramEstado("ESC-T001") === "Listo para firmar" && s.tramIndex("ESC-T001") === 2);
    ok("Estado de trámite visible en el chat", s.statusText(normCode("esc-t001")).includes("Listo para firmar"));
    ok("Código de 4 dígitos se normaliza", normCode("2041") === "ESC-2041" && s.statusText(normCode("2041")).startsWith("Trámite ESC-2041"));
    ok("Código inexistente avisa", s.statusText("ESC-0000").startsWith("No encontré"));

    const t2 = s.freeSlots(d)[0];
    const r = s.addBlock(dayKey(d), t2, fromMin(toMin(t2) + 30));
    ok("Horario bloqueado figura ocupado", r.ok && s.isBusy(d, t2) && !s.freeSlots(d).includes(t2));
    ok("Rango inválido rechazado", s.addBlock(dayKey(d), "10:00", "9:00").msg.startsWith("«Hasta»"));
    ok("Rango fuera de horario rechazado", !s.addBlock(dayKey(d), "13:00", "14:00").ok);
    s.removeBlock(0);
    ok("Desbloquear libera el horario", !s.isBlocked(d, t2));

    const b0 = s.bookings[0];
    s.setEstado(b0, "Cancelado");
    ok("Turno cancelado libera el horario", !s.dayRows(d).includes(b0) && !s.isBusy(d, free));
    s.setEstado(b0, "Pendiente");

    const csv = s.buildCSV();
    const lines = csv.split("\r\n");
    ok("CSV con encabezado y una fila por turno", lines[0].startsWith('"Fecha","Hora"') && lines.length === s.allTurnos().length + 1);
    ok("CSV escapa comillas", csv.includes('"Test ""Uno"""'));

    ok(
      "Recordatorio con texto pedido",
      decodeURIComponent(s.waLink(b0)).includes(`Hola Test "Uno", te recordamos tu turno en ${s.officeName()}`) &&
        s.waLink(b0).startsWith("https://wa.me/5493810000000?text="),
    );
    ok("Link a Google Calendar", s.gcalLink(b0).startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE"));

    const k = s.kpis();
    s.remind();
    ok("KPIs cuentan recordatorios", s.kpis().recordatorios === k.recordatorios + 1);

    ok("Validación de datos", RULES.nombre[0]("Ana Pérez") && !RULES.nombre[0]("Ana") && RULES.dni[0]("30.123.456") && !RULES.dni[0]("123") && RULES.wa[0]("381 5123456") && RULES.email[0]("a@b.com") && !RULES.email[0]("a@b"));

    if (office) ok("Nombre de la escribanía", s.officeName() === office.nombre && s.titular() === (office.titular || "Escribano/a titular"));
    else ok("Sin escribanía: nombre por defecto", s.officeName() === "Escribanía Demo" && s.titular() === "Escribano/a titular");
    const demo = createStore(null, now);
    ok("Demo general sin datos de escribanías", demo.office === null && demo.officeName() === "Escribanía Demo");
  } catch (err) {
    ok("Sin errores: " + (err as Error).message, false);
  }
  return out;
}
