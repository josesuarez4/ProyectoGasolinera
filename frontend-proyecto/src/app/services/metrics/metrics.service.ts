import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  private readonly http = inject(HttpClient);
  // Using same base as AnalyticsService to avoid environment import errors
  private readonly BASE_URL = 'http://localhost:8080';

  getIncomeByPaymentType(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/tickets/income-by-payment-type`);
  }

  getOrdersByStatus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/orders/by-status`);
  }

  getTopProducts(limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/products/top-revenue?limit=${limit}`);
  }

  getProductStock(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/products/stock`);
  }

  getTopEmployeesBySales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/tickets/top-employees`);
  }

  getSalesByOrigin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/tickets/by-origin`);
  }

  getHourlySales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/tickets/hourly`);
  }

  // Restoring methods used by other components like charts-demo
  getSalesByPeriod(period: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/tickets/evolution?period=${period}`);
  }

  getCashRegisterSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/metrics/cash-registers/summary`);
  }
}
