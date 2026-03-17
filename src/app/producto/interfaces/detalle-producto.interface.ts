import { Insumo } from '../../insumo/interfaces/insumo.interface';

export interface DetalleProducto {
  id?: number;
  producto?: { id: number };
  insumo?: Insumo;
  cantidad: number;
  activo?: boolean;
  fechaCreacion?: string;
}

/** Modelo usado en la UI para construir la receta antes de persistir */
export interface LineaReceta {
  insumo: Insumo;
  cantidad: number;
  /** id del DetalleProducto si ya existe en BD (para edición) */
  detalleId?: number;
}
