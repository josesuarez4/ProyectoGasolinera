import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FuelService {

  private readonly BASE_URL = '/api/ServiciosRESTCarburantes/PreciosCarburantes';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  getAll() {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }

    const url = `${this.BASE_URL}/EstacionesTerrestres/FiltroProvincia/38`;
    const headers = new HttpHeaders({ 'Accept': 'application/json' });

    return this.http
      .get<any>(url, { headers })
      .pipe(map(res => res.ListaEESSPrecio));
  }
}