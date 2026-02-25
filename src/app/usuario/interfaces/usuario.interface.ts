export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  password: string;
  rol: string;
  activo?: boolean;
  candidato: {
    id: string;
    nombre?: string;
  };
  // CAMPOS NUEVOS
  departamento?: {
    id: string;
    nombre?: string;
  };
  municipio?: {
    id: string;
    nombre?: string;
  };
}
