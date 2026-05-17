import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { forkJoin, Observable } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NotificationCenter } from '../../../components/notification-center/notification-center';
import { NotificationService, UserNotification } from '../../../services/notification/notification.service';
import { AppRole, AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../services/users/user.service';

interface StaffSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  allowedRoles: AppRole[];
}

@Component({
  selector: 'app-staff-layout-page',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ButtonModule,
    NotificationCenter,
    MenuModule,
    DialogModule,
    SelectModule,
    FormsModule,
    TextareaModule,
    ToastModule,
  ],
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffLayoutPage {
  private readonly auth = inject(AuthService);
  protected readonly sidebarOpen = signal(true);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly messageService = inject(MessageService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly themeStorageKey = 'app-theme';
  readonly isDarkMode = signal(false);
  private readonly document = inject(DOCUMENT);

  protected readonly sections: StaffSection[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'View key metrics and summary indicators.',
      icon: 'pi pi-home',
      route: 'dashboard',
      allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'store-purchases',
      title: 'Store Purchases',
      description: 'In-person store sales.',
      icon: 'pi pi-shopping-cart',
      route: 'store-purchases',
      allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'users',
      title: 'Users',
      description: 'Manage user accounts.',
      icon: 'pi pi-users',
      route: 'users',
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'clients',
      title: 'Clients',
      description: 'Review client profiles and loyalty details.',
      icon: 'pi pi-id-card',
      route: 'clients',
      allowedRoles: ['MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'catalog',
      title: 'Catalog',
      description: 'Manage products, stock and availability.',
      icon: 'pi pi-box',
      route: 'catalog',
      allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'orders',
      title: 'Orders',
      description: 'Manage orders and their status.',
      icon: 'pi pi-shopping-cart',
      route: 'orders',
      allowedRoles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      id: 'tickets',
      title: 'Tickets',
      description: 'Manage tickets.',
      icon: 'pi pi-chart-line',
      route: 'tickets',
      allowedRoles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'my-tickets',
      title: 'My Tickets',
      description: 'Manage tickets.',
      icon: 'pi pi-chart-line',
      route: 'my-tickets',
      allowedRoles: ['EMPLOYEE'],
    },
    {
      id: 'cash-registers',
      title: 'Cash Registers',
      description: 'Manage cash registers.',
      icon: 'pi pi-chart-line',
      route: 'cash-registers',
      allowedRoles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'admin-analysis',
      title: 'Catalogue Analysis',
      description: 'Advanced sales and demand forecasting.',
      icon: 'pi pi-chart-bar',
      route: 'admin-catalogue-analysis',
      allowedRoles: ['ADMIN'],
    },
  ];

  ngOnInit(): void {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    if (!this.isBrowser) return;

    const savedTheme = localStorage.getItem(this.themeStorageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    if (shouldBeDark) {
      this.applyDarkMode(true);
    }
  }

  protected readonly visibleSections = computed(() => {
    const role = this.auth.currentRole();
    if (!role) {
      return [];
    }

    return this.sections.filter((section) => section.allowedRoles.includes(role));
  });

  protected toggleSidebar(): void {
    this.sidebarOpen.update((current) => !current);
  }

  protected logout(): void {
    this.auth.logout();
  }

  private applyDarkMode(enableDarkMode: boolean): void {
    this.document.documentElement.classList.toggle('my-app-dark', enableDarkMode);
    this.isDarkMode.set(enableDarkMode);
  }

  toggleDarkMode(): void {
    if (!this.isBrowser) {
      return;
    }

    const nextIsDarkMode = !this.isDarkMode();
    this.applyDarkMode(nextIsDarkMode);
    localStorage.setItem(this.themeStorageKey, nextIsDarkMode ? 'dark' : 'light');
  }

  // ── Send notification (manager / admin) ───────────────────────────────────

  protected readonly isManager = computed(() => this.auth.currentRole() === 'MANAGER');
  protected readonly isAdmin = computed(() => this.auth.currentRole() === 'ADMIN');
  protected readonly canSendNotifications = computed(() => this.isManager() || this.isAdmin());

  private readonly notifService = inject(NotificationService);
  private readonly userService = inject(UserService);

  protected readonly showSendNotifDialog = signal(false);
  protected readonly sendNotifTarget = signal<'user' | 'all'>('user');
  protected readonly employees = signal<{ id: number, name: string }[]>([]);
  protected selectedEmployeeId: number | null = null;
  protected selectedNotifType: UserNotification['type'] = 'ORDER_PICKUP';
  protected notifMessage = '';
  protected readonly isSendingNotif = signal(false);

  protected readonly notifTypes = [
    { label: 'Pickup deadline reminder', value: 'ORDER_PICKUP_DEADLINE_REMINDER' },
    { label: 'Order pickup', value: 'ORDER_PICKUP' },
    { label: 'Supplier order approval', value: 'SUPPLIER_ORDER_APPROVAL' },
    { label: 'Online order created', value: 'ONLINE_ORDER_CREATED' },
    { label: 'General announcement', value: 'GENERAL_ANNOUNCEMENT' },
  ];

  protected get canSubmitNotif(): boolean {
    const hasMsg = this.notifMessage.trim().length > 0;
    const hasTarget = this.sendNotifTarget() === 'all' || this.selectedEmployeeId !== null;
    return hasMsg && hasTarget;
  }

  protected readonly sendNotifMenuItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [
      {
        label: 'Send to employee',
        icon: 'pi pi-user',
        command: () => {
          this.sendNotifTarget.set('user');
          this._openSendDialog();
        },
      },
    ];

    if (this.isAdmin()) {
      items.push({
        label: 'Send to all',
        icon: 'pi pi-users',
        command: () => {
          this.sendNotifTarget.set('all');
          this._openSendDialog();
        },
      });
    }

    return items;
  });

  private _openSendDialog(): void {
    // Load employees lazily the first time
    if (this.employees().length === 0) {
      this.userService.getUsers().subscribe(users => {
        const staff = users.filter(u => {
          if (this.isAdmin()) {
            return u.role === 'EMPLOYEE' || u.role === 'MANAGER';
          }
          return u.role === 'EMPLOYEE';
        });
        this.employees.set(staff.map(u => ({
          id: u.id,
          name: this.isAdmin() ? `${u.name} (${u.role})` : u.name
        })));
      });
    }
    this.showSendNotifDialog.set(true);
  }

  protected toggleSendNotif(menu: Menu, event: any): void {
    const originalEvent = event.originalEvent || event;
    menu.toggle(originalEvent);
  }

  protected submitNotification(): void {
    this.isSendingNotif.set(true);

    let observables: Observable<any>[] = [];

    if (this.sendNotifTarget() === 'all') {
      const emps = this.employees();
      if (emps.length === 0) {
        this.isSendingNotif.set(false);
        return;
      }
      observables = emps.map(emp =>
        this.notifService.sendNotification(emp.id, this.notifMessage, this.selectedNotifType)
      );
    } else {
      observables = [this.notifService.sendNotification(this.selectedEmployeeId!, this.notifMessage, this.selectedNotifType)];
    }

    forkJoin(observables).subscribe({
      next: () => {
        this.showSendNotifDialog.set(false);
        this.notifMessage = '';
        this.selectedEmployeeId = null;
        this.isSendingNotif.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Notification sent successfully.',
          life: 3000,
        });
      },
      error: (err) => {
        console.error('Error sending notification:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error sending notification. Check the console for details.',
          life: 3000,
        });
        this.isSendingNotif.set(false);
      },
    });
  }
}
