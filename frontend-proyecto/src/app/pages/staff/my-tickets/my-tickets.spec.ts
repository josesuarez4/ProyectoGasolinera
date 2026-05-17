import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { MyTicketsPage } from './my-tickets';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Ticket, TicketService } from '../../../services/tickets/ticket.service';

beforeAll(() => {
  registerLocaleData(localeEs);
});

describe('MyTicketsPage', () => {
  let ticketService: jest.Mocked<TicketService>;

  // All tickets share today's date so filterByToday keeps them
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const mockTickets: Ticket[] = [
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Ana García',
      cashRegisterId: 1,
      clientId: 1,
      clientName: 'Carlos López',
      onlineOrderId: null,
      code: 'TKT-00000001',
      date: `${today}T10:30:00`,
      type: 'SALE',
      totalPrice: 45.5,
      isOnline: false,
      paymentType: 'CARD',
    },
    {
      id: 2,
      employeeId: 1,
      employeeName: 'Ana García',
      cashRegisterId: 1,
      clientId: null,
      clientName: null,
      onlineOrderId: null,
      code: 'TKT-00000002',
      date: `${today}T08:00:00`,
      type: 'SUPPLIER',
      totalPrice: 1200.0,
      isOnline: false,
      paymentType: 'CASH',
    },
  ];

  /** A ticket from a past date — must be filtered out by filterByToday */
  const oldTicket: Ticket = {
    id: 99,
    employeeId: 1,
    employeeName: 'Ana García',
    cashRegisterId: 1,
    clientId: 2,
    clientName: 'Otro Cliente',
    onlineOrderId: null,
    code: 'TKT-00000099',
    date: '2000-01-01T12:00:00',
    type: 'SALE',
    totalPrice: 10.0,
    isOnline: false,
    paymentType: 'CASH',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyTicketsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        {
          provide: TicketService,
          useValue: {
            getAllTickets: jest.fn(),
          },
        },
      ],
    });

    ticketService = TestBed.inject(TicketService) as jest.Mocked<TicketService>;
  });

  const createComponent = () => {
    const fixture = TestBed.createComponent(MyTicketsPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  // ── ngOnInit / filterByToday ───────────────────────────────────────────────

  it('should load only today\'s tickets and split into allTickets and supplierTickets', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    expect(ticketService.getAllTickets).toHaveBeenCalled();
    expect(component['allTickets']()).toHaveLength(1);      // SALE — not SUPPLIER
    expect(component['supplierTickets']()).toHaveLength(1); // SUPPLIER
  });

  it('should exclude tickets from previous days', () => {
    ticketService.getAllTickets.mockReturnValue(of([...mockTickets, oldTicket]));

    const component = createComponent();

    const allCodes = [
      ...component['allTickets'](),
      ...component['supplierTickets'](),
    ].map(t => t['code']);

    expect(allCodes).not.toContain('TKT-00000099');
    expect(allCodes).toContain('TKT-00000001');
    expect(allCodes).toContain('TKT-00000002');
  });

  it('should set empty arrays when backend returns null', () => {
    ticketService.getAllTickets.mockReturnValue(of(null as any));

    const component = createComponent();

    expect(component['allTickets']()).toEqual([]);
    expect(component['supplierTickets']()).toEqual([]);
  });

  it('should fallback to empty arrays when getAllTickets fails', () => {
    ticketService.getAllTickets.mockReturnValue(throwError(() => new Error('Network error')));

    const component = createComponent();

    expect(component['allTickets']()).toEqual([]);
    expect(component['supplierTickets']()).toEqual([]);
  });

  // ── todayRevenue ──────────────────────────────────────────────────────────

  it('todayRevenue — should sum totalPrice of non-supplier tickets', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    expect(component['todayRevenue']()).toBeCloseTo(45.5);
  });

  it('todayRevenue — should be 0 when there are no client tickets today', () => {
    ticketService.getAllTickets.mockReturnValue(of([]));

    const component = createComponent();

    expect(component['todayRevenue']()).toBe(0);
  });

  // ── todayCount ────────────────────────────────────────────────────────────

  it('todayCount — should reflect only non-supplier tickets', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    expect(component['todayCount']()).toBe(1);
  });

  // ── filters ───────────────────────────────────────────────────────────────

  it('filteredAllTickets — should filter by code', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component['searchCodeFilter'].set('TKT-00000001');

    expect(component['filteredAllTickets']()).toHaveLength(1);
    expect(component['filteredAllTickets']()[0]['code']).toBe('TKT-00000001');
  });

  it('filteredAllTickets — should return empty when code does not match', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component['searchCodeFilter'].set('TKT-99999999');

    expect(component['filteredAllTickets']()).toHaveLength(0);
  });

  it('filteredAllTickets — should filter by payment type', () => {
    const extraTicket: Ticket = {
      id: 3,
      employeeId: 1,
      employeeName: 'Ana García',
      cashRegisterId: 1,
      clientId: 3,
      clientName: 'María',
      onlineOrderId: null,
      code: 'TKT-00000003',
      date: `${today}T11:00:00`,
      type: 'SALE',
      totalPrice: 20.0,
      isOnline: false,
      paymentType: 'CASH',
    };

    ticketService.getAllTickets.mockReturnValue(of([...mockTickets, extraTicket]));

    const component = createComponent();
    component['paymentFilter'].set('CARD');

    expect(
      component['filteredAllTickets']().every(t => t['paymentType'] === 'CARD')
    ).toBe(true);
    expect(component['filteredAllTickets']()).toHaveLength(1);
  });

  it('filteredAllTickets — should return all when no filter is active', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    // SALE ticket only (SUPPLIER goes to supplierTickets)
    expect(component['filteredAllTickets']()).toHaveLength(1);
  });

  // ── hasActiveFilters ──────────────────────────────────────────────────────

  it('hasActiveFilters — should be false with no filters set', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    expect(component['hasActiveFilters']()).toBe(false);
  });

  it('hasActiveFilters — should be true when code filter is set', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component['searchCodeFilter'].set('TKT');

    expect(component['hasActiveFilters']()).toBe(true);
  });

  it('hasActiveFilters — should be true when payment filter is set', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component['paymentFilter'].set('CASH');

    expect(component['hasActiveFilters']()).toBe(true);
  });

  // ── clearFilters ──────────────────────────────────────────────────────────

  it('clearFilters — should reset all filters', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component['searchCodeFilter'].set('TKT-00000001');
    component['paymentFilter'].set('CARD');

    component['clearFilters']();

    expect(component['searchCodeFilter']()).toBe('');
    expect(component['paymentFilter']()).toBeNull();
  });
});