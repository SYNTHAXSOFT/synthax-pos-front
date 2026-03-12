import { Mesa } from '../../mesa/interfaces/mesa.interface';
import { TipoPedido } from '../../tipo-pedido/interfaces/tipo-pedido.interface';

/** Referencia ligera a un usuario dentro de una Venta */
export interface UsuarioRef {
  id?: number;
  nombre?: string;
  apellido?: string;
  cedula?: string;
  email?: string;
  rol?: string;
}

/** Entidad Venta tal como la devuelve el backend */
export interface Venta {
  id?: number;
  codigo?: string;
  estado?: string;            // 'ABIERTA' | 'PAGADA' | 'ANULADA'
  observacion?: string;
  valorTotal?: number;
  activo?: boolean;
  fechaCreacion?: string;

  // Relaciones
  tipoPedido?: TipoPedido;
  mesa?: Mesa;

  /** Cliente registrado. Null = venta anónima (solo tiquete POS). */
  usuarioCliente?: UsuarioRef;

  /** Empleado que abrió la venta. */
  usuarioCreador?: UsuarioRef;

  /** Empleado que cerró/cobró la venta. Se asigna al cerrar. */
  usuarioFacturador?: UsuarioRef;

  /** true = emitir factura electrónica DIAN con los datos del usuarioCliente. */
  solicitaFacturaElectronica?: boolean;
}

/** Payload para crear/actualizar una Venta (el backend resuelve los IDs) */
export interface VentaRequest {
  tipoPedido: { id: number };
  mesa?: { id: number };

  /** ID del cliente registrado. Opcional — null = venta anónima. */
  usuarioCliente?: { id: number };

  /** ID del empleado que abre la venta. Obligatorio. */
  usuarioCreador: { id: number };

  /** ID del empleado que cobra/factura. Opcional en creación. */
  usuarioFacturador?: { id: number };

  solicitaFacturaElectronica?: boolean;
  estado?: string;
  activo?: boolean;
}
