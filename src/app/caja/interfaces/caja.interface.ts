export interface CajaSesion {
  id: number;
  restaurante:      any;
  usuarioApertura:  any;
  usuarioCierre?:   any;
  fechaApertura:    string;
  fechaCierre?:     string;
  montoInicial:     number;
  estado:           'ABIERTA' | 'CERRADA';
}

export interface ReaperturaCajaRequest {
  motivo: string;
}

export interface CajaSesionLogEntry {
  id:            number;
  cajaSesionId:  number;
  tipoEvento:    'APERTURA' | 'CIERRE' | 'REAPERTURA';
  fechaEvento:   string;
  motivo?:       string;
  usuarioNombre?: string;
}

export interface CajaEstadoResponse {
  abierta: boolean;
  sesion:  CajaSesion | null;
}

export interface AperturaCajaRequest {
  montoInicial: number;
}

export interface MetodoPagoReporteItem {
  formaPagoId:     number;
  formaPagoNombre: string;
  saldoInicial:    number;
  ingresosDelDia:  number;
  egresosDelDia:   number;
  saldoFinal:      number;
  diferencia:      number;
}

export interface InsumoReporteItem {
  insumoId:          number;
  insumoDescripcion: string;
  medida:            string;
  stockInicial:      number;
  stockComprado:     number;
  stockVendido:      number;
  stockFinal:        number;
}

export interface VentaReporteItem {
  ventaId:    number;
  codigo:     string;
  tipoVenta:  string;
  cliente:    string;
  valor:      number;
  metodoPago: string;
  productos:  string[];
}

export interface CierreReporteDTO {
  cajaSesionId:           number;
  fechaApertura:          string;
  fechaCierre:            string;
  montoInicial:           number;
  listaVentas:            VentaReporteItem[];
  totalVentasDia:         number;
  listaCompras:           any[];
  totalComprasDia:        number;
  metodosPago:            MetodoPagoReporteItem[];
  totalIngresosFormaPago: number;
  coincideConVentas:      boolean;
  listaInsumos:           InsumoReporteItem[];
  efectivoAEntregar:      number;
}
