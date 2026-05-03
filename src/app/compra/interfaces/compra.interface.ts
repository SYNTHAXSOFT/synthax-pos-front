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
  /** Solo presente en vista de detalle (GET /id). Excluido del listado. */
  imagenSoporte?: string;
  /** Presente en el listado: true si la compra tiene factura adjunta. */
  tieneFactura?: boolean;
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

/** Una línea dentro de una orden multi-insumo */
export interface CompraLineaRequest {
  insumoId: number;
  cantidad: number;
  valorUnidad: number;
  valorAgregado?: number;
  descuento?: number;
  valorTotal?: number;
}

/** Payload para POST /api/compras/orden */
export interface CompraOrdenRequest {
  codigo: string;
  restauranteId: number;
  formaPagoId: number;
  descripcion?: string;
  imagenSoporte?: string;
  lineas: CompraLineaRequest[];
}
