import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagoItem, Venta, VentaRequest } from '../interfaces/venta.interface';
import { API_ENDPOINTS } from '../../utils/constantes-utils';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/${API_ENDPOINTS.VENTAS}`;

  crear(venta: VentaRequest): Observable<Venta> {
    return this.http.post<Venta>(this.base, venta);
  }

  obtenerTodos(): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.base);
  }

  /** Solo trae ventas creadas desde `fechaDesde` (ISO-8601). Usado en el dashboard. */
  obtenerDesde(fechaDesde: string): Observable<Venta[]> {
    const params = new HttpParams().set('fechaDesde', fechaDesde);
    return this.http.get<Venta[]>(this.base, { params });
  }

  obtenerPorEstado(estado: string): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.base}/estado/${estado}`);
  }

  obtenerAbiertas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.base}/estado/ABIERTA`);
  }

  obtenerPorId(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.base}/${id}`);
  }

  actualizar(id: number, venta: VentaRequest): Observable<Venta> {
    return this.http.put<Venta>(`${this.base}/${id}`, venta);
  }

  cerrarVenta(
    id: number,
    valorTotal: number,
    usuarioFacturadorId?: number,
    descuento?: number,
    motivoDescuento?: string,
    formaPagoId?: number,
    clienteId?: number,
    solicitaFacturaElectronica?: boolean,
    imagenSoporte?: string,
    /** Lista de pagos para multipago. Cuando viene con ≥2 ítems, formaPagoId se ignora. */
    pagos?: PagoItem[],
  ): Observable<Venta> {
    let params = new HttpParams().set('valorTotal', valorTotal.toString());
    if (usuarioFacturadorId != null) {
      params = params.set('usuarioFacturadorId', usuarioFacturadorId.toString());
    }
    if (descuento != null && descuento > 0) {
      params = params.set('descuento', descuento.toString());
    }
    if (motivoDescuento) {
      params = params.set('motivoDescuento', motivoDescuento);
    }
    // formaPagoId solo se envía en pago único (sin lista de pagos)
    if (formaPagoId != null && !(pagos && pagos.length > 0)) {
      params = params.set('formaPagoId', formaPagoId.toString());
    }
    if (clienteId != null) {
      params = params.set('clienteId', clienteId.toString());
    }
    if (solicitaFacturaElectronica != null) {
      params = params.set('solicitaFacturaElectronica', solicitaFacturaElectronica.toString());
    }
    const body: Record<string, unknown> = {};
    if (imagenSoporte) body['imagenSoporte'] = imagenSoporte;
    if (pagos && pagos.length > 0) body['pagos'] = pagos;
    return this.http.patch<Venta>(`${this.base}/${id}/cerrar`, body, { params });
  }

  anularVenta(id: number): Observable<Venta> {
    return this.http.patch<Venta>(`${this.base}/${id}/anular`, {});
  }

  reabrirVenta(id: number): Observable<Venta> {
    return this.http.patch<Venta>(`${this.base}/${id}/reabrir`, {});
  }

  desactivar(id: number): Observable<Venta> {
    return this.http.patch<Venta>(`${this.base}/${id}/desactivar`, {});
  }

  /**
   * Obtiene únicamente la imagen de soporte de una venta (carga lazy).
   * No se llama en el listado — solo al hacer clic en "Ver comprobante".
   */
  obtenerComprobante(id: number): Observable<{ imagenSoporte: string; codigo: string }> {
    return this.http.get<{ imagenSoporte: string; codigo: string }>(`${this.base}/${id}/comprobante`);
  }
}
