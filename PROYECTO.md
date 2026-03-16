# Synthax POS — Frontend

Documentación técnica del proyecto frontend del sistema de punto de venta **Synthax POS**.

---

## Stack tecnológico

| Tecnología | Versión |
|---|---|
| Angular | 20.3.0 |
| TypeScript | 5.9.2 |
| RxJS | 7.8.0 |
| Bootstrap | 5.3.3 (layout base) |
| Inter (Google Fonts) | Tipografía principal |

El proyecto usa **componentes standalone** de Angular con el nuevo control flow (`@if`, `@for`, `@empty`) y la API de **signals** para estado reactivo.

---

## Estructura de módulos

```
src/app/
├── auth/                   # Autenticación
│   ├── guards/             # Route guards (rol, auth)
│   ├── interceptors/       # HTTP interceptor (JWT)
│   ├── interfaces/
│   └── services/           # AuthService, JWT decode
│
├── compra/                 # Compras de insumos
├── departamento/           # Catálogo geográfico — departamentos
├── impuesto/               # Impuestos y tasas (IVA, INC)
├── insumo/                 # Inventario de insumos
├── mesa/                   # Gestión de mesas
├── municipio/              # Catálogo geográfico — municipios
├── pedido/                 # Pedidos por mesa
├── producto/               # Catálogo de productos
├── restaurante/            # Restaurantes, branding y configuración
├── tipo-pedido/            # Tipos de pedido (Mesa, Domicilio, etc.)
├── usuario/                # Usuarios y roles
├── venta/                  # Ventas y tickets
├── utils/                  # Utilidades generales
│
└── shared/
    ├── components/
    │   ├── side-menu/          # Menú lateral con header y opciones
    │   ├── toast/              # Componente de notificaciones toast
    │   ├── confirm-modal/      # Modal de confirmación elegante
    │   └── ...                 # footer, not-found, etc.
    ├── pages/
    │   └── dashboard-page/     # Layout principal (sidebar + topbar + contenido)
    ├── services/
    │   ├── branding.service.ts # Tema de colores por restaurante (localStorage)
    │   ├── theme.service.ts    # Tema oscuro/claro (localStorage)
    │   ├── toast.service.ts    # Notificaciones toast globales
    │   └── confirm.service.ts  # Diálogos de confirmación globales
    └── styles/
        ├── spx-forms.css       # Sistema de diseño — formularios
        ├── spx-geo.css         # Sistema de diseño — tablas catálogo
        └── spx-light-theme.css # Overrides del tema claro
```

Cada módulo de negocio sigue la misma convención:

```
modulo/
├── interfaces/     modulo.interface.ts
├── pages/
│   ├── modulo-registrar/   (formulario + tabla embebida)
│   └── modulo-listar/      (tabla con búsqueda y acciones)
├── services/       modulo.service.ts
└── modulo.routes.ts
```

---

## Sistema de diseño (Design System)

### Paleta principal (tema oscuro)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#101922` | Fondo de página |
| `--surface` | `#1a242f` | Cards y paneles |
| `--border` | `#283543` | Bordes |
| `--primary` | `#0d7ff2` | Azul principal, botones, focus |
| `--text` | `#f1f5f9` | Texto principal |
| `--muted` | `#64748b` | Texto secundario |
| `--ok` | `#22c55e` | Estados activos / éxito |
| `--off` | `#ef4444` | Estados inactivos / error |
| `--warn` | `#f59e0b` | Advertencias |

### Archivos CSS compartidos

**`spx-forms.css`** — formularios de registro y edición

