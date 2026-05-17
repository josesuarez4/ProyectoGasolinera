import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { PaymentType, Ticket, TicketService } from '../../../services/tickets/ticket.service';
import { AuthService } from '../../../services/auth/auth.service';
import { Table, TableColumn, TableRow, TableRowClickEvent } from '../../../components/table/table';
import { DialogModule } from 'primeng/dialog';
import { DetailView } from '../../../components/detail-view/detail-view';

@Component({
  selector: 'app-my-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, InputTextModule, Table, DialogModule, DetailView],
  templateUrl: './my-invoices.html',
  styleUrl: './my-invoices.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInvoices implements OnInit {

  private readonly ticketService = inject(TicketService);
  private readonly authService = inject(AuthService);
  private readonly datePipe = new DatePipe('en-US');
  private readonly currencyPipe = new CurrencyPipe('es-ES');

  tickets = signal<Ticket[]>([]);
  selectedInvoice = signal<Ticket | null>(null);

  searchCode = '';
  filterPayment = signal<PaymentType | null>(null);
  filterOnline = signal<boolean | null>(null);

  paymentOptions = [
    { label: 'All payments', value: null },
    { label: 'Cash', value: 'CASH' },
    { label: 'Card', value: 'CARD' },
  ];

  onlineOptions = [
    { label: 'All origins', value: null },
    { label: 'Online', value: true },
    { label: 'In-person', value: false },
  ];

  readonly columns: TableColumn[] = [
    { field: 'code', header: 'Code' },
    { field: 'date', header: 'Date', formatter: (v) => this.datePipe.transform(v as string, 'dd/MM/yyyy HH:mm') ?? '—' },
    { field: 'type', header: 'Type' },
    { field: 'paymentType', header: 'Payment' },
    { field: 'isOnline', header: 'Origin', formatter: (v) => v ? 'Online' : 'In-person' },
    { field: 'totalPrice', header: 'Total', align: 'right', formatter: (v) => this.currencyPipe.transform(v as number, 'EUR') ?? '—' },
  ];

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user?.id) {
      this.tickets.set([]);
      return;
    }

    this.ticketService.getClientTickets(user.id).subscribe({
      next: t => this.tickets.set(t ?? []),
      error: () => this.tickets.set([]),
    });
  }


  get filteredTickets(): TableRow[] {
    return this.tickets().filter(t => {
      const matchCode = !this.searchCode || t.code.toLowerCase().includes(this.searchCode.toLowerCase());
      const matchPayment = !this.filterPayment() || t.paymentType === this.filterPayment();
      const matchOnline = this.filterOnline() === null || t.isOnline === this.filterOnline();
      return matchCode && matchPayment && matchOnline;
    }) as TableRow[];
  }

  clearFilters(): void {
    this.searchCode = '';
    this.filterPayment.set(null);
    this.filterOnline.set(null);
  }

  handleRowClick(event: TableRowClickEvent): void {
    const ticket = event.row as Ticket;
    this.ticketService.getTicketDetails(ticket.id).subscribe({
      next: details => this.selectedInvoice.set({ ...ticket, details }),
      error: () => this.selectedInvoice.set({ ...ticket, details: [] }),
    });
  }

}