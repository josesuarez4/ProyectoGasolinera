import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import {
  buildPageParams,
  createEmptyPage,
  normalizePageResponse,
  PageRequest,
  PageResponse,
} from '../pagination';

export interface CashRegisterResponseDTO {
  id: number;
  employeeId: number;
  employeeName: string;
  cashAmount: number;
  cardAmount: number;
  openingCash: number;
  closingCash: number | null;
  openedAt: string;
  closedAt: string | null;
}

export interface CashRegisterOpenRequestDTO {
  employeeId: number;
  openingCash: number;
  openedAt: string;
}

export interface CashRegisterCloseRequestDTO {
  closingCash: number;
  closedAt: string;
}

export type CashRegisterPageResponse = PageResponse<CashRegisterResponseDTO>;

@Injectable({
  providedIn: 'root',
})
export class CashRegistersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/cash-registers';

  getAll(): Observable<CashRegisterResponseDTO[]> {
    return this.fetchAllCashRegisters(this.baseUrl);
  }

  getAllPage(request: PageRequest = {}): Observable<CashRegisterPageResponse> {
    return this.requestCashRegisterPage(this.baseUrl, request);
  }

  getOpenRegisters(moment?: string): Observable<CashRegisterResponseDTO[]> {
    const url = moment
      ? `${this.baseUrl}/open?moment=${encodeURIComponent(moment)}`
      : `${this.baseUrl}/open`;
    return this.fetchAllCashRegisters(url);
  }

  getById(id: number): Observable<CashRegisterResponseDTO> {
    return this.http.get<CashRegisterResponseDTO>(`${this.baseUrl}/${id}`);
  }

  openRegister(dto: CashRegisterOpenRequestDTO): Observable<CashRegisterResponseDTO> {
    return this.http.post<CashRegisterResponseDTO>(this.baseUrl, dto);
  }

  closeRegister(id: number, dto: CashRegisterCloseRequestDTO): Observable<CashRegisterResponseDTO> {
    return this.http.patch<CashRegisterResponseDTO>(`${this.baseUrl}/${id}/close`, dto);
  }

  private fetchAllCashRegisters(endpoint: string): Observable<CashRegisterResponseDTO[]> {
    return this.requestCashRegisterPage(endpoint).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestCashRegisterPage(endpoint, {
          page: page.number + 1,
          size: page.size,
        });
      }),
      reduce(
        (allRegisters, page) => allRegisters.concat(page.content),
        [] as CashRegisterResponseDTO[],
      ),
    );
  }

  private requestCashRegisterPage(
    endpoint: string,
    request: PageRequest = {},
  ): Observable<CashRegisterPageResponse> {
    const params = buildPageParams(request);
    const pageNumber = request.page ?? 0;
    const pageSize = request.size ?? 20;

    return this.http
      .get<CashRegisterPageResponse | CashRegisterResponseDTO[] | null>(endpoint, { params })
      .pipe(map((page) => normalizePageResponse(page, pageNumber, pageSize)));
  }
}
