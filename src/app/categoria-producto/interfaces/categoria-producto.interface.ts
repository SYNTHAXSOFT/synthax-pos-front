export interface CategoriaProducto {
  id?: number;
  nombre: string;
  descripcion?: string;
  orden?: number;
  activo?: boolean;
  fechaCreacion?: string;
  restaurante?: { id?: number; nombre?: string };
}
