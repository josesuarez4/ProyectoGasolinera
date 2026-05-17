import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, EMPTY, expand, forkJoin, map, Observable, of, reduce, switchMap } from 'rxjs';
import {
  buildPageParams,
  createEmptyPage,
  normalizePageResponse,
  PageRequest,
  PageResponse,
} from '../pagination';

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT';

export interface AdminUserRecord {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  birthDate: string;
  salary: string;
  startTime: string;
  endTime: string;
  days: string;
  loyaltyCode: string;
  points: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface UserSummary {
  totalUsers: number;
  totalManagers: number;
  totalEmployees: number;
  totalClients: number;
}

export interface TopClientRecord {
  id: number;
  name: string;
  email: string;
  totalSpent: number;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  salary: number;
  startTime: string;
  endTime: string;
  days: string;
}

export interface UpdateEmployeeRequest {
  name: string;
  email: string;
  password?: string;
  birthDate: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  salary: number;
  startTime: string;
  endTime: string;
  days: string;
}

export interface CreateClientRequest {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  loyaltyCode?: string;
  points?: number;
}

export interface UpdateClientRequest {
  name: string;
  email: string;
  password?: string;
  birthDate: string;
  loyaltyCode?: string;
  points?: number;
}

interface BackendUserDto {
  id?: number;
  userId?: number;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  role?: string;
  birthDate?: string;
  salary?: number;
  startTime?: string;
  endTime?: string;
  days?: string;
  loyaltyCode?: string;
  points?: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface ClientResponseDTO {
  id: number;
  name: string;
  email: string;
  birthDate: string;
  loyaltyCode: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export type UserPageResponse = PageResponse<AdminUserRecord>;

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/users';
  private readonly ordersUrl = 'http://localhost:8080/orders';
  private readonly employeesUrl = 'http://localhost:8080/employees';
  private readonly clientsUrl = 'http://localhost:8080/clients';

  getUsers(): Observable<AdminUserRecord[]> {
    return this.fetchAllUsers(this.baseUrl);
  }

  getUsersPage(request: PageRequest = {}): Observable<UserPageResponse> {
    return this.requestUserPage(this.baseUrl, request);
  }

  getClients(): Observable<AdminUserRecord[]> {
    return this.getUsers().pipe(map((users) => users.filter((user) => user.role === 'CLIENT')));
  }

  getClientsPage(request: PageRequest = {}): Observable<UserPageResponse> {
    return this.getUsersPage(request).pipe(
      map((page) => ({
        ...page,
        content: page.content.filter((user) => user.role === 'CLIENT'),
        totalElements: page.content.filter((user) => user.role === 'CLIENT').length,
        numberOfElements: page.content.filter((user) => user.role === 'CLIENT').length,
        empty: page.content.filter((user) => user.role === 'CLIENT').length === 0,
      })),
    );
  }

  getUserSummary(): Observable<UserSummary> {
    return this.getUsers().pipe(
      map((users) => ({
        totalUsers: users.length,
        totalManagers: users.filter((u) => u.role === 'MANAGER').length,
        totalEmployees: users.filter((u) => u.role === 'EMPLOYEE').length,
        totalClients: users.filter((u) => u.role === 'CLIENT').length,
      })),
    );
  }

  getTopClientsBySpend(limit: number = 5): Observable<TopClientRecord[]> {
    return this.getClients().pipe(
      switchMap((clients) => {
        if (clients.length === 0) return of([]);

        return this.fetchAllClientOrders(clients).pipe(
          map((allOrders) => this.calculateTopSpenders(clients, allOrders, limit)),
        );
      }),
    );
  }

  getUserById(id: number): Observable<AdminUserRecord> {
    return this.http
      .get<BackendUserDto>(`${this.baseUrl}/${id}`)
      .pipe(map((user) => this.mapUser(user)));
  }

  getUserByEmail(email: string): Observable<AdminUserRecord> {
    return this.http
      .get<BackendUserDto>(`${this.baseUrl}/email/${encodeURIComponent(email)}`)
      .pipe(map((user) => this.mapUser(user)));
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  createEmployee(dto: CreateEmployeeRequest): Observable<AdminUserRecord> {
    return this.http
      .post<BackendUserDto>(this.employeesUrl, dto)
      .pipe(map((user) => this.mapUser(user)));
  }

  updateEmployee(id: number, dto: UpdateEmployeeRequest): Observable<AdminUserRecord> {
    return this.http
      .put<BackendUserDto>(`${this.employeesUrl}/${id}`, dto)
      .pipe(map((user) => this.mapUser(user)));
  }

  createClient(dto: CreateClientRequest): Observable<AdminUserRecord> {
    return this.http
      .post<BackendUserDto>(this.clientsUrl, dto)
      .pipe(map((user) => this.mapUser(user)));
  }

  updateClient(id: number, dto: UpdateClientRequest): Observable<AdminUserRecord> {
    return this.http
      .put<BackendUserDto>(`${this.clientsUrl}/${id}`, dto)
      .pipe(map((user) => this.mapUser(user)));
  }

  getClientById(id: number): Observable<ClientResponseDTO> {
    // Use the live users endpoint so we get the persisted `points` value
    // (JWT tokens may contain a stale snapshot). The /users/{id} endpoint
    // returns a user DTO that includes `points` per backend contract.
    return this.http.get<BackendUserDto>(`${this.baseUrl}/${id}`).pipe(
      map((user) => {
        const client: ClientResponseDTO = {
          id: user.id ?? user.userId ?? 0,
          name: user.name ?? user.fullName ?? user.username ?? 'Unknown user',
          email: user.email ?? 'No email',
          birthDate: this.formatDateOnly(user.birthDate),
          loyaltyCode: user.loyaltyCode ?? '-',
          points: user.points ?? 0,
          createdAt: this.formatDate(user.createdAt),
          updatedAt: this.formatDate(user.updatedAt),
        };

        return client;
      }),
    );
  }

  private fetchAllClientOrders(clients: AdminUserRecord[]): Observable<any[][]> {
    const orderRequests = clients.map((client) =>
      this.http.get<any[]>(`${this.ordersUrl}/client/${client.id}`).pipe(catchError(() => of([]))),
    );

    return forkJoin(orderRequests);
  }

  private fetchAllUsers(endpoint: string): Observable<AdminUserRecord[]> {
    return this.requestUserPage(endpoint).pipe(
      expand((page) => {
        if (page.last) {
          return EMPTY;
        }

        return this.requestUserPage(endpoint, {
          page: page.number + 1,
          size: page.size,
        });
      }),
      reduce((allUsers, page) => allUsers.concat(page.content), [] as AdminUserRecord[]),
      catchError(() => of([])),
    );
  }

  private requestUserPage(
    endpoint: string,
    request: PageRequest = {},
  ): Observable<UserPageResponse> {
    const params = buildPageParams(request);
    const pageNumber = request.page ?? 0;
    const pageSize = request.size ?? 20;

    return this.http
      .get<PageResponse<BackendUserDto> | BackendUserDto[] | null>(endpoint, { params })
      .pipe(
        map((page) => normalizePageResponse(page, pageNumber, pageSize)),
        map((page) => ({
          ...page,
          content: page.content.map((user) => this.mapUser(user)),
        })),
        catchError(() => of(createEmptyPage<AdminUserRecord>(pageNumber, pageSize))),
      );
  }

  private calculateTopSpenders(
    clients: AdminUserRecord[],
    allOrders: any[][],
    limit: number,
  ): TopClientRecord[] {
    const startOfMonth = this.getStartOfCurrentMonth();

    const spenders = clients.map((client, index) => {
      const clientOrders = allOrders[index];
      const totalSpent = this.calculateValidSpendSince(clientOrders, startOfMonth);

      return { id: client.id, name: client.name, email: client.email, totalSpent };
    });

    return spenders
      .filter((c) => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  private getStartOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private calculateValidSpendSince(orders: any[], startDate: Date): number {
    return orders
      .filter((order) => {
        const orderDate = new Date(order.createdAt);
        const isRecent = orderDate >= startDate;
        const isNotCancelled = order.status?.toUpperCase() !== 'CANCELLED';

        return isRecent && isNotCancelled;
      })
      .reduce((sum, order) => sum + (order.totalPrice ?? 0), 0);
  }

  private mapUser(user: BackendUserDto): AdminUserRecord {
    return {
      id: user.id ?? user.userId ?? 0,
      name: user.name ?? user.fullName ?? user.username ?? 'Unknown user',
      email: user.email ?? 'No email',
      role: this.normalizeRole(user.role),
      birthDate: this.formatDateOnly(user.birthDate),
      salary: this.formatSalary(user.salary),
      startTime: user.startTime ?? '-',
      endTime: user.endTime ?? '-',
      days: user.days ?? '-',
      loyaltyCode: user.loyaltyCode ?? '-',
      points: this.formatPoints(user.points),
      createdAt: this.formatDate(user.createdAt),
      updatedAt: this.formatDate(user.updatedAt),
    };
  }

  private normalizeRole(role: string | undefined): UserRole {
    const normalized = (role ?? '').replace(/^ROLE_/, '').toUpperCase();

    if (
      normalized === 'ADMIN' ||
      normalized === 'MANAGER' ||
      normalized === 'EMPLOYEE' ||
      normalized === 'CLIENT'
    ) {
      return normalized;
    }

    return 'CLIENT';
  }

  private formatDate(value: string | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private formatDateOnly(value: string | undefined): string {
    if (value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }

    return '-';
  }

  private formatSalary(value: number | undefined): string {
    if (value == null) {
      return '-';
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  }

  private formatPoints(value: number | undefined): string {
    if (typeof value === 'number') {
      return String(value);
    }

    return '-';
  }
}
