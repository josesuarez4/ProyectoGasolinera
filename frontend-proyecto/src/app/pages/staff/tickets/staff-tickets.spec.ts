import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { StaffTicketsPage } from './staff-tickets';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Ticket, TicketService } from '../../../services/tickets/ticket.service';
import { MessageService } from 'primeng/api';
import { UserService } from '../../../services/users/user.service';

beforeAll(() => {
  registerLocaleData(localeEs);
});

describe('StaffTicketsPage', () => {
  let ticketService: jest.Mocked<TicketService>;

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
      date: '2026-04-10T10:30:00',
      type: 'SALE',
      totalPrice: 45.5,
      isOnline: false,
      paymentType: 'CARD',
    },
    {
      id: 10,
      employeeId: 1,
      employeeName: 'Ana García',
      cashRegisterId: 1,
      clientId: null,
      clientName: null,
      onlineOrderId: null,
      code: 'TKT-00000010',
      date: '2026-04-05T08:00:00',
      type: 'SUPPLIER',
      totalPrice: 1200.0,
      isOnline: false,
      paymentType: 'CASH',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StaffTicketsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        {
          provide: TicketService,
          useValue: {
            getAllTickets: jest.fn(),
            getAllTicketsMock: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserSummary: jest.fn().mockReturnValue(of({})),
            getUsers: jest.fn().mockReturnValue(of([])),
          },
        },
        MessageService,
      ],
    });

    ticketService = TestBed.inject(TicketService) as jest.Mocked<TicketService>;
  });

  const createComponent = () => {
    const fixture = TestBed.createComponent(StaffTicketsPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  // ── ngOnInit ──────────────────────────────────────────────────────────────

  it('should split tickets into allTickets and supplierTickets on init', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();

    expect(ticketService.getAllTickets).toHaveBeenCalled();

    expect(component.allTickets()).toHaveLength(1); // no SUPPLIER
    expect(component.supplierTickets()).toHaveLength(1); // only SUPPLIER
  });

  it('should set empty arrays when backend returns null', () => {
    ticketService.getAllTickets.mockReturnValue(of(null as any));

    const component = createComponent();

    expect(component.allTickets()).toEqual([]);
    expect(component.supplierTickets()).toEqual([]);
  });

  it('should fallback to empty arrays when getAllTickets fails', () => {
    ticketService.getAllTickets.mockReturnValue(throwError(() => new Error('Error')));

    const component = createComponent();

    expect(ticketService.getAllTickets).toHaveBeenCalled();
    expect(component.allTickets()).toEqual([]);
    expect(component.supplierTickets()).toEqual([]);
  });

  it('should handle null response from backend without crashing', () => {
    ticketService.getAllTickets.mockReturnValue(of(null as any));

    const component = createComponent();

    expect(component.allTickets()).toEqual([]);
    expect(component.supplierTickets()).toEqual([]);
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
    ticketService.getAllTickets.mockReturnValue(
      of([
        ...mockTickets,
        {
          id: 2,
          employeeId: 1,
          employeeName: 'Ana',
          cashRegisterId: 1,
          clientId: 1,
          clientName: 'Carlos',
          onlineOrderId: null,
          code: 'TKT-00000002',
          date: '2026-04-11T10:00:00',
          type: 'RETURN',
          totalPrice: 20.0,
          isOnline: false,
          paymentType: 'CASH',
        },
      ]),
    );

    const component = createComponent();
    component['paymentFilter'].set('CARD');

    expect(component['filteredAllTickets']().every((t) => t['paymentType'] === 'CARD')).toBe(true);
  });

  it('filteredAllTickets — should filter by online origin', () => {
    ticketService.getAllTickets.mockReturnValue(
      of([
        ...mockTickets,
        {
          id: 3,
          employeeId: 1,
          employeeName: 'Ana',
          cashRegisterId: 1,
          clientId: 1,
          clientName: 'Carlos',
          onlineOrderId: 1,
          code: 'TKT-00000003',
          date: '2026-04-12T10:00:00',
          type: 'SALE',
          totalPrice: 30.0,
          isOnline: true,
          paymentType: 'CARD',
        },
      ]),
    );

    const component = createComponent();
    component['onlineFilter'].set(true);

    expect(component['filteredAllTickets']().every((t) => t['isOnline'] === true)).toBe(true);
  });

  // ── clearFilters ──────────────────────────────────────────────────────────

  it('clearFilters — should reset all filters', () => {
    ticketService.getAllTickets.mockReturnValue(of(mockTickets));

    const component = createComponent();
    component['searchCodeFilter'].set('TKT-00000001');
    component['paymentFilter'].set('CARD');
    component['onlineFilter'].set(false);

    component['clearFilters']();

    expect(component['searchCodeFilter']()).toBe('');
    expect(component['paymentFilter']()).toBeNull();
    expect(component['onlineFilter']()).toBeNull();
  });
});
