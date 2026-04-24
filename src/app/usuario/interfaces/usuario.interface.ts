// Interface alineada con la entidad Usuario del backend
export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  password: string;
  rol: string; // ROOT | PROPIETARIO | ADMINISTRADOR | CAJERO | MESERO | COCINERO | DOMICILIARIO
  telefono?: string;
  activo?: boolean;
  departamento?: { id: string; nombre?: string; };
  municipio?:    { id: string; nombre?: string; };
  restaurante?:  { id: number; nombre?: string; };
}
