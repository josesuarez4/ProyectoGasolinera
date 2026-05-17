import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { buildPageParams, normalizePageResponse, PageRequest, PageResponse } from '../pagination';

export interface PlaceOrderItem {
  productId: number;
  quantity: number;
  salePrice: number;
}

export interface PlaceOrderRequest {
  clientId: number;
  totalPrice: number;
  createdAt?: string;
  items: PlaceOrderItem[];
}

export interface OrderDetailDTO {
  id: number;
  onlineOrderId: number;
  productId: number;
  productName: string;
  categoryId?: number;
  categoryName?: string;
  quantity: number;
  salePrice: number;
}

export interface OrderResponseDTO {
  id: number;
  clientId?: number;
  clientName?: string;
  loyaltyCode?: string;
  createdAt: string;
  totalPrice: number;
  status: string;
  maxPickupDate?: string;
  details: OrderDetailDTO[];
}

export interface InStorePurchaseRequestDTO {
  loyaltyCode?: string;
  paymentType: 'CASH' | 'CARD' | 'CHECK' | 'OTHER';
  items: PlaceOrderItem[];
}

export interface TicketResponseDTO {
  id: number;
  employeeId?: number;
  employeeName?: string;
  cashRegisterId?: number;
  clientId?: number;
  clientName?: string;
  onlineOrderId?: number;
  code: string;
  date: string;
  type: string;
  totalPrice: number;
  isOnline: boolean;
  paymentType: string;
}

export interface SupplierOrderDetailRequestDTO {
  productId?: number;
  productName?: string;
  productDescription?: string;
  categoryId?: number;
  quantity: number;
  costPrice: number;
}

export interface SupplierOrderRequestDTO {
  creatorId: number;
  supplierName: string;
  items: SupplierOrderDetailRequestDTO[];
}

export interface SupplierOrderDetailDTO {
  id: number;
  supplierOrderId: number;
  productId?: number;
  productName?: string;
  quantity: number;
  costPrice: number;
}

export interface SupplierOrderDetailResponseDTO {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  costPrice: number;
}

export interface SupplierOrderResponseDTO {
  id: number;
  creatorId: number;
  creatorName: string;
  validatorId?: number;
  validatorName?: string;
  status: string;
  supplierName: string;
  createdAt: string;
  resolvedAt?: string;
  totalPrice: number;
  details: SupplierOrderDetailResponseDTO[];
}

export type OrderPageResponse = PageResponse<OrderResponseDTO>;
export type SupplierOrderPageResponse = PageResponse<SupplierOrderResponseDTO>;

@Injectable({
  providedIn: 'root',
})
export class MyOrdersClientService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = 'http://localhost:8080/orders';
  private readonly ticketsUrl = 'http://localhost:8080/tickets';

  getAllOrders(): Observable<OrderResponseDTO[]> {
    return this.fetchAllOrders(this.apiUrl);
  }

  getAllOrdersPage(request: PageRequest = {}): Observable<OrderPageResponse> {
    return this.requestOrderPage(this.apiUrl, request);
  }

  getOrders(clientId: number): Observable<OrderResponseDTO[]> {
    return this.fetchAllOrders(`${this.apiUrl}/client/${clientId}`);
  }

  getOrdersPage(clientId: number, request: PageRequest = {}): Observable<OrderPageResponse> {
    return this.requestOrderPage(`${this.apiUrl}/client/${clientId}`, request);
  }

  createOrder(dto: PlaceOrderRequest): Observable<OrderResponseDTO> {
    return this.http.post<OrderResponseDTO>(this.apiUrl, dto);
  }

  checkoutStorePurchase(dto: InStorePurchaseRequestDTO): Observable<TicketResponseDTO> {
    return this.http.post<TicketResponseDTO>(`${this.ticketsUrl}/checkout`, dto);
  }

  cancelOrder(orderId: number): Observable<OrderResponseDTO> {
    const role = this.auth.currentRole();

    // Clients might not have permission to use the /status endpoint (403).
    // For them, we fall back to /cancel, but for staff we use /status to avoid the stock bug.
    if (role === 'CLIENT') {
      return this.http.patch<OrderResponseDTO>(`${this.apiUrl}/${orderId}/cancel`, null);
    }

    const statusUpdate = { status: 'CANCELLED' };
    return this.http.patch<OrderResponseDTO>(`${this.apiUrl}/${orderId}/status`, statusUpdate);
  }

  pickUpOrder(orderId: number): Observable<OrderResponseDTO> {
    const statusUpdate = { status: 'PICKED_UP' };

    return this.http.patch<OrderResponseDTO>(`${this.apiUrl}/${orderId}/status`, statusUpdate);
  }

  private fetchAllOrders(endpoint: string): Observable<OrderResponseDTO[]> {
    return this.requestOrderPage(endpoint).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestOrderPage(endpoint, {
          page: page.number + 1,
          size: page.size,
        });
      }),
      reduce((allOrders, page) => allOrders.concat(page.content), [] as OrderResponseDTO[]),
    );
  }

  private requestOrderPage(
    endpoint: string,
    request: PageRequest = {},
  ): Observable<OrderPageResponse> {
    const params = buildPageParams(request);
    const pageNumber = request.page ?? 0;
    const pageSize = request.size ?? 20;

    return this.http
      .get<OrderPageResponse | OrderResponseDTO[] | null>(endpoint, { params })
      .pipe(map((page) => normalizePageResponse(page, pageNumber, pageSize)));
  }
}

@Injectable({
  providedIn: 'root',
})
export class MyOrdersSupplierService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/supplier-orders';

  getSupplierOrders(): Observable<SupplierOrderResponseDTO[]> {
    return this.fetchAllSupplierOrders(this.apiUrl);
  }

  getSupplierOrdersPage(request: PageRequest = {}): Observable<SupplierOrderPageResponse> {
    return this.requestSupplierOrderPage(this.apiUrl, request);
  }

  getSupplierOrderById(orderId: number): Observable<SupplierOrderResponseDTO> {
    return this.http.get<SupplierOrderResponseDTO>(`${this.apiUrl}/${orderId}`);
  }

  createSupplierOrder(dto: SupplierOrderRequestDTO): Observable<SupplierOrderResponseDTO> {
    return this.http.post<SupplierOrderResponseDTO>(this.apiUrl, dto);
  }

  resolveSupplierOrder(
    orderId: number,
    validatorId: number,
    status: string,
  ): Observable<SupplierOrderResponseDTO> {
    return this.http.patch<SupplierOrderResponseDTO>(
      `${this.apiUrl}/${orderId}/resolve?validatorId=${validatorId}&status=${encodeURIComponent(status)}`,
      {},
    );
  }

  deleteSupplierOrder(orderId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${orderId}`);
  }

  private fetchAllSupplierOrders(endpoint: string): Observable<SupplierOrderResponseDTO[]> {
    return this.requestSupplierOrderPage(endpoint).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestSupplierOrderPage(endpoint, {
          page: page.number + 1,
          size: page.size,
        });
      }),
      reduce((allOrders, page) => allOrders.concat(page.content), [] as SupplierOrderResponseDTO[]),
    );
  }

  private requestSupplierOrderPage(
    endpoint: string,
    request: PageRequest = {},
  ): Observable<SupplierOrderPageResponse> {
    const params = buildPageParams(request);
    const pageNumber = request.page ?? 0;
    const pageSize = request.size ?? 20;

    return this.http
      .get<SupplierOrderPageResponse | SupplierOrderResponseDTO[] | null>(endpoint, { params })
      .pipe(map((page) => normalizePageResponse(page, pageNumber, pageSize)));
  }
}
