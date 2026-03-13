// Roles del sistema POS — alineados con el backend (Rol.java)
export enum Rol {
  ROOT          = 'ROOT',
  PROPIETARIO   = 'PROPIETARIO',   // Dueño del restaurante — gestión total
  ADMINISTRADOR = 'ADMINISTRADOR', // Administrador de un restaurante
  CAJERO        = 'CAJERO',        // Registra ventas y facturas
  MESERO        = 'MESERO',        // Toma pedidos en mesa
  DOMICILIARIO  = 'DOMICILIARIO',  // Gestiona pedidos a domicilio
}

export interface LoginRequest {
  cedula: string;
  password: string;
}

/** Restaurante con datos de branding incluidos en el login. */
export interface RestauranteLogin {
  id:               number;
  codigo:           string;
  nombre:           string;
  logo?:            string | null;
  colorPrimario?:   string;
  colorSecundario?: string;
  colorTexto?:      string;
  colorFondo?:      string;
  telefono?:        string;
  correo?:          string;
  descripcion?:     string;
}

export interface LoginResponse {
  usuario: {
    id:       number;
    nombre:   string;
    apellido: string;
    cedula:   string;
    email:    string;
    rol:      string;
  };
  /** Restaurante del usuario con logo y colores. Null para rol ROOT. */
  restaurante: RestauranteLogin | null;
  token:   string;
  mensaje: string;
}
