import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
export type TicketType = 'SALE' | 'RETURN' | 'SUPPLIER';
export type PaymentType = 'CASH' | 'CARD';

export interface TicketPageRequest {
  page?: number;
  size?: number;
  sort?: string | string[];
}

export interface TicketPageResponse {
  content: Ticket[];
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
}

export interface Ticket {
  [key: string]: unknown;
  id: number;
  employeeId: number;
  employeeName: string;
  cashRegisterId: number;
  clientId: number | null;
  clientName: string | null;
  onlineOrderId: number | null;
  code: string;
  date: string;
  type: TicketType;
  totalPrice: number;
  isOnline: boolean;
  paymentType: PaymentType;
  details?: TicketDetail[];
}

export interface TicketDetail {
  id: number;
  ticketId: number;
  productId: number;
  productName: string;
  quantity: number;
  salePrice: number;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = 'http://localhost:8080/tickets';

  // ── Staff endpoints ──────────────────────────────────────────────────────

  getAllTickets(): Observable<Ticket[]> {
    return this.fetchAllTickets(this.BASE_URL);
  }

  getAllTicketsPage(query: TicketPageRequest = {}): Observable<TicketPageResponse> {
    return this.requestTicketPage(this.BASE_URL, query);
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.BASE_URL}/${id}`);
  }

  getTicketByCode(code: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.BASE_URL}/code/${code}`);
  }

  getTicketDetails(id: number): Observable<TicketDetail[]> {
    return this.http.get<TicketDetail[]>(`${this.BASE_URL}/${id}/details`);
  }

  getClientTickets(clientId: number): Observable<Ticket[]> {
    return this.fetchAllTickets(`${this.BASE_URL}/client/${clientId}`);
  }

  getClientTicketsPage(
    clientId: number,
    query: TicketPageRequest = {},
  ): Observable<TicketPageResponse> {
    return this.requestTicketPage(`${this.BASE_URL}/client/${clientId}`, query);
  }

  getTicketsByCashRegister(cashRegisterId: number): Observable<Ticket[]> {
    return this.fetchAllTickets(`${this.BASE_URL}/cash-register/${cashRegisterId}`);
  }

  getTicketsByCashRegisterPage(
    cashRegisterId: number,
    query: TicketPageRequest = {},
  ): Observable<TicketPageResponse> {
    return this.requestTicketPage(`${this.BASE_URL}/cash-register/${cashRegisterId}`, query);
  }

  updateTicket(id: number, payload: Partial<Ticket>): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.BASE_URL}/${id}`, payload);
  }

  private fetchAllTickets(endpoint: string, query: TicketPageRequest = {}): Observable<Ticket[]> {
    return this.requestTicketPage(endpoint, query).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestTicketPage(endpoint, {
          ...query,
          page: page.number + 1,
          size: page.size,
        });
      }),
      reduce((allTickets, page) => allTickets.concat(page.content ?? []), [] as Ticket[]),
    );
  }

  private requestTicketPage(
    endpoint: string,
    query: TicketPageRequest = {},
  ): Observable<TicketPageResponse> {
    const params = this.buildTicketParams(query);
    const defaultPage = query.page ?? 0;
    const defaultSize = query.size ?? 20;

    return this.http
      .get<TicketPageResponse | null>(endpoint, { params })
      .pipe(map((page) => page ?? this.createEmptyPage(defaultPage, defaultSize)));
  }

  private buildTicketParams(query: TicketPageRequest): HttpParams {
    let params = new HttpParams();

    if (query.page !== undefined) {
      params = params.set('page', `${query.page}`);
    }

    if (query.size !== undefined) {
      params = params.set('size', `${query.size}`);
    }

    if (query.sort !== undefined) {
      const sorts = Array.isArray(query.sort) ? query.sort : [query.sort];

      for (const sort of sorts) {
        params = params.append('sort', sort);
      }
    }

    return params;
  }

  private createEmptyPage(pageNumber: number, size: number): TicketPageResponse {
    return {
      content: [],
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      size,
      number: pageNumber,
      numberOfElements: 0,
      empty: true,
    };
  }
}
