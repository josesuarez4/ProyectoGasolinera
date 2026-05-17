import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../../services/auth/auth.service';
import { MyOrdersClientService, OrderResponseDTO } from '../../../services/orders/orders.service';
import { Card } from '../../../components/card/card';

@Component({
  selector: 'app-my-orders-client',
  imports: [CommonModule, Card, TagModule, DialogModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class OrdersClient implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ordersService = inject(MyOrdersClientService);
  private readonly cdr = inject(ChangeDetectorRef);

  orders: OrderResponseDTO[] = [];
  selectedOrder: OrderResponseDTO | null = null;
  dialogVisible = false;
  loading = true;
  error: string | null = null;
  cancellingOrder = false;

  ngOnInit(): void {
    const clientId = this.auth.currentUser()?.id;
    if (!clientId) {
      this.loading = false;
      this.error = 'Usuario no autenticado.';
      this.cdr.detectChanges();
      return;
    }

    this.ordersService.getOrders(clientId).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar los pedidos.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openOrder(order: OrderResponseDTO): void {
    this.selectedOrder = order;
    this.dialogVisible = true;
  }

  cancelOrder(order: OrderResponseDTO): void {
    this.cancellingOrder = true;
    this.ordersService.cancelOrder(order.id).subscribe({
      next: (updated) => {
        // Close dialog BEFORE detectChanges — PrimeNG Dialog loses its internal
        // event bindings if detectChanges() is called while it is mounted.
        this.dialogVisible = false;
        this.orders = this.orders.map((o) => (o.id === order.id ? updated : o));
        this.cancellingOrder = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cancellingOrder = false;
        this.cdr.detectChanges();
      },
    });
  }

  getStatusSeverity(
    status: string,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | null | undefined {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'warn';
      case 'PICKED_UP':
        return 'success';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Pendiente';
      case 'PICKED_UP':
        return 'Recogido';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status ?? '';
    }
  }
}
