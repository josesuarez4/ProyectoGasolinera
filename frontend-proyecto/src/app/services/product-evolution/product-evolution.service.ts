
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductSalesPoint {
  date: string;
  product: string;
  unitsSold: number;
  revenue: number;
}

// One series per product, shaped for Chart.js line chart
export interface ProductChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  fill: boolean;
}

export interface ProductChartData {
  labels: string[];
  datasets: ProductChartDataset[];
}

// Palette of distinct colors for up to 8 product lines
const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
];

@Injectable({ providedIn: 'root' })
export class ProductEvolutionService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = 'http://localhost:8080/metrics/tickets/evolution';

  /**
   * Fetches raw data points and returns them shaped for Chart.js.
   */
  getChartData(
    period: string,
    productName: string = '',
    categoryName: string = '',
    startDate?: string,
    endDate?: string
  ): Observable<ProductSalesPoint[]> {
    let params = new HttpParams()
      .set('period', period)
      .set('productName', productName)
      .set('categoryName', categoryName);

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ProductSalesPoint[]>(this.BASE_URL, { params });
  }

  /**
   * Transforms the flat array of data points into a Chart.js-compatible
   * object with one dataset per product.
   */
  toChartData(points: ProductSalesPoint[]): ProductChartData {
    if (!points.length) return { labels: [], datasets: [] };

    // Collect sorted unique date labels
    const labelsSet = [...new Set(points.map(p => p.date))].sort();

    // Group points by product name
    const byProduct = new Map<string, Map<string, number>>();
    for (const p of points) {
      if (!byProduct.has(p.product)) {
        byProduct.set(p.product, new Map());
      }
      byProduct.get(p.product)!.set(p.date, p.unitsSold);
    }

    const datasets: ProductChartDataset[] = [...byProduct.entries()].map(
      ([name, dateMap], i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return {
          label: name,
          // Fill missing dates with 0 so all series have the same length
          data: labelsSet.map(date => dateMap.get(date) ?? 0),
          borderColor: color,
          backgroundColor: color + '22', // 13% opacity fill under the line
          tension: 0.35,
          fill: false,
        };
      }
    );

    return { labels: labelsSet, datasets };
  }
  /**
   * Estimates next month's sales for a specific product using a weighted moving average.
   * Analyzes historical trends to provide a growth/decline projection.
   */
  estimateProductSales(productName: string): Observable<{
    estimatedNextMonth: number;
    trend: 'rising' | 'falling' | 'stable';
    growthRate: number;
    confidence: 'high' | 'medium' | 'low';
    historicalData: ProductSalesPoint[];
  }> {
    return new Observable(observer => {
      this.getChartData('month', productName).subscribe({
        next: (points) => {
          const productPoints = points
            .filter(p => p.product.toLowerCase() === productName.toLowerCase())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (productPoints.length < 2) {
            observer.next({
              estimatedNextMonth: productPoints.length === 1 ? productPoints[0].unitsSold : 0,
              trend: 'stable',
              growthRate: 0,
              confidence: 'low',
              historicalData: productPoints
            });
            observer.complete();
            return;
          }

          // Use up to last 6 months
          const recent = productPoints.slice(-6);
          const values = recent.map(p => p.unitsSold);
          
          // Simple Weighted Moving Average
          // Weighting: [..., 0.1, 0.2, 0.3, 0.4] for the last 4 periods
          let weightedSum = 0;
          let weightTotal = 0;
          values.forEach((v, i) => {
            const weight = (i + 1) / values.length;
            weightedSum += v * weight;
            weightTotal += weight;
          });

          const estimate = Math.round(weightedSum / weightTotal);

          // Trend calculation (comparing last half vs first half of recent data)
          const midpoint = Math.floor(values.length / 2);
          const firstHalf = values.slice(0, midpoint);
          const secondHalf = values.slice(midpoint);
          const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          
          const growthRate = avg1 === 0 ? 0 : (avg2 - avg1) / avg1;
          
          let trend: 'rising' | 'falling' | 'stable' = 'stable';
          if (growthRate > 0.05) trend = 'rising';
          else if (growthRate < -0.05) trend = 'falling';

          observer.next({
            estimatedNextMonth: estimate,
            trend,
            growthRate: Math.round(growthRate * 100),
            confidence: productPoints.length >= 4 ? 'high' : 'medium',
            historicalData: productPoints
          });
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}