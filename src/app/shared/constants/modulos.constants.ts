export const MODULOS = {
  COCINA:                  'COCINA',
  DOMICILIOS:              'DOMICILIOS',
  MESAS:                   'MESAS',
  MESERO:                  'MESERO',
  CARTA_DIGITAL:           'CARTA_DIGITAL',
  INVENTARIO:              'INVENTARIO',
  COMPRAS:                 'COMPRAS',
  REPORTES:                'REPORTES',
  FACTURACION_ELECTRONICA: 'FACTURACION_ELECTRONICA',
} as const;

export type ModuloKey = typeof MODULOS[keyof typeof MODULOS];

export const MODULO_DESCRIPCIONES: Record<string, string> = {
  COCINA:                  'Cocina — Dashboard de cocina, flujo de preparación (Enviado → Preparando → Listo), rol COCINERO',
  DOMICILIOS:              'Domicilios — Permite crear ventas de tipo domicilio, rol DOMICILIARIO',
  MESAS:                   'Mesas — Gestión y asignación de mesas del restaurante',
  MESERO:                  'Mesero — Habilita el rol MESERO para tomar pedidos en mesa',
  CARTA_DIGITAL:           'Carta Digital — Menú público por URL, categorías de productos en carta',
  INVENTARIO:              'Inventario — Gestión de insumos, recetas de productos, control de stock',
  COMPRAS:                 'Compras — Registro de compras de insumos a proveedores',
  REPORTES:                'Reportes — Cierres de caja, reportes de ventas e inventario',
  FACTURACION_ELECTRONICA: 'Facturación Electrónica — Emisión de facturas ante la DIAN (próximamente)',
};
