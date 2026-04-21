import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReservaMesa, ReservaMesaRequest } from '../interfaces/reserva-mesa.interface';

@Injectable({ providedIn: 'root' })
export class ReservaMesaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.URL}/reservas`;

  obtenerTodas(): Observable<ReservaMesa[]> {
    return this.http.get<ReservaMesa[]>(this.base);
  }

  obtenerActivas(): Observable<ReservaMesa[]> {
    return this.http.get<ReservaMesa[]>(`${this.base}/activas`);
  }

  crear(payload: ReservaMesaRequest): Observable<ReservaMesa> {
    return this.http.post<ReservaMesa>(this.base, payload);
  }

  cancelar(id: number): Observable<ReservaMesa> {
    return this.http.patch<ReservaMesa>(`${this.base}/${id}/cancelar`, {});
  }

  cumplir(id: number): Observable<ReservaMesa> {
    return this.http.patch<ReservaMesa>(`${this.base}/${id}/cumplir`, {});
  }
}
