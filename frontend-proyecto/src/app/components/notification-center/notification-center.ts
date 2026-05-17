import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { fromEvent, forkJoin, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import {
  NotificationService,
  UserNotification,
} from '../../services/notification/notification.service';
import { MessageService } from 'primeng/api';
import { getErrorMessage } from '../../utils/error-handler';

@Component({
  selector: 'app-notification-center',
  imports: [CommonModule, ButtonModule],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenter {
  private readonly auth = inject(AuthService);
  private readonly notificationsApi = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly notifications = signal<UserNotification[]>([]);
  readonly loading = signal(false);
  readonly isOpen = signal(false);
  readonly isMarkingAllRead = signal(false);
  readonly panelStyles = signal<{ top: number; left: number; width: number } | null>(null);

  readonly unreadCount = computed(
    () => this.notifications().filter((notification) => notification.status === 'ACTIVE').length,
  );

  readonly badgeLabel = computed(() => {
    const count = this.unreadCount();
    return count > 0 ? String(count) : undefined;
  });

  private readonly typeLabels: Record<string, string> = {
    ORDER_PICKUP_DEADLINE_REMINDER: 'Pickup reminder',
    ORDER_PICKUP_REMINDER: 'Scheduled pickup reminder',
    ORDER_PICKUP: 'Order ready',
    ORDER_CANCELLED: 'Order cancelled',
    SUPPLIER_ORDER_APPROVAL: 'Supplier approval',
    ONLINE_ORDER_CREATED: 'Online order',
    GENERAL_ANNOUNCEMENT: 'General announcement',
  };

  constructor() {
    effect((onCleanup) => {
      if (!this.isBrowser) {
        return;
      }

      if (!this.isOpen()) {
        return;
      }

      const clickSub = fromEvent<MouseEvent>(document, 'click').subscribe((event) => {
        if (!this.hostRef.nativeElement.contains(event.target as Node | null)) {
          this.isOpen.set(false);
        }
      });

      const keySub = fromEvent<KeyboardEvent>(document, 'keydown').subscribe((event) => {
        if (event.key === 'Escape') {
          this.isOpen.set(false);
        }
      });

      onCleanup(() => {
        clickSub.unsubscribe();
        keySub.unsubscribe();
      });
    });

    effect((onCleanup) => {
      if (!this.isBrowser) {
        return;
      }

      const user = this.auth.currentUser();
      const token = this.auth.token();

      if (!user?.id || !token) {
        this.notifications.set([]);
        this.notificationsApi.disconnect();
        return;
      }

      this.notificationsApi.setupConnection(token);
      this.loading.set(true);

      const historySub = this.notificationsApi.getHistory(user.id).subscribe({
        next: (history) => {
          this.notifications.set(this.sortNotifications(history));
          this.loading.set(false);
        },
        error: (err) => {
          console.error(getErrorMessage(err, 'Could not load notification history.'));
          this.loading.set(false);
        },
      });

      const liveSub = this.notificationsApi.watchNotifications().subscribe((notification) => {
        this.notifications.update((current) => this.mergeNotification(current, notification));

        // Use 'error' severity for cancellations, 'info' for everything else
        const severity = notification.type === 'ORDER_CANCELLED' ? 'error' : 'info';
        this.messageService.add({
          severity,
          summary: this.formatType(notification.type),
          detail: notification.message,
          life: 5000,
        });
      });

      onCleanup(() => {
        historySub.unsubscribe();
        liveSub.unsubscribe();
      });
    });

    this.destroyRef.onDestroy(() => this.notificationsApi.disconnect());
  }

  private resizeSub: Subscription | null = null;

  togglePanel(): void {
    const opening = !this.isOpen();

    if (opening) {
      this.computePanelPosition();
      this.resizeSub = fromEvent(window, 'resize').subscribe(() => this.computePanelPosition());
    } else {
      this.panelStyles.set(null);
      this.resizeSub?.unsubscribe();
      this.resizeSub = null;
    }

    this.isOpen.set(opening);
  }

  private computePanelPosition(): void {
    const host = this.hostRef.nativeElement;
    const rect = host.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const maxWidth = Math.min(380, Math.floor(viewportW * 0.92));
    const preferredLeft = rect.right + 8; // place to the right of the button
    const fallbackLeft = rect.left - maxWidth - 8; // place to the left if overflow

    const left =
      preferredLeft + maxWidth > viewportW ? Math.max(8, fallbackLeft) : Math.max(8, preferredLeft);

    let top = rect.bottom + 8;
    const maxHeight = Math.floor(viewportH - top - 16);
    if (maxHeight < 120) {
      top = rect.top - 8 - 320;
      if (top < 8) top = 8;
    }

    this.panelStyles.set({
      top: Math.max(8, Math.round(top)),
      left: Math.round(left),
      width: maxWidth,
    });
  }

  handleNotificationClick(notification: UserNotification): void {
    this.markAsRead(notification);
    this.isOpen.set(false);

    const role = this.auth.currentRole();
    if (role === 'CLIENT' || !role) {
      return;
    }

    const isClientOrder = [
      'ONLINE_ORDER_CREATED',
      'ORDER_PICKUP',
      'ORDER_CANCELLED',
      'ORDER_PICKUP_DEADLINE_REMINDER',
      'ORDER_PICKUP_REMINDER',
    ].includes(notification.type);
    const isSupplierOrder = notification.type === 'SUPPLIER_ORDER_APPROVAL';

    if (isClientOrder || isSupplierOrder) {
      const view = isSupplierOrder ? 'supplier' : 'client';
      const match = notification.message.match(/#(\d+)/) || notification.message.match(/\b(\d+)\b/);

      const queryParams: Record<string, string> = { view };
      if (match && match[1]) {
        queryParams['orderId'] = '#' + match[1];
      }

      void this.router.navigate(['/staff/orders'], { queryParams });
    }
  }

  markAsRead(notification: UserNotification): void {
    if (notification.status === 'READ') {
      return;
    }

    this.notificationsApi
      .markAsRead(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        this.notifications.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
      });
  }

  markAllAsRead(): void {
    const activeNotifications = this.notifications().filter(n => n.status === 'ACTIVE');
    if (activeNotifications.length === 0 || this.isMarkingAllRead()) {
      return;
    }

    this.isMarkingAllRead.set(true);

    const requests = activeNotifications.map(n => this.notificationsApi.markAsRead(n.id));

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedNotifications) => {
          this.notifications.update(items => {
            return items.map(item => {
              const updated = updatedNotifications.find(u => u.id === item.id);
              return updated ? updated : item;
            });
          });
          this.isMarkingAllRead.set(false);
        },
        error: () => {
          this.isMarkingAllRead.set(false);
        }
      });
  }

  formatType(type: UserNotification['type']): string {
    return this.typeLabels[type] ?? 'Notification';
  }

  buildAriaLabel(notification: UserNotification): string {
    return `${this.formatType(notification.type)}: ${notification.message}`;
  }

  private sortNotifications(items: UserNotification[]): UserNotification[] {
    return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  private mergeNotification(
    current: UserNotification[],
    incoming: UserNotification,
  ): UserNotification[] {
    const withoutDuplicate = current.filter((item) => item.id !== incoming.id);
    return this.sortNotifications([incoming, ...withoutDuplicate]);
  }
}
