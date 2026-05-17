import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { Drawer } from 'primeng/drawer';
import { MessageService } from 'primeng/api';
import { CartItem, CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { MyOrdersClientService, OrderResponseDTO } from '../../services/orders/orders.service';
import { NotificationService } from '../../services/notification/notification.service';
import { DatePicker } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';

/**
 * CartComponent — slide-in drawer that displays the current shopping cart.
 *
 * Presentational component: reads signals from CartService and delegates
 * all mutations back to it. Place Order wires to MyOrdersClientService.
 *
 * States:
 *  - Cart items view (default)
 *  - Order confirmation view (after successful order placement)
 */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [Drawer, ButtonModule, DividerModule, CurrencyPipe, DatePipe, DatePicker, FormsModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
})
export class CartComponent {
  protected readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(MyOrdersClientService);
  private readonly messageService = inject(MessageService);
  private readonly notificationService = inject(NotificationService);

  protected readonly placingOrder = signal(false);
  protected readonly cancellingOrder = signal(false);
  protected readonly lastOrder = signal<OrderResponseDTO | null>(null);
  protected notificationTime = signal<Date | null>(new Date());

  protected minDate = new Date();
  protected maxDate = new Date(new Date().setDate(new Date().getDate() + 7));
  
  private formatDelay(delayMs: number): string {
    if (delayMs <= 0) return 'immediately';
    const totalMinutes = Math.floor(delayMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    
    if (days > 0) return `in ${days} day(s) and ${hours} hour(s)`;
    if (hours > 0) return `in ${hours} hour(s) and ${minutes} minute(s)`;
    if (minutes > 0) return `in ${minutes} minute(s)`;
    return `in less than a minute`;
  }

  constructor() {
    // When new items are added to the cart while showing order confirmation,
    // dismiss the confirmation and show the updated cart instead.
    effect(() => {
      if (this.cart.itemCount() > 0 && this.lastOrder()) {
        this.lastOrder.set(null);
      }
    });
  }

  // ── Drawer two-way binding bridge ─────────────────────────────────────────

  get cartVisible(): boolean {
    return this.cart.isOpen();
  }

  set cartVisible(value: boolean) {
    value ? this.cart.openCart() : this.cart.closeCart();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  placeOrder(): void {
    const clientId = this.auth.currentUser()?.id;
    if (!clientId) return;

    this.placingOrder.set(true);

    const request = {
      clientId,
      totalPrice: this.cart.total(),
      items: this.cart.items().map((i: CartItem) => ({
        productId: i.productId,
        quantity: i.quantity,
        salePrice: i.price,
      })),
    };

    this.orderService.createOrder(request).subscribe({
      next: (order) => {
        this.cart.clearCart();
        this.lastOrder.set(order);
        this.placingOrder.set(false);

        const timeVal = this.notificationTime();
        if (timeVal) {
          try {
            const now = new Date();
            let targetTime = new Date();
            
            if (timeVal instanceof Date) {
              targetTime = timeVal;
            } else if (typeof timeVal === 'string') {
              const d = new Date(timeVal);
              if (!isNaN(d.getTime())) {
                targetTime = d;
              }
            }
            
            let delay = targetTime.getTime() - now.getTime();
            if (delay < 0) {
               delay = 0;
            }
            
            this.messageService.add({
              severity: 'info',
              summary: 'Scheduled Notification',
              detail: `Notification scheduled for ${targetTime.toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})} (${this.formatDelay(delay)})`,
              life: 3000
            });
            
            setTimeout(() => {
              this.notificationService.sendNotification(
                clientId,
                `Remember to pick up your order #${order.id}.`,
                'ORDER_PICKUP_REMINDER'
              ).subscribe({
                 next: () => console.log('Dispatched successfully.'),
                 error: (err) => console.error('Dispatch failed', err)
              });
            }, delay);
          } catch (e) {
            console.error('Failed to schedule notification:', e);
          }
          // Reset the chosen time for future orders
          this.notificationTime.set(new Date());
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not place order. Please try again.',
          life: 4000,
        });
        this.placingOrder.set(false);
      },
    });
  }

  cancelLastOrder(): void {
    const order = this.lastOrder();
    if (!order) return;

    this.cancellingOrder.set(true);
    this.orderService.cancelOrder(order.id).subscribe({
      next: (updated) => {
        this.lastOrder.set(updated);
        this.cancellingOrder.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not cancel order. Please try again.',
          life: 4000,
        });
        this.cancellingOrder.set(false);
      },
    });
  }

  dismissConfirmation(): void {
    this.lastOrder.set(null);
    this.cart.closeCart();
  }

  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Pendiente';
      case 'COLLECTED':
        return 'Recogido';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status ?? '';
    }
  }
}