Clases principales:
- `.spx-form-page` — contenedor de página
- `.spx-form-card` + `.spx-form-card__header` + `.spx-form-card__body`
- `.spx-form-grid--2/3/4` — grids responsivos
- `.spx-form-field` + `.spx-form-field--span2/3/4` — campos con span
- `.spx-form-input`, `.spx-form-select`, `.spx-form-textarea`
- `.spx-form-label`, `.spx-form-error`, `.spx-form-required`
- `.spx-form-toggle-row` + `.spx-form-toggle` — switch animado
- `.spx-form-section` — agrupación visual de campos
- `.spx-form-btn--primary` + `.spx-form-btn--secondary` — botones de acción
- `.spx-form-embedded` — área para tabla embebida debajo del formulario
- `.spx-tax-quick-btn` — botones de acceso rápido (ej: 5%, 8%, 19% IVA)

**`spx-geo.css`** — tablas de catálogos (compartido por departamento, municipio, tipo-pedido, impuesto)

Clases principales:
- `.spx-geo` — contenedor principal
- `.spx-geo-header`, `.spx-geo-header__title`, `.spx-geo-btn-refresh`
- `.spx-geo-stats`, `.spx-geo-stat`, `.spx-geo-stat--ok/--off`
- `.spx-geo-search-bar` + `input.spx-geo-search` — buscador inline con SVG
- `.spx-geo-table-wrap`, `.spx-geo-table`, `.spx-geo-row`
- `.spx-geo-badge--ok/--off` — badges de estado
- `.spx-geo-code` — badge estilo código (monospace)
- `.spx-geo-btn-edit`, `.spx-geo-btn-deact` — botones con ícono + texto

**`spx-light-theme.css`** — overrides del tema claro activados con `[data-theme="light"]` en `<html>`

---

## Servicios globales

### `ThemeService`
Gestiona el tema oscuro/claro de la aplicación.

```typescript
themeService.toggle();           // alterna el tema
themeService.setTheme('light');  // fuerza un tema
themeService.current             // 'dark' | 'light'
themeService.isDark              // boolean
```

El tema se persiste en `localStorage` con la clave `spx_theme`. Al iniciar la app, `ThemeService.init()` aplica el tema guardado (o detecta la preferencia del sistema).

El cambio de tema activa/desactiva el atributo `data-theme="light"` en `document.documentElement`, lo que activa todos los overrides de `spx-light-theme.css`.

### `BrandingService`
Permite personalizar los colores del sistema por restaurante.

```typescript
brandingService.init();                      // restaura branding guardado
brandingService.apply(branding);             // aplica colores como CSS vars
brandingService.save(restauranteId, branding); // persiste en localStorage
```

Los colores se aplican como variables CSS sobre `:root`, permitiendo que toda la UI refleje la identidad visual del restaurante activo.

### `ToastService`
Notificaciones no bloqueantes en la esquina superior derecha.

```typescript
toastService.success('Registro creado');
toastService.error('No se pudo conectar con el servidor');
toastService.warning('Completa todos los campos requeridos');
toastService.info('Cargando datos...');
```

Los toasts tienen duración configurable (por defecto: success 3.5 s, error 5 s, warning 4 s), animación de entrada deslizante y botón de cierre manual. Funciona con Angular signals — el `ToastComponent` es declarado en `app.html` y siempre está disponible.

### `ConfirmService`
Reemplaza el `confirm()` nativo del browser con un modal elegante con backdrop blur.

```typescript
const ok = await confirmService.confirm({
  title: 'Desactivar insumo',
  message: '¿Está seguro? Esta acción cambiará el estado del insumo.',
  confirmLabel: 'Sí, desactivar',
  cancelLabel: 'Cancelar',
  type: 'danger'   // 'danger' | 'warning' | 'info'
});
if (!ok) return;
```

API basada en `Promise<boolean>` — compatible con `async/await` en métodos de componentes. El tipo (`danger`/`warning`/`info`) cambia el color del ícono y del botón de confirmación.

---

## Autenticación y roles

El sistema usa **JWT** gestionado por `AuthService` con:
- `AuthInterceptor` — adjunta el token en cada petición HTTP
- Guards de ruta — `authGuard` y `roleGuard` controlan acceso por rol
- Roles disponibles: `ADMIN`, `PROPIETARIO`, `CAJERO`
- El rol `PROPIETARIO` solo ve datos de su restaurante asignado

