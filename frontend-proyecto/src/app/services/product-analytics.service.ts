import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductAnalytics } from '../models/product-analytics.model';

@Injectable({
  providedIn: 'root'
})
export class ProductAnalyticsService {
  private apiUrl = `http://localhost:8080/reports/products/analytics`;

  constructor(private http: HttpClient) {}

  getProductAnalytics(name?: string, category?: string, page: number = 0, size: number = 10): Observable<ProductAnalytics[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (name) params = params.set('name', name);
    if (category) params = params.set('category', category);

    return this.http.get<ProductAnalytics[]>(this.apiUrl, { params });
  }
}
