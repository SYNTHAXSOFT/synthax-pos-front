// Roles del sistema POS — alineados con el backend (Rol.java)
export enum Rol {
  ROOT          = 'ROOT',
  ADMINISTRADOR = 'ADMINISTRADOR',
  CAJERO        = 'CAJERO',
  MESERO        = 'MESERO',
  DOMICILIARIO  = 'DOMICILIARIO',
}

export interface LoginRequest {
  cedula: string;
  password: string;
}

export interface LoginResponse {
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    cedula: string;
    email: string;
    rol: string;
  };
  token: string;
  mensaje: string;
}