---

## Dashboard y navegación

El `DashboardPageComponent` es el layout principal con:
- **Sidebar** — menú lateral con collapse en móvil
- **Topbar** — barra superior con búsqueda inteligente y panel de ajustes
- **Búsqueda** — filtra 20+ destinos del sistema por nombre y palabras clave; al seleccionar navega directamente con `Router.navigateByUrl()`
- **Panel de ajustes** — acceso al toggle de tema oscuro/claro con vista previa visual de cada opción

En móvil (≤767px), el topbar se oculta y aparece un header fijo con botón hamburguesa para abrir el sidebar.

---

## Responsividad

Breakpoints del sistema de diseño:

| Breakpoint | Ancho | Comportamiento |
|---|---|---|
| Desktop | > 900px | Layout completo, grids de hasta 4 columnas |
| Tablet | ≤ 900px | Grids de 4/3 col → 2 col, topbar compacto |
| Móvil | ≤ 767px | Header móvil, sidebar en overlay |
| Móvil pequeño | ≤ 600px | Grids a 1 columna, botones full-width, tablas con scroll horizontal |

---

## Módulos de negocio

### Restaurante
Gestión multirestaurante. El módulo incluye:
- **Registrar/editar** — datos del restaurante y asignación de propietario
- **Listar** — tabla con logo, colores de marca, datos de contacto y propietario
- **Branding** — editor de colores con vista previa en vivo (navbar simulada, stat cards, botones, tabla)

### Inventario (Insumo)
Control de stock de insumos con categorías, unidades de medida, precio de compra y stock mínimo. Las compras actualizan el stock automáticamente.

### Productos
Catálogo de productos del menú con precio de venta, categoría, impuesto asociado y estado activo/inactivo.

### Ventas
Registro de ventas por mesa o modalidad, con soporte para factura electrónica (requiere cliente). Genera ticket imprimible. Permite anular ventas.

### Pedidos
Ítems de pedido asociados a una venta/mesa. Se pueden cancelar ítems individuales.

### Compras
Registro de compras de insumos con actualización automática de stock.

### Mesas
Catálogo de mesas del restaurante con número y capacidad.

### Usuarios
Gestión de usuarios del sistema con rol, asignación a restaurante y estado activo.

### Catálogos geográficos
Departamentos y municipios con búsqueda y filtrado en tiempo real.

### Catálogos de configuración
Tipos de pedido (Mesa, Domicilio, Para llevar, etc.) e impuestos (IVA 5%, IVA 19%, INC 8%, etc.) con atajos de porcentaje rápido para Colombia.

---

## Convenciones de código

**Componentes** — standalone, `inject()` en lugar de constructor DI, `signal()` para estado local cuando aplica.

**Formularios** — reactivos (`FormBuilder`, `FormGroup`) en páginas de registro; template-driven (`ngModel`) en páginas de actualización simples.

**CSS** — prefijos por alcance (`spx-form-*`, `spx-geo-*`, `spx-dash-*`, `spx-rest-*`, `spx-brand-*`). Sin Bootstrap en los componentes nuevos — CSS puro con variables custom.

**Notificaciones** — `ToastService` para feedback no bloqueante. `ConfirmService` para acciones destructivas. Cero `alert()` o `confirm()` nativos.

**Rutas** — lazy loading por módulo con `loadComponent`. Estructura: `/synthax-pos/{modulo}/{accion}`.

---

## Scripts de desarrollo

```bash
# Servidor de desarrollo
ng serve

# Build de desarrollo
npx ng build --configuration=development

# Build de producción
npx ng build
```

> **Nota**: El error `EPERM: operation not permitted, unlink '...dist/...'` al hacer build es un problema de permisos de Windows sobre la carpeta `dist/`. No es un error de compilación — el código compila limpio. Se soluciona eliminando manualmente la carpeta `dist/` antes de volver a compilar.
