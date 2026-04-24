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
  /** Foto de perfil almacenada como Base64 (data:image/...). Null = sin foto. */
  fotoPerfil?: string | null;
  departamento?: { id: string; nombre?: string; };
  municipio?:    { id: string; nombre?: string; };
  restaurante?:  { id: number; nombre?: string; };
}
