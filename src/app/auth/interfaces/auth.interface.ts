export enum Rol {
  ROOT = 'ROOT',
  ADMINISTRADOR = 'ADMINISTRADOR',
  CANDIDATO = 'CANDIDATO',
  TESTIGO = 'TESTIGO'
}

export interface LoginRequest {  // 👈 Asegúrate que tenga export
  cedula: string;
  password: string;
}

export interface LoginResponse {  // 👈 Asegúrate que tenga export
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;  // o Rol si prefieres usar el enum
  };
  token: string;
  mensaje: string;
}