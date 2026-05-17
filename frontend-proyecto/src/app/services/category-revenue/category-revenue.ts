import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface CategoryDTO {
  id: number;
  name: string;
}

export interface OrderItemDTO {
  categoryId: number;
  salePrice: number;
  quantity: number;
}

export interface OrderDTO {
  status: string;
  items?: OrderItemDTO[];
  details?: OrderItemDTO[];
}

export interface CategoryRevenueDTO {
  categoryId: number;
  categoryName: string;
  totalRevenue: number;
  orderCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryRevenueService {
  private readonly http = inject(HttpClient);
  private readonly categoriesUrl = 'http://localhost:8080/categories';
  private readonly ordersUrl = 'http://localhost:8080/orders';

  getRevenueByCategory(): Observable<CategoryRevenueDTO[]> {
    return forkJoin({
      categories: this.http
        .get<CategoryDTO[]>(this.categoriesUrl)
        .pipe(catchError(() => of([]))),
      orders: this.http
        .get<OrderDTO[]>(this.ordersUrl)
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ categories, orders }) => {
        const revenueMap = new Map<number, { revenue: number; count: number }>();
        categories.forEach((cat) =>
          revenueMap.set(cat.id, { revenue: 0, count: 0 }),
        );
        orders
          .filter((o) => o.status?.toUpperCase() !== 'CANCELLED')
          .forEach((order) => {
            const items: OrderItemDTO[] = order.items ?? order.details ?? [];
            items.forEach((item) => {
              if (item.categoryId == null) return;
              const entry = revenueMap.get(item.categoryId) ?? { revenue: 0, count: 0 };
              entry.revenue += (item.salePrice ?? 0) * (item.quantity ?? 1);
              entry.count += 1;
              revenueMap.set(item.categoryId, entry);
            });
          });

        return categories.map((cat) => {
          const entry = revenueMap.get(cat.id) ?? { revenue: 0, count: 0 };
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            totalRevenue: Math.round(entry.revenue * 100) / 100,
            orderCount: entry.count,
          };
        });
      }),
    );
  }
}