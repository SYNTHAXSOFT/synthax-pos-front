export interface Impuesto {
  id?: number;
  descripcion: string;
  porcentajeImpuesto: number;
  estado: string;    // 'ACTIVO' | 'INACTIVO'
  activo?: boolean;
}
