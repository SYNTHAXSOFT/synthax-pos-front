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
  visibleEnControlStock?: boolean;
  rolesControlStock?: string; // JSON array string e.g. '["CAJERO","MESERO"]'
}

export interface InsumoRequest {
  codigo: string;
  descripcion: string;
  stock?: number;
  medida: string;
  restaurante: { id: number };
  activo?: boolean;
  visibleEnControlStock?: boolean;
  rolesControlStock?: string | null;
}

/** Item retornado por GET /api/caja/control-stock */
export interface InsumoControlStockItem {
  insumoId: number;
  insumoDescripcion: string;
  medida: string;
  stockInicial: number;
  stockComprado: number;
  stockVendido: number;
  stockFinal: number;
}
