import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { OrderResponseDTO } from '../orders/orders.service';

export interface ActivityItem {
  id: number;
  date: string;
  type: string;
  total: number;
  status: string;
}

export interface DashboardData {
  stats: { title: string; value: string }[];
  activities: ActivityItem[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly loyaltyUrl = 'http://localhost:8080/loyalty-card';
  private readonly ordersUrl = 'http://localhost:8080/orders';

  getDashboardData(clientId: number): Observable<DashboardData> {
    return forkJoin({
      pointsData: this.http
        .get<any>(`${this.loyaltyUrl}/${clientId}`)
        .pipe(catchError(() => of({ points: null }))),
      orders: this.http
        .get<OrderResponseDTO[]>(`${this.ordersUrl}/client/${clientId}`)
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ pointsData, orders }) => {
        const validOrders = orders.filter((o) => o.status?.toUpperCase() !== 'CANCELLED');
        const totalSpent = validOrders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
        const averageSpent = validOrders.length > 0 ? totalSpent / validOrders.length : 0;

        const stats: { title: string; value: string }[] = [
          { title: 'Total Spent', value: `€${totalSpent.toFixed(2)}` },
          { title: 'Average Spent', value: `€${averageSpent.toFixed(2)}` },
          { title: 'Valid Purchases', value: validOrders.length.toString() },
        ];

        if (pointsData?.points != null) {
          stats.push({
            title: 'Loyalty Points',
            value: pointsData.points.toString(),
          });
        }

        const activities: ActivityItem[] = orders.map((o) => ({
          id: o.id,
          date: o.createdAt,
          type: 'Online Order',
          total: o.totalPrice,
          status: o.status,
        }));

        return { stats, activities };
      }),
    );
  }
}
