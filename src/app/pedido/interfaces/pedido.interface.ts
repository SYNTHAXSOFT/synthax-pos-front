import { Producto } from '../../producto/interfaces/producto.interface';

/** Estados del ciclo de vida de un pedido (deben coincidir con PedidoEstado.java) */
export type PedidoEstado =
  | 'CREADO'
  | 'PEDIDO'
  | 'PREPARANDO'
  | 'PREPARADO'
  | 'ENTREGADO_CLIENTE'
  | 'ENTREGADO_DOMICILIARIO'
  | 'DEVUELTO'
  | 'CANCELADO'
  | 'DESTRUIDO';

/** Referencia ligera a una Venta dentro de un Pedido */
export interface VentaRef {
  id?: number;
  estado?: string;
}

/** Entidad Pedido tal como la devuelve el backend */
export interface Pedido {
  id?: number;
  cantidad?: number;
  observacion?: string;
  estado?: PedidoEstado;
  fechaCreacion?: string;
  producto?: Producto;
  venta?: VentaRef;
}

/** Payload para crear/actualizar un Pedido */
export interface PedidoRequest {
  cantidad: number;
  observacion?: string;
  producto: { id: number };
  venta: { id: number };
}

/** Payload para cambiar el estado de un Pedido */
export interface CambioEstadoRequest {
  estado: PedidoEstado;
  motivo?: string;
}
