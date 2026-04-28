export interface InsumoRef {
  id?: number;
  codigo?: string;
  descripcion?: string;
  medida?: string;
  stock?: number;
}

export interface RestauranteRef {
  id?: number;
  nombre?: string;
}

export interface Compra {
  id?: number;
  codigo?: string;
  valorTotal?: number;
  valorUnidad?: number;
  cantidad?: number;
  descripcion?: string;
  insumo?: InsumoRef;
  restaurante?: RestauranteRef;
  formaPago?: { id?: number; nombre?: string };
  imagenSoporte?: string;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface CompraRequest {
  codigo: string;
  valorUnidad: number;
  cantidad: number;
  valorTotal?: number;
  descripcion?: string;
  insumo: { id: number };
  restaurante: { id: number };
  formaPago?: { id: number };
  imagenSoporte?: string;
  activo?: boolean;
}
