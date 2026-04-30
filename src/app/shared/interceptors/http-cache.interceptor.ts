import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

interface CacheEntry {
  response: HttpResponse<any>;
  expiresAt: number;
}

// Caché en memoria compartida durante la sesión
const cache = new Map<string, CacheEntry>();

// TTL en milisegundos por segmento de URL
// Datos de referencia: TTL largo. Datos transaccionales: TTL corto.
const TTL_MAP: { pattern: RegExp; ttl: number }[] = [
  { pattern: /\/api\/tipo-pedido/,  ttl: 10 * 60_000 }, // 10 min
  { pattern: /\/api\/impuesto/,     ttl: 10 * 60_000 },
  { pattern: /\/api\/forma-pago/,   ttl:  5 * 60_000 }, // 5 min
  { pattern: /\/api\/productos/,    ttl:  5 * 60_000 },
  { pattern: /\/api\/mesas/,        ttl:  5 * 60_000 },
  { pattern: /\/api\/insumo/,       ttl:  5 * 60_000 },
  { pattern: /\/api\/restaurante/,  ttl:  5 * 60_000 },
  { pattern: /\/api\/clientes/,     ttl:  2 * 60_000 }, // 2 min
  { pattern: /\/api\/usuarios/,     ttl:  2 * 60_000 },
  { pattern: /\/api\/compras/,      ttl:      60_000 }, // 1 min
  { pattern: /\/api\/caja/,         ttl:      30_000 }, // 30 s
  { pattern: /\/api\/ventas/,       ttl:      30_000 },
  { pattern: /\/api\/pedidos/,      ttl:      20_000 }, // 20 s
];

// Cuando se muta un recurso, se invalidan las entradas de caché relacionadas
const INVALIDATION_MAP: { pattern: RegExp; clears: RegExp[] }[] = [
  { pattern: /\/api\/ventas/,    clears: [/\/api\/ventas/, /\/api\/pedidos/] },
  { pattern: /\/api\/pedidos/,   clears: [/\/api\/pedidos/, /\/api\/ventas/] },
  { pattern: /\/api\/compras/,   clears: [/\/api\/compras/, /\/api\/insumo/] },
  { pattern: /\/api\/productos/, clears: [/\/api\/productos/] },
  { pattern: /\/api\/mesas/,     clears: [/\/api\/mesas/] },
  { pattern: /\/api\/clientes/,  clears: [/\/api\/clientes/] },
  { pattern: /\/api\/usuarios/,  clears: [/\/api\/usuarios/] },
  { pattern: /\/api\/insumo/,    clears: [/\/api\/insumo/] },
  { pattern: /\/api\/caja/,      clears: [/\/api\/caja/] },
];

function getTtl(url: string): number | null {
  for (const { pattern, ttl } of TTL_MAP) {
    if (pattern.test(url)) return ttl;
  }
  return null;
}

function invalidateCache(url: string): void {
  for (const { pattern, clears } of INVALIDATION_MAP) {
    if (pattern.test(url)) {
      for (const clearPattern of clears) {
        for (const key of cache.keys()) {
          if (clearPattern.test(key)) cache.delete(key);
        }
      }
      return;
    }
  }
}

export const httpCacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo cachear GET
  if (req.method !== 'GET') {
    // Mutación: invalidar entradas relacionadas
    return next(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) invalidateCache(req.url);
      })
    );
  }

  const ttl = getTtl(req.url);
  if (ttl === null) return next(req); // URL sin TTL configurado → sin caché

  // Incluir Restaurante-Id en la clave para no mezclar datos entre restaurantes
  const restauranteId = req.headers.get('Restaurante-Id') ?? 'global';
  const key   = `${restauranteId}|${req.urlWithParams}`;
  const entry = cache.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    // Caché válido: devolver sin tocar la red
    return of(entry.response.clone());
  }

  // Sin caché o expirado: hacer la petición y guardar resultado
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status === 200) {
        cache.set(key, { response: event.clone(), expiresAt: Date.now() + ttl });
      }
    })
  );
};

/** Limpia toda la caché. Útil al cerrar sesión. */
export function clearHttpCache(): void {
  cache.clear();
}
