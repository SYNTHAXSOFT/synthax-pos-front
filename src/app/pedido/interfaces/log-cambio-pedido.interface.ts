export interface LogCambioPedido {
  id?: number;
  pedido?: { id?: number; };
  estadoAnterior?: string;
  estadoNuevo: string;
  rolUsuario?: string;
  usuarioId?: number;
  motivo?: string;
  fechaCambio: string;
}
