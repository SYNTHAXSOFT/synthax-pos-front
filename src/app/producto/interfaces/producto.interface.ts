export interface Producto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen?: string;
  activo?: boolean;
  fechaCreacion?: string;
}
