import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { Table, TableAction, TableColumn } from '../../../components/table/table';
import { PaymentType, Ticket, TicketService } from '../../../services/tickets/ticket.service';
import { AdminUserRecord, UserService } from '../../../services/users/user.service';
import { DetailView } from '../../../components/detail-view/detail-view';
import { GenericForm, FormFieldConfig } from '../../../components/generic-form/generic-form';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-staff-tickets-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    Table,
    GenericForm,
    DetailView,
  ],
  templateUrl: './staff-tickets.html',
  styleUrl: './staff-tickets.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffTicketsPage implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = new DatePipe('en-US');
  private readonly currencyPipe = new CurrencyPipe('es-ES');

  protected readonly allTickets = signal<Ticket[]>([]);
  protected readonly supplierTickets = signal<Ticket[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);

  protected readonly searchCodeFilter = signal('');
  protected readonly paymentFilter = signal<PaymentType | null>(null);
  protected readonly onlineFilter = signal<boolean | null>(null);
  protected readonly dateFilter = signal('');
  protected readonly dateSortOrder = signal<'asc' | 'desc'>('desc');

  protected readonly hasActiveFilters = computed(
    () =>
      this.searchCodeFilter().trim().length > 0 ||
      this.paymentFilter() !== null ||
      this.onlineFilter() !== null ||
      this.dateFilter().trim().length > 0,
  );

  protected readonly filteredAllTickets = computed(() => this.applyFilters(this.allTickets()));
  protected readonly filteredSupplierTickets = computed(() =>
    this.applyFilters(this.supplierTickets()),
  );

  // ── Edit dialog ──────────────────────────────────────────────────────────
  protected readonly showDialog = signal(false);
  protected readonly ticketToEdit = signal<Ticket | null>(null);
  protected readonly ticketDetails = signal<Ticket | null>(null);

  protected readonly ticketFormConfig = computed<FormFieldConfig[]>(() => [
    {
      key: 'paymentType',
      label: 'Payment',
      type: 'select',
      options: [
        { label: 'Cash', value: 'CASH' },
        { label: 'Card', value: 'CARD' },
      ],
      colSpan: this.ticketToEdit()?.type === 'SUPPLIER' ? 'col-12' : 'col-6',
    },
    {
      key: 'clientName',
      label: 'Client Name',
      type: 'text',
      placeholder: 'Enter client name...',
      colSpan: 'col-6',
      showIf: () => this.ticketToEdit()?.type !== 'SUPPLIER',
    },
    {
      key: 'totalPrice',
      label: 'Total Price (€)',
      type: 'currency',
      colSpan: 'col-12',
      showIf: () => this.ticketToEdit()?.type === 'SUPPLIER',
    },
  ]);

  protected get isSupplier(): boolean {
    return this.ticketToEdit()?.type === 'SUPPLIER';
  }

  // ── Autocomplete clientes ─────────────────────────────────────────────────
  private readonly allClients = signal<AdminUserRecord[]>([]);
  protected readonly clientSuggestions = signal<string[]>([]);

  protected readonly editPaymentOptions = [
    { label: 'Cash', value: 'CASH' },
    { label: 'Card', value: 'CARD' },
  ];

  // ── Table columns ─────────────────────────────────────────────────────────
  protected readonly allTicketsColumns: TableColumn[] = [
    { field: 'code', header: 'Code' },
    {
      field: 'date',
      header: 'Date',
      sortValue: (row) => new Date((row as any)['date']).getTime(),
      formatter: (v: unknown) => this.datePipe.transform(v as string, 'dd/MM/yyyy HH:mm') ?? '—',
    },
    { field: 'cashRegisterId', header: 'Register ID' },
    { field: 'employeeName', header: 'Employee' },
    { field: 'clientName', header: 'Client', emptyValue: '—' },
    { field: 'type', header: 'Type' },
    { field: 'paymentType', header: 'Payment' },
    { field: 'isOnline', header: 'Origin', formatter: (v: unknown) => (v ? 'Online' : 'In-person') },
    {
      field: 'totalPrice',
      header: 'Total',
      align: 'right',
      formatter: (v: unknown) => this.currencyPipe.transform(v as number, 'EUR') ?? '—',
    },
  ];

  protected readonly supplierColumns: TableColumn[] = [
    { field: 'code', header: 'Code' },
    {
      field: 'date',
      header: 'Date',
      sortValue: (row) => new Date((row as any)['date']).getTime(),
      formatter: (v: unknown) => this.datePipe.transform(v as string, 'dd/MM/yyyy HH:mm') ?? '—',
    },
    { field: 'cashRegisterId', header: 'Register ID' },
    { field: 'employeeName', header: 'Employee' },
    { field: 'paymentType', header: 'Payment' },
    {
      field: 'totalPrice',
      header: 'Total',
      align: 'right',
      formatter: (v: unknown) => this.currencyPipe.transform(v as number, 'EUR') ?? '—',
    },
  ];

  protected readonly actions: TableAction[] = [
    {
      id: 'edit',
      label: '',
      icon: 'pi pi-pencil',
      severity: 'info',
      appearance: 'outlined',
    },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTickets();
    this.loadClients();
  }

  private loadTickets(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.ticketService
      .getAllTickets()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          const tickets = res ?? [];
          this.allTickets.set(tickets.filter((t) => t.type !== 'SUPPLIER'));
          this.supplierTickets.set(tickets.filter((t) => t.type === 'SUPPLIER'));
        },
        error: () => {
          this.allTickets.set([]);
          this.supplierTickets.set([]);
          this.errorMessage.set('Could not load tickets.');
        },
      });
  }

  private loadClients(): void {
    this.userService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        this.allClients.set(users.filter((user) => user.role === 'CLIENT'));
      });
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  protected onSearchCodeFilterChange(rawValue: string): void {
    this.searchCodeFilter.set(rawValue);
  }

  protected onPaymentFilterChange(rawValue: string): void {
    if (rawValue === 'CASH' || rawValue === 'CARD') {
      this.paymentFilter.set(rawValue);
      return;
    }

    this.paymentFilter.set(null);
  }

  protected onOnlineFilterChange(rawValue: string): void {
    if (rawValue === 'true') {
      this.onlineFilter.set(true);
      return;
    }

    if (rawValue === 'false') {
      this.onlineFilter.set(false);
      return;
    }

    this.onlineFilter.set(null);
  }

  protected onDateFilterChange(rawValue: string): void {
    this.dateFilter.set(rawValue);
  }

  private applyFilters(tickets: Ticket[]): Ticket[] {
    const codeTerm = this.searchCodeFilter().trim().toLowerCase();
    const selectedPayment = this.paymentFilter();
    const selectedOnline = this.onlineFilter();
    const selectedDate = this.dateFilter().trim();
    const sortOrder = this.dateSortOrder();

    return tickets
      .filter((t) => {
        const matchCode = codeTerm.length === 0 || t.code.toLowerCase().includes(codeTerm);
        const matchPayment = selectedPayment === null || t.paymentType === selectedPayment;
        const matchOnline = selectedOnline === null || t.isOnline === selectedOnline;
        const ticketDate = t.date ? t.date.substring(0, 10) : '';
        const matchDate = selectedDate.length === 0 || ticketDate === selectedDate;
        return matchCode && matchPayment && matchOnline && matchDate;
      })
      .sort((a, b) => {
        const aTs = a.date ? new Date(a.date).getTime() : 0;
        const bTs = b.date ? new Date(b.date).getTime() : 0;
        return sortOrder === 'desc' ? bTs - aTs : aTs - bTs;
      });
  }

  protected toggleDateSort(): void {
    this.dateSortOrder.update((o) => (o === 'desc' ? 'asc' : 'desc'));
  }

  protected clearFilters(): void {
    this.searchCodeFilter.set('');
    this.paymentFilter.set(null);
    this.onlineFilter.set(null);
    this.dateFilter.set('');
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  handleAction(event: any): void {
    if (event.action.id === 'edit') {
      this.editTicket(event.row as Ticket);
    }
  }

  protected handleRowClick(event: any): void {
    this.viewDetails(event.row as Ticket);
  }

  protected viewDetails(ticket: Ticket): void {
    this.ticketService
      .getTicketDetails(ticket.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => this.ticketDetails.set({ ...ticket, details }),
        error: () => this.ticketDetails.set({ ...ticket, details: [] }),
      });
  }

  protected editTicket(ticket: Ticket): void {
    this.ticketService
      .getTicketDetails(ticket.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => this.openDialog({ ...ticket, details }),
        error: () => this.openDialog({ ...ticket, details: [] }),
      });
  }

  private openDialog(ticket: Ticket): void {
    this.ticketToEdit.set(ticket);
    this.errorMessage.set(null);
    this.showDialog.set(true);
  }

  protected onClientClear(): void {
    this.showDialog.set(false);
    this.ticketToEdit.set(null);
  }

  protected onSaveTicket(formData: any): void {
    const ticket = this.ticketToEdit();
    if (!ticket?.id) return;

    // Resolve clientId if name changed and we find a match
    let clientId = ticket.clientId;
    if (formData.clientName && formData.clientName !== ticket.clientName) {
      const found = this.allClients().find((c) => c.name === formData.clientName);
      clientId = found?.id ?? null;
    } else if (!formData.clientName) {
      clientId = null;
    }

    const payload: Ticket = {
      ...ticket,
      paymentType: formData.paymentType,
      clientId: clientId,
      clientName: formData.clientName || null,
      totalPrice: formData.totalPrice ?? ticket.totalPrice,
    };

    this.errorMessage.set(null);
    this.statusMessage.set('Saving...');

    this.ticketService
      .updateTicket(ticket.id, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.statusMessage.set(null))
      )
      .subscribe({
        next: () => {
          this.showDialog.set(false);
          const code = this.ticketToEdit()?.code;
          this.ticketToEdit.set(null);
          this.statusMessage.set('Ticket updated successfully.');
          this.messageService.add({
            severity: 'warn',
            summary: 'Ticket Updated',
            detail: `Ticket #${code} has been updated.`,
            life: 3000,
          });
          this.loadTickets();
        },
        error: (err: any) => {
          let msg = 'Error saving ticket: ';
          if (err.status === 400 && err.error?.errors) {
            msg += Object.entries(err.error.errors)
              .map(([f, m]) => `${f}: ${m}`)
              .join(' | ');
          } else if (err.error?.message) {
            msg += err.error.message;
          } else {
            msg += 'Check all fields and try again.';
          }
          this.errorMessage.set(msg);
          this.statusMessage.set(null);
        },
      });
  }
}
