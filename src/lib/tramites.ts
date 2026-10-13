// Catálogo de trámites: nombre, duración estimada y requisitos.
// Se usa en el render estático (Astro) y en la lógica del cliente.

export interface Tramite {
  nombre: string;
  duracion: string; // texto visible, ej. "30 min"
  minutos: number;
  requisitos: string[];
}

export const TRAMITES: Tramite[] = [
  { nombre: "Firma de escritura", duracion: "60 min", minutos: 60, requisitos: ["DNI original de todas las partes", "Título anterior"] },
  { nombre: "Certificación de firmas", duracion: "15 min", minutos: 15, requisitos: ["DNI original", "Documento sin firmar"] },
  { nombre: "Poder", duracion: "30 min", minutos: 30, requisitos: ["DNI", "Datos del apoderado"] },
  { nombre: "Autorización de viaje de menores", duracion: "30 min", minutos: 30, requisitos: ["DNI del menor y de ambos padres", "Partida de nacimiento", "Datos del viaje"] },
  { nombre: "Retiro de documentación", duracion: "10 min", minutos: 10, requisitos: ["DNI", "Código de turno"] },
  { nombre: "Consulta general", duracion: "30 min", minutos: 30, requisitos: ["DNI"] },
];

export const tramite = (nombre: string): Tramite | undefined => TRAMITES.find((t) => t.nombre === nombre);
export const requisitos = (nombre: string): string[] => tramite(nombre)?.requisitos ?? [];

/** Estados por los que pasa un trámite, en orden. */
export const ESTADOS_TRAMITE = ["Recibido", "En revisión", "Listo para firmar", "Firmado", "Entregado"] as const;
export type EstadoTramite = (typeof ESTADOS_TRAMITE)[number];

/** Estados de un turno en la agenda. */
export type EstadoTurno = "Pendiente" | "Confirmado" | "Asistió" | "No asistió" | "Cancelado";
