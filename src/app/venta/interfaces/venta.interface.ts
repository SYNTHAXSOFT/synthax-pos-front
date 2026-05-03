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

  /** Cliente registrado (tabla legacy Usuario). Null = venta anónima. */
  usuarioCliente?: UsuarioRef;

  /** Cliente registrado (tabla independiente clientes). */
  cliente?: { id?: number; nombre?: string; apellido?: string; cedula?: string; email?: string; telefono?: string; };

  /** Empleado que abrió la venta. */
  usuarioCreador?: UsuarioRef;

  /** Empleado que cerró/cobró la venta. Se asigna al cerrar. */
  usuarioFacturador?: UsuarioRef;

  /** true = emitir factura electrónica DIAN con los datos del usuarioCliente. */
  solicitaFacturaElectronica?: boolean;

  /** Porcentaje de descuento aplicado al cerrar (0-100). */
  descuento?: number;

  /** Motivo del descuento. */
  motivoDescuento?: string;

  /** Forma de pago utilizada al cerrar la venta. */
  formaPago?: { id?: number; nombre?: string; saldoActual?: number };

  /** Solo presente en vista de detalle (GET /id). Excluido del listado. */
  imagenSoporte?: string;
  /** Presente en el listado: true si la venta tiene comprobante adjunto. */
  tieneComprobante?: boolean;

  /** Calculado por el backend: número de pedidos asociados a esta venta. */
  numeroPedidos?: number;
}

/** Payload para crear/actualizar una Venta (el backend resuelve los IDs) */
export interface VentaRequest {
  tipoPedido: { id: number };
  mesa?: { id: number };

  /** ID del cliente (tabla clientes). Opcional — null = venta anónima. */
  cliente?: { id: number };
  /** ID del cliente legacy (tabla usuarios). Opcional. */
  usuarioCliente?: { id: number };

  /** ID del empleado que abre la venta. Obligatorio. */
  usuarioCreador: { id: number };

  /** ID del empleado que cobra/factura. Opcional en creación. */
  usuarioFacturador?: { id: number };

  solicitaFacturaElectronica?: boolean;
  /** Notas de entrega, dirección, detalles específicos del pedido, etc. */
  observacion?: string;
  estado?: string;
  activo?: boolean;
}
