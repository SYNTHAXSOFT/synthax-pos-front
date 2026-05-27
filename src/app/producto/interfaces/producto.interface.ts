export interface CategoriaProductoRef {
  id?: number;
  nombre?: string;
  descripcion?: string;
  orden?: number;
}

export interface Producto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen?: string;
  activo?: boolean;
  fechaCreacion?: string;
  esCarta?: boolean;
  categoriaProducto?: CategoriaProductoRef | null;
}
