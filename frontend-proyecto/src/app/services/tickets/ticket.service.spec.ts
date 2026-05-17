import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TicketService, Ticket, TicketPageResponse } from './ticket.service';

describe('TicketService', () => {
  let service: TicketService;
  let http: HttpTestingController;

  const BASE_URL = 'http://localhost:8080/tickets';

  const mockTicket: Ticket = {
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
  };

  const createPage = (
    content: Ticket[],
    overrides: Partial<TicketPageResponse> = {},
  ): TicketPageResponse => ({
    content,
    totalPages: 1,
    totalElements: content.length,
    first: true,
    last: true,
    size: content.length,
    number: 0,
    numberOfElements: content.length,
    empty: content.length === 0,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TicketService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TicketService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── getAllTickets ──────────────────────────────────────────────────────────

  it('getAllTickets — should GET /tickets and return ticket array', () => {
    service.getAllTickets().subscribe((tickets) => {
      expect(tickets.length).toBe(1);
      expect(tickets[0].code).toBe('TKT-00000001');
    });

    const req = http.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush(createPage([mockTicket]));
  });

  it('getAllTickets — should return empty array when backend returns []', () => {
    service.getAllTickets().subscribe((tickets) => {
      expect(tickets).toEqual([]);
    });

    http.expectOne(BASE_URL).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('getAllTicketsPage — should GET /tickets with pagination params', () => {
    service
      .getAllTicketsPage({ page: 1, size: 25, sort: ['date,desc', 'code,asc'] })
      .subscribe((page) => {
        expect(page.number).toBe(1);
        expect(page.size).toBe(25);
        expect(page.content).toHaveLength(1);
      });

    const req = http.expectOne(
      (request) =>
        request.url === BASE_URL &&
        request.params.get('page') === '1' &&
        request.params.get('size') === '25' &&
        request.params.getAll('sort')?.length === 2,
    );

    expect(req.request.method).toBe('GET');
    req.flush(createPage([mockTicket], { number: 1, size: 25, totalPages: 3, totalElements: 60 }));
  });

  // ── getTicketById ─────────────────────────────────────────────────────────

  it('getTicketById — should GET /tickets/1', () => {
    service.getTicketById(1).subscribe((ticket) => {
      expect(ticket.id).toBe(1);
    });

    const req = http.expectOne(`${BASE_URL}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTicket);
  });

  // ── getTicketByCode ───────────────────────────────────────────────────────

  it('getTicketByCode — should GET /tickets/code/TKT-00000001', () => {
    service.getTicketByCode('TKT-00000001').subscribe((ticket) => {
      expect(ticket.code).toBe('TKT-00000001');
    });

    const req = http.expectOne(`${BASE_URL}/code/TKT-00000001`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTicket);
  });

  // ── getTicketDetails ──────────────────────────────────────────────────────

  it('getTicketDetails — should GET /tickets/1/details', () => {
    service.getTicketDetails(1).subscribe((details) => {
      expect(details).toEqual([]);
    });

    const req = http.expectOne(`${BASE_URL}/1/details`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // ── getClientTickets ──────────────────────────────────────────────────────

  it('getClientTickets — should GET /tickets/client/1', () => {
    service.getClientTickets(1).subscribe((tickets) => {
      expect(tickets[0].clientId).toBe(1);
    });

    const req = http.expectOne(`${BASE_URL}/client/1`);
    expect(req.request.method).toBe('GET');
    req.flush(createPage([mockTicket]));
  });

  it('getClientTicketsPage — should GET /tickets/client/1 with pagination params', () => {
    service.getClientTicketsPage(1, { page: 0, size: 10 }).subscribe((page) => {
      expect(page.content[0].clientId).toBe(1);
    });

    const req = http.expectOne(
      (request) =>
        request.url === `${BASE_URL}/client/1` &&
        request.params.get('page') === '0' &&
        request.params.get('size') === '10',
    );

    expect(req.request.method).toBe('GET');
    req.flush(createPage([mockTicket]));
  });

  it('getTicketsByCashRegisterPage — should GET /tickets/cash-register/3 with pagination params', () => {
    service.getTicketsByCashRegisterPage(3, { page: 2, size: 15 }).subscribe((page) => {
      expect(page.number).toBe(2);
    });

    const req = http.expectOne(
      (request) =>
        request.url === `${BASE_URL}/cash-register/3` &&
        request.params.get('page') === '2' &&
        request.params.get('size') === '15',
    );

    expect(req.request.method).toBe('GET');
    req.flush(createPage([mockTicket], { number: 2, size: 15 }));
  });
});
