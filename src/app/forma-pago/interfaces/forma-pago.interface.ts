export interface FormaPago {
  id?: number;
  nombre?: string;
  descripcion?: string;
  saldoActual?: number;
  activo?: boolean;
  fechaCreacion?: string;
  restaurante?: { id?: number; nombre?: string };
}

export interface MovimientoFormaPago {
  id?: number;
  formaPago?: { id?: number; nombre?: string };
  tipoMovimiento?: string;  // 'AJUSTE_MANUAL' | 'VENTA' | 'COMPRA'
  saldoAnterior?: number;
  saldoNuevo?: number;
  valorMovimiento?: number;
  explicacion?: string;
  fechaMovimiento?: string;
  usuarioResponsable?: { id?: number; nombre?: string; apellido?: string };
  ventaId?: number;
  compraId?: number;
}

export interface FormaPagoRequest {
  nombre: string;
  descripcion?: string;
  saldoActual?: number;
  activo?: boolean;
  restaurante?: { id: number };
}
