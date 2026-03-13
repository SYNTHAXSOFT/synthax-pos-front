export interface RestauranteRef {
  id?: number;
  nombre?: string;
  codigo?: string;
}

export interface Insumo {
  id?: number;
  codigo?: string;
  descripcion?: string;
  stock?: number;
  medida?: string;
  restaurante?: RestauranteRef;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface InsumoRequest {
  codigo: string;
  descripcion: string;
  stock?: number;
  medida: string;
  restaurante: { id: number };
  activo?: boolean;
}
