import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { NotificationCenter } from '../notification-center/notification-center';

interface PrimeButtonClickEvent {
  originalEvent: Event;
}


@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    ButtonModule,
    MenuModule,
    NotificationCenter,
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly themeStorageKey = 'app-theme';

  brandText = input('Gas Station');
  brandRoute = input('/');
  isLoggedIn = input(false);
  notificationCount = input(3);
  actionClick = output<string>();

  readonly isDarkMode = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    const savedTheme = localStorage.getItem(this.themeStorageKey);
    const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDarkMode = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    this.applyDarkMode(shouldUseDarkMode);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  private readonly auth = inject(AuthService);

  readonly isClient = computed(() => this.auth.currentRole() === 'CLIENT');

  protected readonly isManager = computed(() => this.auth.currentRole() === 'MANAGER');
  protected readonly isAdmin = computed(() => this.auth.currentRole() === 'ADMIN');
  protected readonly canSendNotifications = computed(() => this.isManager() || this.isAdmin());

  // ── Cart ──────────────────────────────────────────────────────────────────

  private readonly cart = inject(CartService);

  readonly cartBadge = computed(() => {
    const count = this.cart.itemCount();
    return count > 0 ? String(count) : undefined;
  });

  onCartToggle(): void {
    this.cart.toggleCart();
  }

  // ── Theme ─────────────────────────────────────────────────────────────────

  toggleDarkMode(): void {
    if (!this.isBrowser) return;
    const nextIsDarkMode = !this.isDarkMode();
    this.applyDarkMode(nextIsDarkMode);
    localStorage.setItem(this.themeStorageKey, nextIsDarkMode ? 'dark' : 'light');
  }

  private applyDarkMode(enableDarkMode: boolean): void {
    this.document.documentElement.classList.toggle('my-app-dark', enableDarkMode);
    this.isDarkMode.set(enableDarkMode);
  }

  // ── Staff / Role helpers ──────────────────────────────────────────────────

  protected get isStaffView(): boolean {
    return this.router.url.startsWith('/staff/');
  }

  protected get staffRoleLabel(): string {
    return this.auth.currentRoleLabel() ?? 'Employee';
  }

  protected get isAdminStaffView(): boolean {
    return this.auth.currentRole() === 'ADMIN';
  }

  // ── Notifications bell (existing) ─────────────────────────────────────────

  protected readonly notificationMenuItems = computed<MenuItem[]>(() => {
    const count = this.notificationCount();
    if (count === 0) {
      return [{ label: 'No new notifications', icon: 'pi pi-check-circle', disabled: true }];
    }
    return Array.from({ length: Math.min(count, 5) }, (_, index) => ({
      label: `Notification ${index + 1}`,
      icon: 'pi pi-bell',
      disabled: true,
    }));
  });

  protected toggleNotifications(menu: Menu, event: Event | PrimeButtonClickEvent): void {
    const originalEvent = 'originalEvent' in event ? event.originalEvent : event;
    menu.toggle(originalEvent);
  }


}