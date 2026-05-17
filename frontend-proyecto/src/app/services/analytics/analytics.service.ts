import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── /reports/financial/* ──────────────────────────────────────────────────────

/**
 * Mirrors FinancialMetricResponseDTO.java
 * Returned by /reports/financial/income, /expenses and /profit.
 */
export interface FinancialMetricResponse {
  metric: 'income' | 'expenses' | 'profit';
  scope:  FinancialScope;
  from:   string;   // e.g. "2026-04-28T00:00:00"
  to:     string;   // e.g. "2026-05-07T14:30:00"
  amount: number;
}

/**
 * The four time windows accepted by every /reports/financial/* endpoint
 * and by /tickets/analytics/product-evolution.
 */
export type FinancialScope = 'day' | 'week' | 'month' | 'year';

// ── /reports/products/analytics ───────────────────────────────────────────────

/**
 * Mirrors ProductAnalyticsResponseDTO.java
 * Returned as a paginated list by GET /reports/products/analytics.
 */
export interface ProductAnalyticsRecord {
  id:               number;
  name:             string;
  categoryName:     string;
  currentStock:     number;
  currentPrice:     number;
  monthlySalesCount: number;
  monthlyRevenue:   number;
  lastSupplierName: string | null;
  lastCostPrice:    number | null;
}

/**
 * Query parameters accepted by GET /reports/products/analytics.
 * All fields are optional — omitting them returns unfiltered results.
 */
export interface ProductAnalyticsParams {
  name?:     string;
  category?: string;
  page?:     number;
  size?:     number;
  sort?:     string;
}

// ── /tickets/analytics/product-evolution ─────────────────────────────────────

/**
 * Mirrors ProductSalesPointDTO.java
 * One data point: total units sold for a product in a given time bucket.
 */
export interface ProductSalesPoint {
  date:      string;   // bucket label, format depends on scope
  product:   string;
  unitsSold: number;
  revenue:   number;
}

/**
 * Query parameters for GET /tickets/analytics/product-evolution.
 */
export interface ProductEvolutionParams {
  period:       FinancialScope;
  productName?: string;   // substring filter; empty string = all products
  categoryName?: string;  // substring filter; empty string = all categories
  startDate?:   string;
  endDate?:     string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  private readonly BASE         = 'http://localhost:8080';
  private readonly FINANCIAL    = `${this.BASE}/reports/financial`;
  private readonly PRODUCTS     = `${this.BASE}/reports/products`;
  private readonly EVOLUTION    = `${this.BASE}/metrics/tickets`;

  // ── Financial endpoints ───────────────────────────────────────────────────

  /**
   * GET /reports/financial/income?scope=week
   * Returns total SALE ticket revenue from the start of the given period.
   * Roles: ADMIN, MANAGER
   */
  getIncome(scope: FinancialScope): Observable<FinancialMetricResponse> {
    const params = new HttpParams().set('scope', scope);
    return this.http.get<FinancialMetricResponse>(`${this.FINANCIAL}/income`, { params });
  }

  /**
   * GET /reports/financial/expenses?scope=week
   * Returns total SUPPLIER ticket costs from the start of the given period.
   * Roles: ADMIN, MANAGER
   */
  getExpenses(scope: FinancialScope): Observable<FinancialMetricResponse> {
    const params = new HttpParams().set('scope', scope);
    return this.http.get<FinancialMetricResponse>(`${this.FINANCIAL}/expenses`, { params });
  }

  /**
   * GET /reports/financial/profit?scope=week
   * Returns net profit (income − expenses) from the start of the given period.
   * Roles: ADMIN, MANAGER
   */
  getProfit(scope: FinancialScope): Observable<FinancialMetricResponse> {
    const params = new HttpParams().set('scope', scope);
    return this.http.get<FinancialMetricResponse>(`${this.FINANCIAL}/profit`, { params });
  }

  // ── Product analytics endpoint ────────────────────────────────────────────

  /**
   * GET /reports/products/analytics
   * Returns a paginated list of products crossed with their monthly sales
   * statistics and last supplier data.
   *
   * All params are optional:
   *   name     — substring filter on product name (backend does LIKE %name%)
   *   category — substring filter on category name
   *   page     — zero-based page index (Spring Pageable default: 0)
   *   size     — page size (Spring Pageable default: 20)
   *   sort     — "fieldName,direction" e.g. "monthlyRevenue,desc"
   *
   * Roles: ADMIN only
   */
  getProductAnalytics(
    filter: ProductAnalyticsParams = {}
  ): Observable<ProductAnalyticsRecord[]> {
    let params = new HttpParams();

    // Only append params that have a meaningful value to keep the URL clean
    if (filter.name?.trim())     params = params.set('name',     filter.name.trim());
    if (filter.category?.trim()) params = params.set('category', filter.category.trim());
    if (filter.page != null)     params = params.set('page',     filter.page);
    if (filter.size != null)     params = params.set('size',     filter.size);
    if (filter.sort?.trim())     params = params.set('sort',     filter.sort.trim());

    return this.http.get<ProductAnalyticsRecord[]>(
      `${this.PRODUCTS}/analytics`,
      { params }
    );
  }

  // ── Product evolution endpoint ────────────────────────────────────────────

  /**
   * GET /metrics/tickets/evolution?period=week&productName=
   * Returns time-series data points (units sold and revenue per product per time bucket).
   */
  getProductEvolution(
    params: ProductEvolutionParams
  ): Observable<ProductSalesPoint[]> {
    let httpParams = new HttpParams().set('period', params.period);

    httpParams = httpParams.set('productName', params.productName ?? '');
    httpParams = httpParams.set('categoryName', params.categoryName ?? '');
    
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get<ProductSalesPoint[]>(
      `${this.EVOLUTION}/evolution`,
      { params: httpParams }
    );
  }
}