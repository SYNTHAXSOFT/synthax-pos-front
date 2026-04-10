export interface UsuarioPropietario {
  id?:       number;
  nombre?:   string;
  apellido?: string;
  cedula?:   string;
  email?:    string;
}

export interface Restaurante {
  id?:              number;
  codigo?:          string;
  nombre?:          string;
  logo?:            string | null;
  telefono?:        string;
  correo?:          string;
  descripcion?:     string;
  propietario?:     UsuarioPropietario;
  propietarios?:    UsuarioPropietario[];
  activo?:          boolean;
  fechaCreacion?:   string;

  // ── Branding / Identidad Visual ──────────────────────────────────────────
  colorPrimario?:   string;   // HEX, p.ej. "#1a73e8"
  colorSecundario?: string;   // HEX, p.ej. "#fbbc04"
  colorTexto?:      string;   // HEX para texto sobre fondo primario
  colorFondo?:      string;   // HEX para fondo general de la app
}

export interface RestauranteRequest {
  codigo:          string;
  nombre:          string;
  logo?:           string | null;
  telefono?:       string;
  correo?:         string;
  descripcion?:    string;
  propietario?:    { id: number };
  propietarios?:   { id: number }[];
  activo?:         boolean;

  // Branding
  colorPrimario?:  string;
  colorSecundario?: string;
  colorTexto?:     string;
  colorFondo?:     string;
}

/** DTO para actualizar únicamente la identidad visual. */
export interface BrandingRequest {
  logo?:           string | null;
  colorPrimario?:  string;
  colorSecundario?: string;
  colorTexto?:     string;
  colorFondo?:     string;
}
