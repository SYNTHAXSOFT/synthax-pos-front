
export interface Municipio {
  id: string;
  nombre: string;
  activo?: boolean;
  fechaCreacion?: string;
  departamento: {
    id: string;
    nombre?: string;
  };
}