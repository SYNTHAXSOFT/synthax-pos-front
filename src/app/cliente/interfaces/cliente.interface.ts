export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono?: string;
  activo?: boolean;
  fechaCreacion?: string;
  restaurante?: { id: number };
}
