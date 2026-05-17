import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { MyInvoices } from './my-invoices';
import { AuthService } from '../../../services/auth/auth.service';
import { Ticket, TicketService } from '../../../services/tickets/ticket.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

beforeAll(() => {
  registerLocaleData(localeEs);
});

describe('MyInvoices', () => {
  let ticketService: jest.Mocked<TicketService>;
  let authService:   jest.Mocked<AuthService>;

  const mockTickets: Ticket[] = [
    {
      id: 1, employeeId: 1, employeeName: 'Ana García',
      cashRegisterId: 1, clientId: 1, clientName: 'Carlos López',
      onlineOrderId: null, code: 'TKT-00000001',
      date: '2026-04-10T10:30:00', type: 'SALE',
      totalPrice: 45.50, isOnline: false, paymentType: 'CARD',
    },
    {
      id: 2, employeeId: 1, employeeName: 'Ana García',
      cashRegisterId: 1, clientId: 1, clientName: 'Carlos López',
      onlineOrderId: 5, code: 'TKT-00000002',
      date: '2026-04-15T14:00:00', type: 'RETURN',
      totalPrice: 12.00, isOnline: true, paymentType: 'CASH',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyInvoices],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        {
          provide: TicketService,
          useValue: {
            getClientTickets:     jest.fn(),
            getClientTicketsMock: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: jest.fn().mockReturnValue({ id: 1, email: 'client@correo.com', name: 'Carlos', role: 'CLIENT', exp: 9999999999 }),
            currentRole: jest.fn().mockReturnValue('CLIENT'),
            isAuthenticated: jest.fn().mockReturnValue(true),
          },
        },
      ],
    });

    ticketService = TestBed.inject(TicketService) as jest.Mocked<TicketService>;
    authService   = TestBed.inject(AuthService)   as jest.Mocked<AuthService>;
  });

  const createComponent = () => {
    const fixture = TestBed.createComponent(MyInvoices);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  // ── ngOnInit ──────────────────────────────────────────────────────────────

  it('should load client tickets on init using user id from AuthService', () => {
    ticketService.getClientTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    expect(ticketService.getClientTickets).toHaveBeenCalledWith(1);
    expect(component.tickets()).toHaveLength(2);
  });

  it('should set empty array when backend returns null', () => {
    ticketService.getClientTickets.mockReturnValue(of(null as any));

    const component = createComponent();

    expect(component.tickets()).toEqual([]);
  });

  it('should set empty array on error', () => {
    ticketService.getClientTickets.mockReturnValue(
      throwError(() => new Error('Error'))
    );

    const component = createComponent();

    expect(component.tickets()).toEqual([]);
  });

  it('should not call service when user id is null', () => {
    authService.currentUser.mockReturnValue(null as any);

    createComponent();

    expect(ticketService.getClientTickets).not.toHaveBeenCalled();
  });

  // ── filters ───────────────────────────────────────────────────────────────

  it('filteredTickets — should return all tickets when no filters applied', () => {
    ticketService.getClientTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    expect(component.filteredTickets).toHaveLength(2);
  });

  it('filteredTickets — should filter by code', () => {
    ticketService.getClientTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component.searchCode = 'TKT-00000001';

    expect(component.filteredTickets).toHaveLength(1);
    expect(component.filteredTickets[0]['code']).toBe('TKT-00000001');
  });

  it('filteredTickets — should filter by payment type CASH', () => {
    ticketService.getClientTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component.filterPayment.set('CASH');

    expect(component.filteredTickets).toHaveLength(1);
    expect(component.filteredTickets[0]['paymentType']).toBe('CASH');
  });

  it('filteredTickets — should filter by online origin', () => {
    ticketService.getClientTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component.filterOnline.set(true);

    expect(component.filteredTickets).toHaveLength(1);
    expect(component.filteredTickets[0]['isOnline']).toBe(true);
  });

  it('clearFilters — should reset all filters to default', () => {
    ticketService.getClientTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component.searchCode = 'TKT-00000001';
    component.filterPayment.set('CARD');
    component.filterOnline.set(false);

    component.clearFilters();

    expect(component.searchCode).toBe('');
    expect(component.filterPayment()).toBeNull();
    expect(component.filterOnline()).toBeNull();
  });

  it('clearFilters — should restore all tickets after clearing filters', () => {
    ticketService.getClientTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component.searchCode = 'TKT-99999999';

    expect(component.filteredTickets).toHaveLength(0);

    component.clearFilters();

    expect(component.filteredTickets).toHaveLength(2);
  });
});