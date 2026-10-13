// Lógica del turnero sin DOM: agenda, disponibilidad, bloqueos, estados de
// trámite, CSV y recordatorios. Todo vive en memoria (es una demo sin backend).
import { DEFAULT_NAME, type Escribania } from "./escribanias";
import { ESTADOS_TRAMITE, TRAMITES, tramite, type EstadoTurno } from "./tramites";

export interface Turno {
  code: string;
  tramite: string;
  day: Date;
  time: string;
  nombre: string;
  wa: string;
  estado: EstadoTurno;
  chat?: boolean;
}

export interface Bloqueo {
  key: string; // YYYY-MM-DD
  desde: string;
  hasta: string;
}

// ---------- utilidades ----------

/** Hash FNV-1a de 32 bits: genera ocupación y códigos deterministas. */
export function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (m: number) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
export const isWeekday = (d: Date) => d.getDay() % 6 !== 0;
export const fmtDay = (d: Date, long = false) =>
  d.toLocaleDateString("es-AR", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric" });

/** Horarios de atención: 8 a 13 y 17 a 20, cada 30 minutos. */
export const SLOTS: string[] = [];
for (const [a, b] of [[8, 13], [17, 20]]) for (let m = a * 60; m < b * 60; m += 30) SLOTS.push(fromMin(m));

export const normCode = (v: string) => {
  const c = String(v).toUpperCase().replace(/\s/g, "");
  return /^\d{4}$/.test(c) ? "ESC-" + c : c;
};
export const newCode = (seed: string) => "ESC-" + String(hash(seed) % 10000).padStart(4, "0");

// ---------- validación del formulario ----------

export type Campo = "nombre" | "dni" | "wa" | "email";
export const RULES: Record<Campo, [(v: string) => boolean, string]> = {
  nombre: [(v) => v.trim().split(/\s+/).length >= 2, "Ingresá nombre y apellido."],
  dni: [(v) => /^\d{7,8}$/.test(v.replace(/\./g, "").trim()), "El DNI debe tener 7 u 8 números."],
  wa: [(v) => v.replace(/\D/g, "").length >= 10, "Ingresá el número con característica (10 dígitos o más)."],
  email: [(v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), "Revisá el email."],
};

// ---------- turnos de ejemplo ----------

const SEED: [number, string, string, string, string, string, string][] = [
  [0, "8:30", "Lucía Herrera", "Certificación de firmas", "3815123401", "ESC-2041", "En revisión"],
  [0, "10:00", "Martín y Sofía Paz", "Firma de escritura", "3815123402", "ESC-2042", "Listo para firmar"],
  [0, "17:30", "Diego Ibáñez", "Autorización de viaje de menores", "3815123403", "ESC-2043", "Recibido"],
  [1, "9:00", "Carolina Ruiz", "Poder", "3815123404", "ESC-2044", "Recibido"],
  [1, "11:30", "Jorge Medina", "Retiro de documentación", "3815123405", "ESC-2045", "Firmado"],
  [2, "8:00", "Ana Belén Soria", "Consulta general", "3815123406", "ESC-2046", "Recibido"],
  [3, "12:00", "Ramiro Costilla", "Firma de escritura", "3815123407", "ESC-2047", "En revisión"],
  [4, "18:00", "Valeria Juárez", "Certificación de firmas", "3815123408", "ESC-2048", "Entregado"],
];

// ---------- store ----------

export type Store = ReturnType<typeof createStore>;

/** Un store por página: cada página conoce sólo a SU escribanía (o ninguna, en la demo general). */
export function createStore(office: Escribania | null, now: Date = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  /** Próximos 10 días hábiles (desde mañana) para reservar. */
  const DAYS: Date[] = [];
  for (let d = new Date(today); DAYS.length < 10; ) {
    d = addDays(d, 1);
    if (isWeekday(d)) DAYS.push(d);
  }
  const firstWork = today.getDay() === 6 ? addDays(today, 2) : today.getDay() === 0 ? addDays(today, 1) : today;
  const monday = addDays(firstWork, 1 - firstWork.getDay());
  const WEEK = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));

  const tram: Record<string, string> = {};
  const seeded: Turno[] = SEED.map(([off, time, nombre, tr, wa, code, te], i) => {
    const day = WEEK[(firstWork.getDay() - 1 + off) % 5];
    tram[code] = te;
    const estado: EstadoTurno = day < today ? (i % 3 ? "Asistió" : "No asistió") : i % 2 ? "Pendiente" : "Confirmado";
    return { code, day, time, nombre, tramite: tr, wa, estado };
  });

  const listeners = new Set<() => void>();

  const s = {
    today,
    DAYS,
    WEEK,
    monday,
    firstWork,
    office: office as Escribania | null,
    seeded,
    bookings: [] as Turno[],
    blocked: [] as Bloqueo[],
    tram,
    remindersSent: 0,

    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit() {
      listeners.forEach((fn) => fn());
    },

    officeName: () => (s.office ? s.office.nombre : DEFAULT_NAME),
    titular: () => (s.office?.titular ? s.office.titular : "Escribano/a titular"),

    allTurnos: (): Turno[] => s.seeded.concat(s.bookings),
    tramEstado: (code: string) => s.tram[code] || "Recibido",

    isBlocked(d: Date, t: string) {
      return s.blocked.some((b) => b.key === dayKey(d) && toMin(t) >= toMin(b.desde) && toMin(t) < toMin(b.hasta));
    },
    /** Ocupado = ~30% simulado por escribanía/día, bloqueado o ya reservado. */
    isBusy(d: Date, t: string) {
      return (
        hash((s.office ? s.office.slug : "demo") + dayKey(d) + t) % 10 < 3 ||
        s.isBlocked(d, t) ||
        s.allTurnos().some((b) => b.estado !== "Cancelado" && dayKey(b.day) === dayKey(d) && b.time === t)
      );
    },
    freeSlots: (d: Date) => SLOTS.filter((t) => !s.isBusy(d, t)),

    addBooking(b: Omit<Turno, "estado"> & { estado?: EstadoTurno }) {
      const t: Turno = { estado: "Pendiente", ...b };
      s.bookings.push(t);
      s.emit();
      return t;
    },
    setEstado(b: Turno, v: EstadoTurno) {
      b.estado = v;
      s.emit();
    },
    setTram(code: string, v: string) {
      s.tram[code] = v;
      s.emit();
    },
    addBlock(key: string, desde: string, hasta: string): { ok: boolean; msg: string } {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key || "")) return { ok: false, msg: "Elegí una fecha." };
      if (toMin(hasta) <= toMin(desde)) return { ok: false, msg: "«Hasta» tiene que ser después de «Desde»." };
      const n = SLOTS.filter((t) => toMin(t) >= toMin(desde) && toMin(t) < toMin(hasta)).length;
      if (!n) return { ok: false, msg: "Ese rango no incluye horarios de atención." };
      s.blocked.push({ key, desde, hasta });
      s.emit();
      return { ok: true, msg: `Listo: ${n} horario${n > 1 ? "s" : ""} bloqueado${n > 1 ? "s" : ""} el ${fmtDay(parseKey(key), true)}.` };
    },
    removeBlock(i: number) {
      s.blocked.splice(i, 1);
      s.emit();
    },
    remind() {
      s.remindersSent++;
      s.emit();
    },

    // ---- consultas ----
    find: (code: string) => s.allTurnos().find((x) => x.code === code),
    statusText(code: string) {
      const b = s.find(code);
      if (!b) return "No encontré ese código. Revisalo o sacá un turno nuevo.";
      return `Trámite ${b.code}: ${s.tramEstado(b.code)}.\n${b.tramite}, turno el ${fmtDay(b.day, true)} a las ${b.time} hs a nombre de ${b.nombre} (${b.estado.toLowerCase()}).`;
    },
    tramIndex: (code: string) => ESTADOS_TRAMITE.indexOf(s.tramEstado(code) as (typeof ESTADOS_TRAMITE)[number]),
    dayRows(d: Date) {
      return s
        .allTurnos()
        .filter((b) => b.estado !== "Cancelado" && dayKey(b.day) === dayKey(d))
        .sort((a, b) => toMin(a.time) - toMin(b.time));
    },
    tramList() {
      const seen = new Set<string>();
      return s
        .allTurnos()
        .filter((b) => !seen.has(b.code) && !!seen.add(b.code))
        .sort((a, b) => a.code.localeCompare(b.code));
    },
    kpis() {
      const act = s.allTurnos().filter((b) => b.estado !== "Cancelado");
      const wEnd = addDays(s.monday, 7);
      return {
        hoy: act.filter((b) => dayKey(b.day) === dayKey(today)).length,
        semana: act.filter((b) => b.day >= s.monday && b.day < wEnd).length,
        recordatorios: s.remindersSent,
        tramites: act.filter((b) => s.tramEstado(b.code) !== "Entregado").length,
      };
    },
    waLink(b: Turno) {
      const msg = `Hola ${b.nombre}, te recordamos tu turno en ${s.officeName()} el ${fmtDay(b.day, true)} a las ${b.time}. Traé tu DNI.`;
      const dig = String(b.wa || "").replace(/\D/g, "").replace(/^0/, "");
      return `https://wa.me/${dig ? (dig.startsWith("54") ? dig : "549" + dig) : ""}?text=${encodeURIComponent(msg)}`;
    },
    gcalLink(b: Turno) {
      const dur = tramite(b.tramite)?.minutos ?? 30;
      const at = (add: number) => {
        const [h, m] = b.time.split(":").map(Number);
        const x = new Date(b.day);
        x.setHours(h, m + add, 0, 0);
        return `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
      };
      const q = new URLSearchParams({
        action: "TEMPLATE",
        text: `${b.tramite} · ${s.officeName()}`,
        dates: `${at(0)}/${at(dur)}`,
        ctz: "America/Argentina/Tucuman",
        details: `Turno ${b.code}. Traé tu DNI. (Demo, turno no real)`,
        location: s.office ? s.office.direccion : "San Miguel de Tucumán",
      });
      return "https://calendar.google.com/calendar/render?" + q.toString();
    },
    buildCSV() {
      const q = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
      const rows = s.allTurnos().slice().sort((a, b) => +a.day - +b.day || toMin(a.time) - toMin(b.time));
      return [
        ["Fecha", "Hora", "Cliente", "Trámite", "Estado turno", "Código", "Estado trámite", "WhatsApp"],
        ...rows.map((b) => [dayKey(b.day), b.time, b.nombre, b.tramite, b.estado, b.code, s.tramEstado(b.code), b.chat ? "vía chat" : b.wa || ""]),
      ]
        .map((r) => r.map(q).join(","))
        .join("\r\n");
    },
    csvFilename: () => `agenda-${s.office ? s.office.slug : "demo"}-${dayKey(today)}.csv`,
  };
  return s;
}

export { TRAMITES };
