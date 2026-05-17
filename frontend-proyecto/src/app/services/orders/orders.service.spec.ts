import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MyOrdersClientService, MyOrdersSupplierService, PlaceOrderRequest } from './orders.service';

describe('Orders Services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('MyOrdersClientService', () => {
    let service: MyOrdersClientService;
    const url = 'http://localhost:8080/orders';

    beforeEach(() => {
      service = TestBed.inject(MyOrdersClientService);
    });

    it('should place an order', () => {
      const order: PlaceOrderRequest = { clientId: 1, totalPrice: 100, items: [] };
      service.createOrder(order).subscribe();

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should cancel an order using PATCH status', () => {
      service.cancelOrder(123).subscribe();
      const req = httpMock.expectOne(`${url}/123/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'CANCELLED' });
      req.flush({});
    });
  });

  describe('MyOrdersSupplierService', () => {
    let service: MyOrdersSupplierService;
    const url = 'http://localhost:8080/supplier-orders';

    beforeEach(() => {
      service = TestBed.inject(MyOrdersSupplierService);
    });

    it('should get supplier orders', () => {
      service.getSupplierOrders().subscribe();
      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should resolve (patch) a supplier order', () => {
      service.resolveSupplierOrder(1, 7, 'RECEIVED').subscribe();
      
      const req = httpMock.expectOne(request => 
        request.url.includes('/supplier-orders/1/resolve') &&
        request.url.includes('validatorId=7') &&
        request.url.includes('status=RECEIVED')
      );
      expect(req).toBeTruthy();
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });
  });
});
