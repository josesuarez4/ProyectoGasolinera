import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CashRegisterTicketsPage } from './cash-register-tickets';
import { TicketService } from '../../../../services/tickets/ticket.service';

describe('CashRegisterTicketsPage', () => {
  let component: CashRegisterTicketsPage;
  let fixture: ComponentFixture<CashRegisterTicketsPage>;
  let ticketService: any;

  const mockTicket = {
    id: 1,
    employeeId: 1,
    employeeName: 'Ana García',
    cashRegisterId: 3,
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

  beforeEach(async () => {
    ticketService = {
      getTicketsByCashRegister: jest.fn().mockReturnValue(of([mockTicket])),
    };

    await TestBed.configureTestingModule({
      imports: [CashRegisterTicketsPage],
      providers: [
        { provide: TicketService, useValue: ticketService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ cashRegisterId: '3' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashRegisterTicketsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tickets for the selected cash register', () => {
    expect(ticketService.getTicketsByCashRegister).toHaveBeenCalledWith(3);
    expect(component['tickets']()).toHaveLength(1);
  });

  it('should filter tickets by code', () => {
    component['searchCode'].set('TKT-00000001');
    expect(component['filteredTickets']).toHaveLength(1);
  });

  it('should clear filters', () => {
    component['searchCode'].set('TKT-00000001');
    component['filterPayment'].set('CARD');
    component['filterOnline'].set(true);

    component['clearFilters']();

    expect(component['searchCode']()).toBe('');
    expect(component['filterPayment']()).toBeNull();
    expect(component['filterOnline']()).toBeNull();
  });

  it('should handle ticket loading errors', async () => {
    ticketService.getTicketsByCashRegister.mockReturnValue(throwError(() => new Error('fail')));

    fixture = TestBed.createComponent(CashRegisterTicketsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component['errorMessage']()).toBe('Error loading tickets for this cash register.');
  });
  
});
