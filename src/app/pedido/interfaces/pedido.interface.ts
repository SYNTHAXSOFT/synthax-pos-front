import { Producto } from '../../producto/interfaces/producto.interface';

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
  activo?: boolean;
  fechaCreacion?: string;
  producto?: Producto;
  venta?: VentaRef;
}

/** Payload para crear/actualizar un Pedido */
export interface PedidoRequest {
  cantidad: number;
  observacion?: string;
  activo?: boolean;
  producto: { id: number };
  venta: { id: number };
}
