// Endpoints del API REST — base URL definida en environment.ts
export const API_ENDPOINTS = {
  // Auth
  AUTH: 'auth',

  // Usuarios
  USUARIOS: 'usuarios',
  USUARIOS_ROL_ACTIVOS: 'rolActivo',

  // Geografía (Colombia)
  DEPTOS: 'departamentos',
  MPIOS: 'municipios',

  // Catálogos del POS
  PRODUCTOS:      'productos',
  MESAS:          'mesas',
  TIPOS_PEDIDO:   'tipos-pedido',
  IMPUESTOS:      'impuestos',

  // Transacciones
  VENTAS:         'ventas',
  PEDIDOS:        'pedidos',
  IMPUESTOS_VENTA:'impuestos-venta',
  DETALLE_PRODUCTO: 'detalle-producto',
  FACTURAS:       'facturas',

  // Multi-tenancy
  RESTAURANTES:   'restaurantes',
  INSUMOS:        'insumos',
  COMPRAS:        'compras',
  FORMAS_PAGO:    'formas-pago',
  CAJA:           'caja',
};

// Roles del sistema POS (sincronizados con Rol.java del backend)
export const ROLES_POS = {
  ROOT:          'ROOT',
  PROPIETARIO:   'PROPIETARIO',
  ADMINISTRADOR: 'ADMINISTRADOR',
  CAJERO:        'CAJERO',
  MESERO:        'MESERO',
  DOMICILIARIO:  'DOMICILIARIO',
};

// Estados de Venta
export const ESTADOS_VENTA = ['ABIERTA', 'PAGADA', 'ANULADA'];

// Tipos de Factura
export const TIPOS_FACTURA = ['VENTA', 'DEVOLUCION', 'NOTA_CREDITO', 'NOTA_DEBITO'];

// Unidades de medida para insumos
export const MEDIDAS_INSUMO = ['KG', 'GRAMO', 'LITRO', 'ML', 'UNIDAD', 'CAJA', 'BOLSA', 'PORCION'];
