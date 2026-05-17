import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  UserService,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  CreateClientRequest,
  UpdateClientRequest,
} from './user.service';

const mockBackendUsers = [
  {
    id: 1, name: 'Admin User', email: 'admin@test.com', role: 'ADMIN',
    birthDate: '1980-01-01', salary: 3000, startTime: '08:00', endTime: '16:00',
    days: 'LUNES,MARTES', createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00',
  },
  {
    id: 2, name: 'Manager User', email: 'manager@test.com', role: 'MANAGER',
    birthDate: '1985-05-10', salary: 2500, startTime: '09:00', endTime: '17:00',
    days: 'LUNES,VIERNES', createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00',
  },
  {
    id: 3, name: 'Employee User', email: 'employee@test.com', role: 'EMPLOYEE',
    birthDate: '1995-03-20', salary: 1600, startTime: '16:00', endTime: '00:00',
    days: 'MARTES,JUEVES', createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00',
  },
  {
    id: 4, name: 'Client User', email: 'client@test.com', role: 'CLIENT',
    birthDate: '1990-07-15', loyaltyCode: 'ABC123', points: 150,
    createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00',
  },
  {
    id: 5, name: 'Client Two', email: 'client2@test.com', role: 'CLIENT',
    birthDate: '1992-11-22', loyaltyCode: 'DEF456', points: 80,
    createdAt: '2024-01-01T00:00:00', updatedAt: '2024-01-01T00:00:00',
  },
];

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── getUsers ──────────────────────────────────────────────────────────────

  it('getUsers should return mapped users', (done) => {
    service.getUsers().subscribe((users) => {
      expect(users.length).toBe(5);
      expect(users[0].name).toBe('Admin User');
      expect(users[0].role).toBe('ADMIN');
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);
  });

  it('getUsers should return empty array when backend returns null', (done) => {
    service.getUsers().subscribe((users) => {
      expect(users).toEqual([]);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(null);
  });

  it('getUsers should return empty array on HTTP error', (done) => {
    service.getUsers().subscribe((users) => {
      expect(users).toEqual([]);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(null, { status: 500, statusText: 'Server Error' });
  });

  // ── getClients ────────────────────────────────────────────────────────────

  it('getClients should return only CLIENT role users', (done) => {
    service.getClients().subscribe((clients) => {
      expect(clients.length).toBe(2);
      expect(clients.every((c) => c.role === 'CLIENT')).toBe(true);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);
  });

  it('getClients should return empty array when no clients exist', (done) => {
    const onlyEmployees = mockBackendUsers.filter((u) => u.role !== 'CLIENT');

    service.getClients().subscribe((clients) => {
      expect(clients).toEqual([]);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(onlyEmployees);
  });

  // ── getUserSummary ────────────────────────────────────────────────────────

  it('getUserSummary should return correct counts', (done) => {
    service.getUserSummary().subscribe((summary) => {
      expect(summary.totalUsers).toBe(5);
      expect(summary.totalManagers).toBe(1);
      expect(summary.totalEmployees).toBe(1);
      expect(summary.totalClients).toBe(2);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);
  });

  it('getUserSummary should return all zeros when no users', (done) => {
    service.getUserSummary().subscribe((summary) => {
      expect(summary.totalUsers).toBe(0);
      expect(summary.totalManagers).toBe(0);
      expect(summary.totalEmployees).toBe(0);
      expect(summary.totalClients).toBe(0);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush([]);
  });

  // ── getTopClientsBySpend ──────────────────────────────────────────────────

  it('getTopClientsBySpend should return empty array when no clients', (done) => {
    service.getTopClientsBySpend().subscribe((top) => {
      expect(top).toEqual([]);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush([]);
  });

  it('getTopClientsBySpend should rank clients by totalSpent descending', (done) => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10T10:00:00`;

    service.getTopClientsBySpend(5).subscribe((top) => {
      expect(top.length).toBe(2);
      expect(top[0].totalSpent).toBeGreaterThanOrEqual(top[1].totalSpent);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);

    // Orders for client 4
    httpMock.expectOne('http://localhost:8080/orders/client/4').flush([
      { createdAt: thisMonth, totalPrice: 120.00, status: 'PICKED_UP' },
      { createdAt: thisMonth, totalPrice: 50.00,  status: 'PICKED_UP' },
    ]);

    // Orders for client 5
    httpMock.expectOne('http://localhost:8080/orders/client/5').flush([
      { createdAt: thisMonth, totalPrice: 200.00, status: 'PICKED_UP' },
    ]);
  });

  it('getTopClientsBySpend should exclude CANCELLED orders', (done) => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10T10:00:00`;

    service.getTopClientsBySpend(5).subscribe((top) => {
      // Client 4 only has CANCELLED orders so totalSpent=0 → excluded
      expect(top.every((c) => c.id !== 4)).toBe(true);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);

    httpMock.expectOne('http://localhost:8080/orders/client/4').flush([
      { createdAt: thisMonth, totalPrice: 100.00, status: 'CANCELLED' },
    ]);

    httpMock.expectOne('http://localhost:8080/orders/client/5').flush([
      { createdAt: thisMonth, totalPrice: 80.00, status: 'PICKED_UP' },
    ]);
  });

  it('getTopClientsBySpend should exclude orders from previous months', (done) => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-10T10:00:00`;

    service.getTopClientsBySpend(5).subscribe((top) => {
      expect(top).toEqual([]);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);

    httpMock.expectOne('http://localhost:8080/orders/client/4').flush([
      { createdAt: lastMonthStr, totalPrice: 100.00, status: 'PICKED_UP' },
    ]);

    httpMock.expectOne('http://localhost:8080/orders/client/5').flush([
      { createdAt: lastMonthStr, totalPrice: 80.00, status: 'PICKED_UP' },
    ]);
  });

  it('getTopClientsBySpend should handle order fetch error gracefully', (done) => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10T10:00:00`;

    service.getTopClientsBySpend(5).subscribe((top) => {
      // Client 4 failed → treated as 0 spend → excluded; client 5 ok
      expect(top.length).toBe(1);
      expect(top[0].id).toBe(5);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);

    httpMock.expectOne('http://localhost:8080/orders/client/4')
      .flush(null, { status: 500, statusText: 'Error' });

    httpMock.expectOne('http://localhost:8080/orders/client/5').flush([
      { createdAt: thisMonth, totalPrice: 90.00, status: 'PICKED_UP' },
    ]);
  });

  it('getTopClientsBySpend should respect the limit parameter', (done) => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10T10:00:00`;

    service.getTopClientsBySpend(1).subscribe((top) => {
      expect(top.length).toBe(1);
      done();
    });

    httpMock.expectOne('http://localhost:8080/users').flush(mockBackendUsers);

    httpMock.expectOne('http://localhost:8080/orders/client/4').flush([
      { createdAt: thisMonth, totalPrice: 50.00, status: 'PICKED_UP' },
    ]);

    httpMock.expectOne('http://localhost:8080/orders/client/5').flush([
      { createdAt: thisMonth, totalPrice: 90.00, status: 'PICKED_UP' },
    ]);
  });

  // ── getUserById ───────────────────────────────────────────────────────────

  it('getUserById should return mapped user for given id', (done) => {
    service.getUserById(3).subscribe((user) => {
      expect(user.id).toBe(3);
      expect(user.name).toBe('Employee User');
      expect(user.role).toBe('EMPLOYEE');
      done();
    });

    httpMock.expectOne('http://localhost:8080/users/3').flush(mockBackendUsers[2]);
  });

  it('getUserById should propagate HTTP error', (done) => {
    service.getUserById(999).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      },
    });

    httpMock.expectOne('http://localhost:8080/users/999').flush(null, { status: 404, statusText: 'Not Found' });
  });

  // ── getUserByEmail ────────────────────────────────────────────────────────

  it('getUserByEmail should GET correct URL and return mapped user', (done) => {
    service.getUserByEmail('employee@test.com').subscribe((user) => {
      expect(user.email).toBe('employee@test.com');
      expect(user.role).toBe('EMPLOYEE');
      done();
    });

    httpMock.expectOne('http://localhost:8080/users/email/employee%40test.com').flush(mockBackendUsers[2]);
  });

  it('getUserByEmail should propagate HTTP error', (done) => {
    service.getUserByEmail('missing@test.com').subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      },
    });

    httpMock.expectOne('http://localhost:8080/users/email/missing%40test.com')
      .flush(null, { status: 404, statusText: 'Not Found' });
  });

  // ── deleteUser ────────────────────────────────────────────────────────────

  it('deleteUser should send DELETE to correct URL', (done) => {
    service.deleteUser(3).subscribe(() => done());

    const req = httpMock.expectOne('http://localhost:8080/users/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deleteUser should propagate HTTP error', (done) => {
    service.deleteUser(3).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      },
    });

    httpMock.expectOne('http://localhost:8080/users/3').flush(null, { status: 404, statusText: 'Not Found' });
  });

  // ── createEmployee ────────────────────────────────────────────────────────

  const newEmployeeDto: CreateEmployeeRequest = {
    name: 'New Employee', email: 'new@test.com', password: 'pass123',
    birthDate: '1995-06-15', role: 'EMPLOYEE',
    salary: 1800, startTime: '08:00:00', endTime: '16:00:00', days: 'LUN,MAR,MIE',
  };

  it('createEmployee should POST to /employees and return mapped user', (done) => {
    service.createEmployee(newEmployeeDto).subscribe((user) => {
      expect(user.name).toBe('New Employee');
      expect(user.role).toBe('EMPLOYEE');
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/employees');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newEmployeeDto);
    req.flush({
      id: 10, name: 'New Employee', email: 'new@test.com', role: 'EMPLOYEE',
      birthDate: '1995-06-15', salary: 1800, startTime: '08:00:00', endTime: '16:00:00',
      days: 'LUN,MAR,MIE', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
    });
  });

  it('createEmployee should propagate 409 conflict error', (done) => {
    service.createEmployee(newEmployeeDto).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(409);
        done();
      },
    });

    httpMock.expectOne('http://localhost:8080/employees').flush(null, { status: 409, statusText: 'Conflict' });
  });

  // ── updateEmployee ────────────────────────────────────────────────────────

  const updateEmployeeDto: UpdateEmployeeRequest = {
    name: 'Updated Employee', email: 'employee@test.com',
    birthDate: '1995-03-20', role: 'MANAGER',
    salary: 2200, startTime: '09:00:00', endTime: '17:00:00', days: 'LUN,MIE,VIE',
  };

  it('updateEmployee should PUT to /employees/{id} and return mapped user', (done) => {
    service.updateEmployee(3, updateEmployeeDto).subscribe((user) => {
      expect(user.id).toBe(3);
      expect(user.role).toBe('MANAGER');
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/employees/3');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateEmployeeDto);
    req.flush({
      id: 3, name: 'Updated Employee', email: 'employee@test.com', role: 'MANAGER',
      birthDate: '1995-03-20', salary: 2200, startTime: '09:00:00', endTime: '17:00:00',
      days: 'LUN,MIE,VIE', createdAt: '2024-01-01T00:00:00', updatedAt: '2026-04-27T00:00:00',
    });
  });

  it('updateEmployee should propagate 400 when id is not an employee', (done) => {
    service.updateEmployee(4, updateEmployeeDto).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(400);
        done();
      },
    });

    httpMock.expectOne('http://localhost:8080/employees/4').flush(null, { status: 400, statusText: 'Bad Request' });
  });

  // ── createClient ──────────────────────────────────────────────────────────

  const newClientDto: CreateClientRequest = {
    name: 'New Client', email: 'newclient@test.com', password: 'pass123',
    birthDate: '1990-08-20',
  };

  it('createClient should POST to /clients and return mapped user', (done) => {
    service.createClient(newClientDto).subscribe((user) => {
      expect(user.name).toBe('New Client');
      expect(user.role).toBe('CLIENT');
      expect(user.loyaltyCode).toBe('FID-999999');
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/clients');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newClientDto);
    req.flush({
      id: 11, name: 'New Client', email: 'newclient@test.com', role: 'CLIENT',
      birthDate: '1990-08-20', loyaltyCode: 'FID-999999', points: 0,
      createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
    });
  });

  it('createClient should propagate 409 conflict error', (done) => {
    service.createClient(newClientDto).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(409);
        done();
      },
    });

    httpMock.expectOne('http://localhost:8080/clients').flush(null, { status: 409, statusText: 'Conflict' });
  });

  // ── updateClient ──────────────────────────────────────────────────────────

  const updateClientDto: UpdateClientRequest = {
    name: 'Updated Client', email: 'client@test.com',
    birthDate: '1990-07-15', points: 250,
  };

  it('updateClient should PUT to /clients/{id} and return mapped user', (done) => {
    service.updateClient(4, updateClientDto).subscribe((user) => {
      expect(user.id).toBe(4);
      expect(user.points).toBe('250');
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/clients/4');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateClientDto);
    req.flush({
      id: 4, name: 'Updated Client', email: 'client@test.com', role: 'CLIENT',
      birthDate: '1990-07-15', loyaltyCode: 'ABC123', points: 250,
      createdAt: '2024-01-01T00:00:00', updatedAt: '2026-04-27T00:00:00',
    });
  });

  it('updateClient should propagate 400 when id is not a client', (done) => {
    service.updateClient(3, updateClientDto).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(400);
        done();
      },
    });

    httpMock.expectOne('http://localhost:8080/clients/3').flush(null, { status: 400, statusText: 'Bad Request' });
  });
});