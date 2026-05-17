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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { Table, TableAction, TableColumn } from '../../../components/table/table';
import { PaymentType, Ticket, TicketService } from '../../../services/tickets/ticket.service';

@Component({
  selector: 'app-my-tickets-page',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    Table,
  ],
  templateUrl: './my-tickets.html',
  styleUrl: './my-tickets.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyTicketsPage implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef    = inject(DestroyRef);
  private readonly datePipe      = new DatePipe('en-US');
  private readonly currencyPipe  = new CurrencyPipe('es-ES');

  protected readonly allTickets      = signal<Ticket[]>([]);
  protected readonly supplierTickets = signal<Ticket[]>([]);
  protected readonly loading         = signal(false);
  protected readonly errorMessage    = signal<string | null>(null);

  protected readonly searchCodeFilter = signal('');
  protected readonly paymentFilter    = signal<PaymentType | null>(null);

  protected readonly hasActiveFilters = computed(() =>
    this.searchCodeFilter().trim().length > 0 ||
    this.paymentFilter() !== null
  );

  protected readonly filteredAllTickets      = computed(() => this.applyFilters(this.allTickets()));
  protected readonly filteredSupplierTickets = computed(() => this.applyFilters(this.supplierTickets()));

  /** Today's date formatted for display in the header */
  protected readonly todayLabel = this.datePipe.transform(new Date(), 'EEEE, MMMM d, y') ?? '';

  /** Total revenue from today's client tickets */
  protected readonly todayRevenue = computed(() =>
    this.allTickets().reduce((sum, t) => sum + (t.totalPrice ?? 0), 0)
  );

  /** Count of today's client tickets */
  protected readonly todayCount = computed(() => this.allTickets().length);

  // ── Table columns ─────────────────────────────────────────────────────────
  protected readonly allTicketsColumns: TableColumn[] = [
    { field: 'code',           header: 'Code' },
    { field: 'date',           header: 'Time',         formatter: (v) => this.datePipe.transform(v as string, 'HH:mm') ?? '—' },
    { field: 'cashRegisterId', header: 'Register ID' },
    { field: 'clientName',     header: 'Client',       emptyValue: '—' },
    { field: 'type',           header: 'Type' },
    { field: 'paymentType',    header: 'Payment' },
    { field: 'isOnline',       header: 'Origin',       formatter: (v) => v ? 'Online' : 'In-person' },
    { field: 'totalPrice',     header: 'Total',        align: 'right', formatter: (v) => this.currencyPipe.transform(v as number, 'EUR') ?? '—' },
  ];

  protected readonly supplierColumns: TableColumn[] = [
    { field: 'code',           header: 'Code' },
    { field: 'date',           header: 'Time',     formatter: (v) => this.datePipe.transform(v as string, 'HH:mm') ?? '—' },
    { field: 'cashRegisterId', header: 'Register ID' },
    { field: 'paymentType',    header: 'Payment' },
    { field: 'totalPrice',     header: 'Total',   align: 'right', formatter: (v) => this.currencyPipe.transform(v as number, 'EUR') ?? '—' },
  ];

  protected readonly actions: TableAction[] = [];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTodayTickets();
  }

  private loadTodayTickets(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.ticketService
      .getAllTickets()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (res) => {
          const todayTickets = this.filterByToday(res ?? []);
          this.allTickets.set(todayTickets.filter(t => t.type !== 'SUPPLIER'));
          this.supplierTickets.set(todayTickets.filter(t => t.type === 'SUPPLIER'));
        },
        error: () => {
          this.allTickets.set([]);
          this.supplierTickets.set([]);
          this.errorMessage.set('Could not load today\'s tickets.');
        },
      });
  }

  /**
   * Keeps only tickets whose `date` falls on today's calendar date (local time).
   */
  private filterByToday(tickets: Ticket[]): Ticket[] {
    const now   = new Date();
    const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    return tickets.filter(t => {
      const d = new Date(t.date);
      const ticketDay = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return ticketDay === today;
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  protected onSearchCodeFilterChange(rawValue: string): void {
    this.searchCodeFilter.set(rawValue);
  }

  protected onPaymentFilterChange(rawValue: string): void {
    this.paymentFilter.set(
      rawValue === 'CASH' || rawValue === 'CARD'
        ? rawValue as PaymentType
        : null
    );
  }

  private applyFilters(tickets: Ticket[]): Ticket[] {
    const codeTerm        = this.searchCodeFilter().trim().toLowerCase();
    const selectedPayment = this.paymentFilter();

    return tickets.filter(t => {
      const matchCode    = codeTerm.length === 0 || t.code.toLowerCase().includes(codeTerm);
      const matchPayment = selectedPayment === null || t.paymentType === selectedPayment;
      return matchCode && matchPayment;
    });
  }

  protected clearFilters(): void {
    this.searchCodeFilter.set('');
    this.paymentFilter.set(null);
  }
}