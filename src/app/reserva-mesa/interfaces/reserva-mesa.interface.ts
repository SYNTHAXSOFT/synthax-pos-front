export interface ReservaMesa {
  id?: number;

  /** Mesa reservada. */
  mesa: { id: number; nombre?: string; codigo?: string };

  /** Nombre del cliente. */
  nombreCliente: string;

  /** Teléfono de contacto. */
  telefono?: string;

  /** Fecha y hora de la reserva (ISO datetime). */
  fechaReserva: string;

  /** Número de personas esperadas. */
  numPersonas?: number;

  /** Nota adicional. */
  observacion?: string;

  /** ACTIVA | CANCELADA | CUMPLIDA */
  estado?: string;

  fechaCreacion?: string;
}

/** Payload para crear una reserva. */
export interface ReservaMesaRequest {
  mesa:          { id: number };
  nombreCliente: string;
  telefono?:     string;
  fechaReserva:  string;
  numPersonas?:  number;
  observacion?:  string;
}
