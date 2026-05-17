import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { OrdersClient } from './orders';
import { MyOrdersClientService, OrderResponseDTO } from '../../../services/orders/orders.service';
import { AuthService } from '../../../services/auth/auth.service';

// ── Mock data ──────────────────────────────────────────────────────────────────

const mockOrders: OrderResponseDTO[] = [
  {
    id: 1,
    date: '2026-04-18',
    totalPrice: 45.0,
    status: 'PENDING',
    items: [
      { productId: 1, productName: 'Whey Protein', quantity: 1, salePrice: 25.0 },
      { productId: 2, productName: 'Creatine', quantity: 2, salePrice: 10.0 },
    ],
  },
  {
    id: 2,
    date: '2026-04-15',
    totalPrice: 12.5,
    status: 'PICKED_UP',
    items: [{ productId: 3, productName: 'Jump Rope', quantity: 1, salePrice: 12.5 }],
  },
  {
    id: 3,
    date: '2026-04-10',
    totalPrice: 89.9,
    status: 'CANCELLED',
    items: [],
  },
];

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('MyOrdersClient', () => {
  let component: OrdersClient;
  let fixture: ComponentFixture<OrdersClient>;
  let ordersServiceMock: jest.Mocked<MyOrdersClientService>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    ordersServiceMock = {
      getOrders: jest.fn().mockReturnValue(of(mockOrders)),
      cancelOrder: jest.fn(),
    } as any;

    authServiceMock = {
      currentUser: signal({
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        role: 'CLIENT',
        exp: 9999999999,
      }) as any,
    };

    await TestBed.configureTestingModule({
      imports: [OrdersClient],
      providers: [
        { provide: MyOrdersClientService, useValue: ordersServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersClient);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load orders from service on init', () => {
    expect(ordersServiceMock.getOrders).toHaveBeenCalledWith(1);
    expect(component.orders.length).toBe(3);
    expect(component.loading).toBe(false);
    expect(component.error).toBeNull();
  });

  it('should set error state when service fails', async () => {
    ordersServiceMock.getOrders.mockReturnValue(throwError(() => new Error('Network error')));

    fixture = TestBed.createComponent(OrdersClient);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  describe('openOrder', () => {
    it('should set selectedOrder and open dialog', () => {
      component.openOrder(mockOrders[0]);
      expect(component.selectedOrder).toBe(mockOrders[0]);
      expect(component.dialogVisible).toBe(true);
    });
  });

  describe('getStatusSeverity', () => {
    it('should return warn for PENDING', () => {
      expect(component.getStatusSeverity('PENDING')).toBe('warn');
    });

    it('should return success for PICKED_UP', () => {
      expect(component.getStatusSeverity('PICKED_UP')).toBe('success');
    });

    it('should return danger for CANCELLED', () => {
      expect(component.getStatusSeverity('CANCELLED')).toBe('danger');
    });

    it('should handle lowercase status', () => {
      expect(component.getStatusSeverity('pending')).toBe('warn');
      expect(component.getStatusSeverity('picked_up')).toBe('success');
    });
  });

  describe('getStatusLabel', () => {
    it('should return spanish label for PENDING', () => {
      expect(component.getStatusLabel('PENDING')).toBe('Pendiente');
    });

    it('should return spanish label for PICKED_UP', () => {
      expect(component.getStatusLabel('PICKED_UP')).toBe('Recogido');
    });

    it('should return spanish label for CANCELLED', () => {
      expect(component.getStatusLabel('CANCELLED')).toBe('Cancelado');
    });
  });

  describe('cancelOrder', () => {
    it('should update order in list and close dialog after cancel', () => {
      const updatedOrder: OrderResponseDTO = { ...mockOrders[0], status: 'CANCELLED' };
      ordersServiceMock.cancelOrder.mockReturnValue(of(updatedOrder));

      component.orders = [...mockOrders];
      component.selectedOrder = mockOrders[0];
      component.dialogVisible = true;
      component.cancelOrder(mockOrders[0]);

      expect(ordersServiceMock.cancelOrder).toHaveBeenCalledWith(1);
      expect(component.orders[0].status).toBe('CANCELLED');
      expect(component.dialogVisible).toBe(false);
      expect(component.cancellingOrder).toBe(false);
    });
  });
});
