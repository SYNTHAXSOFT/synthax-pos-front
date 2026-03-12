// Interface alineada con la entidad Usuario del backend
export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  password: string;
  rol: string; // ROOT | ADMINISTRADOR | CAJERO | MESERO | DOMICILIARIO
  activo?: boolean;
  departamento?: { id: string; nombre?: string; };
  municipio?:    { id: string; nombre?: string; };
}
