import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableColumn } from '../../../../components/table/table';
import { PaymentType, Ticket, TicketService } from '../../../../services/tickets/ticket.service';

@Component({
  selector: 'app-cash-register-tickets-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    SelectModule,
    InputTextModule,
    Table,
  ],
  templateUrl: './cash-register-tickets.html',
  styleUrl: './cash-register-tickets.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashRegisterTicketsPage {
  private readonly ticketService = inject(TicketService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = new DatePipe('en-US');
  private readonly currencyPipe = new CurrencyPipe('en-US');

  protected readonly cashRegisterId = signal<number | null>(null);
  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly searchCode = signal('');
  protected readonly filterPayment = signal<PaymentType | null>(null);
  protected readonly filterOnline = signal<boolean | null>(null);

  protected readonly paymentOptions = [
    { label: 'All payments', value: null },
    { label: 'Cash', value: 'CASH' },
    { label: 'Card', value: 'CARD' },
  ];

  protected readonly onlineOptions = [
    { label: 'All origins', value: null },
    { label: 'Online', value: true },
    { label: 'In-person', value: false },
  ];

  protected readonly ticketColumns: TableColumn[] = [
    { field: 'code', header: 'Code', width: '12rem' },
    {
      field: 'date',
      header: 'Date',
      width: '12rem',
      formatter: (value) => this.datePipe.transform(value as string, 'dd/MM/yyyy HH:mm') ?? '—',
    },
    { field: 'employeeName', header: 'Employee', width: '14rem' },
    { field: 'clientName', header: 'Client', width: '14rem', emptyValue: '—' },
    { field: 'type', header: 'Type', width: '10rem' },
    { field: 'paymentType', header: 'Payment', width: '10rem' },
    {
      field: 'isOnline',
      header: 'Origin',
      width: '10rem',
      formatter: (value) => (value ? 'Online' : 'In-person'),
    },
    {
      field: 'totalPrice',
      header: 'Total',
      width: '10rem',
      align: 'right',
      formatter: (value) => this.currencyPipe.transform(value as number, 'EUR') ?? '—',
    },
  ];

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const registerId = Number(params.get('cashRegisterId'));

      if (Number.isFinite(registerId)) {
        this.cashRegisterId.set(registerId);
        this.loadTickets(registerId);
        return;
      }

      this.errorMessage.set('Invalid cash register id.');
      this.tickets.set([]);
    });
  }

  protected get filteredTickets(): Ticket[] {
    return this.tickets().filter((ticket) => {
      const codeMatch =
        this.searchCode().length === 0 ||
        ticket.code.toLowerCase().includes(this.searchCode().toLowerCase());
      const paymentMatch =
        this.filterPayment() === null || ticket.paymentType === this.filterPayment();
      const onlineMatch = this.filterOnline() === null || ticket.isOnline === this.filterOnline();
      return codeMatch && paymentMatch && onlineMatch;
    });
  }

  private loadTickets(registerId: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.ticketService
      .getTicketsByCashRegister(registerId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
        },
        error: () => {
          this.errorMessage.set('Error loading tickets for this cash register.');
          this.tickets.set([]);
        },
      });
  }

  protected clearFilters(): void {
    this.searchCode.set('');
    this.filterPayment.set(null);
    this.filterOnline.set(null);
  }
}
