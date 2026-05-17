import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import {
  Table,
  TableAction,
  TableActionEvent,
  TableColumn,
  TableRow,
  TableRowClickEvent,
} from '../../../components/table/table';
import { AuthService } from '../../../services/auth/auth.service';
import { MessageService } from 'primeng/api';
import {
  MyOrdersClientService,
  MyOrdersSupplierService,
  OrderResponseDTO,
  SupplierOrderResponseDTO,
} from '../../../services/orders/orders.service';
import { DetailView, TagSeverity } from '../../../components/detail-view/detail-view';
import { DialogModule } from 'primeng/dialog';
import { CurrencyPipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { getErrorMessage } from '../../../utils/error-handler';
import { SupplierOrdersFilterComponent } from './components/supplier-orders-filter/supplier-orders-filter';
import { SupplierOrderRequestsComponent } from './components/supplier-order-requests/supplier-order-requests';

type OrdersView = 'client' | 'supplier';

interface StaffClientOrderRow extends TableRow {
  id: number;
  rawStatus: string;
  clientReference: string;
  createdAt: string;
  rawCreatedAt: number;
  totalPrice: string;
  status: string;
  maxPickupDate: string;
  rawMaxPickupDate: number;
  itemsCount: number;
  details: any[];
}

interface StaffSupplierOrderRow extends TableRow {
  id: number;
  creatorId: number;
  supplierName: string;
  status: string;
  creatorName: string;
  validatorName: string;
  createdAtKey: string;
  createdAt: string;
  rawCreatedAt: number;
  resolvedAt: string;
  totalPrice: string;
  details: any[];
}

@Component({
  selector: 'app-staff-orders-page',
  imports: [
    Table,
    ButtonModule,
    RouterLink,
    DetailView,
    DialogModule,
    CurrencyPipe,
    TagModule,
    SupplierOrdersFilterComponent,
    SupplierOrderRequestsComponent,
  ],
  templateUrl: './staff-orders.html',
  styleUrl: './staff-orders.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffOrdersPage {
  private readonly ordersService = inject(MyOrdersClientService);
  private readonly supplierOrdersService = inject(MyOrdersSupplierService);
  private readonly auth = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected readonly view = signal<OrdersView>('client');
  protected readonly rows = signal<OrderResponseDTO[]>([]);
  protected readonly loadingOrders = signal(false);
  protected readonly updatingOrderId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly supplierLoading = signal(false);
  protected readonly supplierUpdatingOrderId = signal<number | null>(null);
  protected readonly supplierErrorMessage = signal<string | null>(null);
  protected readonly supplierSuccessMessage = signal<string | null>(null);
  protected readonly supplierRows = signal<StaffSupplierOrderRow[]>([]);
  protected readonly supplierNameFilter = signal('');
  protected readonly supplierCreatorFilter = signal('');
  protected readonly supplierDateFilter = signal('');
  protected readonly supplierStatusFilter = signal('');
  protected readonly loyaltyCodeFilter = signal('');
  protected readonly orderDateFilter = signal('');
  protected readonly orderStatusFilter = signal('');
  protected readonly orderDateSortOrder = signal<'asc' | 'desc'>('desc');
  protected readonly supplierDateSortOrder = signal<'asc' | 'desc'>('desc');
  protected readonly isEmployee = computed(() => this.auth.currentRole() === 'EMPLOYEE');
  protected readonly isManagerOrAdmin = computed(() => {
    const role = this.auth.currentRole();
    return role === 'MANAGER' || role === 'ADMIN';
  });
  protected readonly isAdmin = computed(() => this.auth.currentRole() === 'ADMIN');
  protected readonly orderDetail = signal<StaffClientOrderRow | StaffSupplierOrderRow | null>(null);
  protected supplierOrders = signal<SupplierOrderResponseDTO[]>([]);

  protected readonly orderStatusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Picked up', value: 'PICKED_UP' },
    { label: 'Declined', value: 'DECLINED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected getStatusSeverity(status: string): TagSeverity {
    const s = status.toLowerCase();
    if (s.includes('pending')) return 'warn';
    if (s.includes('ready')) return 'info';
    if (s.includes('picked_up') || s.includes('resolved') || s.includes('accepted')) return 'success';
    if (s.includes('cancelled') || s.includes('declined')) return 'danger';
    return 'secondary';
  }

  protected readonly hasActiveFilters = computed(() => {
    return (
      this.loyaltyCodeFilter().trim().length > 0 ||
      this.orderDateFilter().trim().length > 0 ||
      this.orderStatusFilter().trim().length > 0
    );
  });

  protected readonly filteredRows = computed(() => {
    const loyaltyTerm = this.loyaltyCodeFilter().trim().toLowerCase();
    const selectedDate = this.orderDateFilter().trim();
    const selectedStatus = this.orderStatusFilter().trim().toUpperCase();
    const sortOrder = this.orderDateSortOrder();

    return this.rows()
      .filter((order) => {
        let matchLoyalty = false;
        if (loyaltyTerm.startsWith('#')) {
          matchLoyalty = `#${order.id}` === loyaltyTerm;
        } else {
          const isOrderIdMatch = order.id.toString() === loyaltyTerm;
          const loyaltySource = `${order.loyaltyCode ?? ''} ${order.clientId ?? ''}`.toLowerCase();
          matchLoyalty = loyaltyTerm.length === 0 || isOrderIdMatch || loyaltySource.includes(loyaltyTerm);
        }
        const matchDate =
          selectedDate.length === 0 || this.getOrderDateKey(order.createdAt) === selectedDate;
        const matchStatus =
          selectedStatus.length === 0 || this.normalizeStatus(order.status) === selectedStatus;

        return matchLoyalty && matchDate && matchStatus;
      })
      .map((order) => this.mapOrder(order))
      .sort((a, b) => sortOrder === 'desc' ? b.rawCreatedAt - a.rawCreatedAt : a.rawCreatedAt - b.rawCreatedAt);
  });

  protected readonly columns: TableColumn[] = [
    { field: 'id', header: 'Order ID', width: '8rem' },
    { field: 'clientReference', header: 'Loyalty / Client', width: '12rem', emptyValue: '—' },
    { field: 'createdAt', header: 'Created at', width: '12rem', sortValue: (row) => row['rawCreatedAt'] as number },
    { field: 'status', header: 'Status', width: '9rem' },
    { field: 'itemsCount', header: 'Items', width: '6.5rem', align: 'right' },
    { field: 'maxPickupDate', header: 'Max pickup date', width: '12rem', sortValue: (row) => row['rawMaxPickupDate'] as number },
    { field: 'totalPrice', header: 'Total', width: '9rem', align: 'right' },
  ];

  protected readonly actions: TableAction[] = [

    {
      id: 'cancel-order',
      label: '',
      icon: 'pi pi-times-circle',
      severity: 'danger',
      appearance: 'outlined',
      visible: (row) => this.canChangeOrderStatus(row),
      disabled: (row) => this.updatingOrderId() === Number(row.id),
    },
    {
      id: 'pickup-order',
      label: '',
      icon: 'pi pi-check-circle',
      severity: 'success',
      appearance: 'text',
      visible: (row) => this.canChangeOrderStatus(row),
      disabled: (row) => this.updatingOrderId() === Number(row.id),
    },
  ];

  protected readonly supplierColumns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '5rem' },
    { field: 'supplierName', header: 'Supplier', width: '12rem' },
    { field: 'status', header: 'Status', width: '8rem' },
    { field: 'creatorName', header: 'Creator', width: '12rem' },
    { field: 'createdAt', header: 'Created at', width: '12rem', sortValue: (row) => row['rawCreatedAt'] as number },
  ];

  protected readonly supplierStatusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Declined', value: 'DECLINED' },
  ];

  protected readonly hasActiveSupplierFilters = computed(() => {
    return (
      this.supplierNameFilter().trim().length > 0 ||
      this.supplierCreatorFilter().trim().length > 0 ||
      this.supplierDateFilter().trim().length > 0 ||
      this.supplierStatusFilter().trim().length > 0
    );
  });

  protected readonly filteredSupplierRows = computed(() => {
    const rows = this.supplierRows();
    if (!rows) return [];
    const supplierTerm = this.supplierNameFilter().trim().toLowerCase();
    const creatorTerm = this.supplierCreatorFilter().trim().toLowerCase();
    const selectedDate = this.supplierDateFilter().trim();
    const selectedStatus = this.supplierStatusFilter().trim().toUpperCase();
    const sortOrder = this.supplierDateSortOrder();

    return rows.filter((order) => {
      let matchSupplier = false;
      if (supplierTerm.startsWith('#')) {
        matchSupplier = `#${order.id}` === supplierTerm;
      } else {
        const isOrderIdMatch = order.id.toString() === supplierTerm;
        matchSupplier = supplierTerm.length === 0 || isOrderIdMatch || order.supplierName.toLowerCase().includes(supplierTerm);
      }
      const matchCreator =
        creatorTerm.length === 0 || order.creatorName.toLowerCase().includes(creatorTerm);
      const matchDate = selectedDate.length === 0 || order.createdAtKey === selectedDate;
      const matchStatus =
        selectedStatus.length === 0 || this.normalizeStatus(order.status) === selectedStatus;

      return matchSupplier && matchCreator && matchDate && matchStatus;
    }).sort((a, b) => sortOrder === 'desc' ? b.rawCreatedAt - a.rawCreatedAt : a.rawCreatedAt - b.rawCreatedAt);
  });

  protected toggleOrderDateSort(): void {
    this.orderDateSortOrder.update(o => o === 'desc' ? 'asc' : 'desc');
  }

  protected toggleSupplierDateSort(): void {
    this.supplierDateSortOrder.update(o => o === 'desc' ? 'asc' : 'desc');
  }

  protected readonly supplierActions: TableAction[] = [
    {
      id: 'resolve-accepted',
      label: '',
      icon: 'pi pi-check',
      severity: 'success',
      appearance: 'outlined',
      visible: (row) => this.canResolveSupplierOrder(row),
      disabled: (row) => this.supplierUpdatingOrderId() === Number(row.id),
    },
    {
      id: 'resolve-declined',
      label: '',
      icon: 'pi pi-times',
      severity: 'warn',
      appearance: 'text',
      visible: (row) => this.canResolveSupplierOrder(row),
      disabled: (row) => this.supplierUpdatingOrderId() === Number(row.id),
    },
  ];

  constructor() {
    this.loadOrders();
    this.loadSupplierOrders();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const view = params.get('view');
      if (view === 'supplier' || view === 'client') {
        this.view.set(view as OrdersView);
      }
      const orderId = params.get('orderId');
      if (orderId) {
        if (this.view() === 'client') {
          this.loyaltyCodeFilter.set(orderId);
        } else {
          this.supplierNameFilter.set(orderId);
        }
      }
    });
  }

  protected selectView(nextView: OrdersView): void {
    this.view.set(nextView);

    if (nextView === 'supplier') {
      this.loadSupplierOrders();
    }
  }

  protected onLoyaltyCodeFilterChange(rawValue: string): void {
    this.loyaltyCodeFilter.set(rawValue);
  }

  protected onOrderDateFilterChange(rawValue: string): void {
    this.orderDateFilter.set(rawValue);
  }

  protected onOrderStatusFilterChange(rawValue: string): void {
    const normalizedValue = rawValue.toUpperCase();

    if (normalizedValue === '') {
      this.orderStatusFilter.set('');
      return;
    }

    if (['PENDING', 'PICKED_UP', 'DECLINED', 'CANCELLED'].includes(normalizedValue)) {
      this.orderStatusFilter.set(normalizedValue);
    }
  }

  protected onSupplierNameFilterChange(rawValue: string): void {
    this.supplierNameFilter.set(rawValue);
  }

  protected onSupplierCreatorFilterChange(rawValue: string): void {
    this.supplierCreatorFilter.set(rawValue);
  }

  protected onSupplierDateFilterChange(rawValue: string): void {
    this.supplierDateFilter.set(rawValue);
  }

  protected onSupplierStatusFilterChange(rawValue: string): void {
    const normalizedValue = rawValue.toUpperCase();

    if (normalizedValue === '') {
      this.supplierStatusFilter.set('');
      return;
    }

    if (['PENDING', 'ACCEPTED', 'DECLINED'].includes(normalizedValue)) {
      this.supplierStatusFilter.set(normalizedValue);
    }
  }

  protected clearFilters(): void {
    this.loyaltyCodeFilter.set('');
    this.orderDateFilter.set('');
    this.orderStatusFilter.set('');
  }

  protected clearSupplierFilters(): void {
    this.supplierNameFilter.set('');
    this.supplierCreatorFilter.set('');
    this.supplierDateFilter.set('');
    this.supplierStatusFilter.set('');
  }

  protected handleSupplierAction(event: TableActionEvent): void {
    const orderId = Number(event.row.id);
    const row = event.row as StaffSupplierOrderRow;

    if (Number.isFinite(orderId) === false) {
      this.supplierErrorMessage.set('Invalid supplier order id.');
      return;
    }

    if (this.supplierUpdatingOrderId() !== null) {
      return;
    }

    const actionId = event.action.id;
    this.supplierErrorMessage.set(null);
    this.supplierSuccessMessage.set(null);
    this.supplierUpdatingOrderId.set(orderId);

    const validatorId = this.auth.currentUser()?.id;

    if (typeof validatorId !== 'number') {
      this.supplierUpdatingOrderId.set(null);
      this.supplierErrorMessage.set(
        'A valid validator user is required to resolve supplier orders.',
      );
      return;
    }

    const status = actionId === 'resolve-accepted' ? 'ACCEPTED' : 'DECLINED';

    this.supplierOrdersService
      .resolveSupplierOrder(orderId, validatorId, status)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.supplierUpdatingOrderId.set(null)),
      )
      .subscribe({
        next: (resolvedOrder) => {
          this.supplierRows.update((rows) =>
            rows.map((row) => (row.id === orderId ? this.mapSupplierOrder(resolvedOrder) : row)),
          );
          this.supplierSuccessMessage.set(`Supplier order #${orderId} resolved as ${status}.`);
          this.messageService.add({
            severity: status === 'ACCEPTED' ? 'success' : 'warn',
            summary: status === 'ACCEPTED' ? 'Order Accepted' : 'Order Declined',
            detail: `Supplier order #${orderId} has been ${status.toLowerCase()}.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.supplierErrorMessage.set(getErrorMessage(err, 'Could not resolve supplier order.'));
        },
      });
  }

  // Tener en cuenta que para hacer un pick up, tiene que estar la caja abierta.
  protected handleAction(event: TableActionEvent): void {
    const orderId = Number(event.row.id);
    const row = event.row as unknown as StaffClientOrderRow;

    if (Number.isFinite(orderId) === false) {
      this.errorMessage.set('Invalid order id.');
      return;
    }

    if (this.updatingOrderId() !== null) {
      return;
    }


    const actionId = event.action.id;
    if (actionId !== 'cancel-order' && actionId !== 'pickup-order') {
      return;
    }

    this.errorMessage.set(null);
    this.updatingOrderId.set(orderId);

    const request =
      actionId === 'cancel-order'
        ? this.ordersService.cancelOrder(orderId)
        : this.ordersService.pickUpOrder(orderId);

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingOrderId.set(null)),
      )
      .subscribe({
        next: (updatedOrder) => {
          this.rows.update((orders) =>
            orders.map((order) => (order.id === orderId ? updatedOrder : order)),
          );
          const isPickup = actionId === 'pickup-order';
          this.messageService.add({
            severity: isPickup ? 'success' : 'error',
            summary: isPickup ? 'Order Picked Up' : 'Order Cancelled',
            detail: `Order #${orderId} has been successfully ${isPickup ? 'marked as picked up' : 'cancelled'}.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.errorMessage.set(
            getErrorMessage(err, 'Could not update order status, you might not have a cash register open.')
          );
        },
      });
  }

  protected handleRowClick(event: TableRowClickEvent): void {
    const row = event.row as unknown as StaffClientOrderRow;
    this.orderDetail.set(row);
  }

  protected handleSupplierRowClick(event: any): void {
    this.orderDetail.set(event.row);
  }

  private loadOrders(): void {
    this.loadingOrders.set(true);
    this.errorMessage.set(null);

    this.ordersService
      .getAllOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          const visibleOrders = this.filterOrdersByRole(orders);
          this.rows.set(visibleOrders);
          this.loadingOrders.set(false);
        },
        error: () => {
          this.rows.set([]);
          this.loadingOrders.set(false);
          this.errorMessage.set('Could not load orders.');
        },
      });
  }

  private loadSupplierOrders(): void {
    this.supplierLoading.set(true);

    this.supplierOrdersService
      .getSupplierOrders()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.supplierLoading.set(false)),
      )
      .subscribe({
        next: (orders) => {
          const visibleOrders = this.filterSupplierOrdersByRole(orders);
          this.supplierOrders.set(visibleOrders);
          this.supplierRows.set(visibleOrders?.map((order) => this.mapSupplierOrder(order)));
        },
        error: () => {
          this.supplierErrorMessage.set('Could not load supplier orders.');
          this.supplierRows.set([]);
        },
      });
  }

  // TO-DO: Use the ticket creation date to filter orders
  private filterOrdersByRole(orders: OrderResponseDTO[]): OrderResponseDTO[] {
    if (this.isEmployee()) {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      return orders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        if (Number.isNaN(createdAt.getTime())) {
          return false;
        }

        return createdAt >= twoWeeksAgo;
      });
    }

    return orders;
  }

  private mapOrder(order: OrderResponseDTO): StaffClientOrderRow {
    const rawStatus = this.normalizeStatus(order.status);
    const clientReference = this.getClientReference(order);

    return {
      id: order.id,
      rawStatus,
      clientReference,
      createdAt: this.formatDate(order.createdAt),
      rawCreatedAt: new Date(order.createdAt).getTime(),
      totalPrice: this.formatCurrency(order.totalPrice),
      status: this.formatStatusLabel(rawStatus),
      maxPickupDate: this.formatDate(order.maxPickupDate),
      rawMaxPickupDate: order.maxPickupDate ? new Date(order.maxPickupDate).getTime() : 0,
      itemsCount: order.details?.length ?? 0,
      details: (order.details || []).map(d => ({
        ...d,
        unitPrice: d.salePrice // Normalize to unitPrice for the template
      })),
    };
  }

  private mapSupplierOrder(order: SupplierOrderResponseDTO): StaffSupplierOrderRow {
    return {
      id: order.id,
      creatorId: order.creatorId,
      supplierName: order.supplierName,
      status: String(order.status ?? '-'),
      creatorName: order.creatorName,
      validatorName: order.validatorName ?? '-',
      createdAtKey: this.getOrderDateKey(order.createdAt),
      createdAt: this.formatDate(order.createdAt),
      rawCreatedAt: new Date(order.createdAt).getTime(),
      resolvedAt: this.formatDate(order.resolvedAt ?? undefined),
      totalPrice: this.formatCurrency(order.totalPrice),
      details: (order.details || []).map(d => ({
        ...d,
        unitPrice: d.costPrice // Normalize to unitPrice for the template
      })),
    };
  }

  private filterSupplierOrdersByRole(
    orders: SupplierOrderResponseDTO[],
  ): SupplierOrderResponseDTO[] {
    const role = this.auth.currentRole();

    if (role === 'EMPLOYEE') {
      const userId = this.auth.currentUser()?.id;

      if (typeof userId === 'number') {
        return orders.filter((order) => order.creatorId === userId);
      }

      return [];
    }

    return orders;
  }

  private canResolveSupplierOrder(row: TableRow): boolean {
    const status = row['status'];

    if (this.isManagerOrAdmin() === false) {
      return false;
    }

    if (this.auth.currentRole() === 'MANAGER') {
      const currentUserId = this.auth.currentUser()?.id;
      if (row['creatorId'] === currentUserId) {
        return false;
      }
    }

    if (typeof status === 'string') {
      return status.toUpperCase() === 'PENDING';
    }

    return false;
  }

  private canChangeOrderStatus(row: TableRow): boolean {
    const candidateStatus = row['rawStatus'];

    if (typeof candidateStatus === 'string') {
      return candidateStatus.toUpperCase() === 'PENDING';
    }

    return false;
  }

  private normalizeStatus(value: string | undefined): string {
    if (typeof value === 'string' && value.length > 0) {
      return value.toUpperCase();
    }

    return '-';
  }

  private formatStatusLabel(status: string): string {
    if (status === 'PENDING') {
      return 'Pending';
    }

    if (status === 'PICKED_UP') {
      return 'Picked up';
    }

    if (status === 'DECLINED') {
      return 'Declined';
    }

    if (status === 'CANCELLED') {
      return 'Cancelled';
    }

    return status;
  }

  private formatDate(value: string | undefined): string {
    if (typeof value === 'string' && value.length > 0) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return '-';
  }

  private getOrderDateKey(value: string | undefined): string {
    if (typeof value === 'string' && value.length > 0) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '';
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    return '';
  }

  private getClientReference(order: OrderResponseDTO): string {
    if (typeof order.loyaltyCode === 'string' && order.loyaltyCode.trim().length > 0) {
      return order.loyaltyCode.trim();
    }

    if (typeof order.clientId === 'number') {
      return `#${order.clientId}`;
    }

    return '-';
  }

  private formatCurrency(value: number | undefined): string {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(value);
    }

    return '-';
  }

}
