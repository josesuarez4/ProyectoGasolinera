import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StaffNewSupplierOrderPage } from './staff-new-supplier-order';
import { AuthService } from '../../../../services/auth/auth.service';
import { MyOrdersSupplierService } from '../../../../services/orders/orders.service';
import { ProductService } from '../../../../services/products/product.service';

describe('StaffNewSupplierOrderPage (Jest)', () => {
  let component: StaffNewSupplierOrderPage;
  let fixture: ComponentFixture<StaffNewSupplierOrderPage>;
  let mockAuthService: { currentUser: jest.Mock };
  let mockOrdersService: { createSupplierOrder: jest.Mock };
  let mockProductService: { getAllProducts: jest.Mock; getAllCategories: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  beforeEach(async () => {
    mockAuthService = {
      currentUser: jest.fn().mockReturnValue({ id: 1, name: 'Test User' })
    };
    mockOrdersService = {
      createSupplierOrder: jest.fn().mockReturnValue(of({}))
    };
    mockProductService = {
      getAllProducts: jest.fn().mockReturnValue(of([])),
      getAllCategories: jest.fn().mockReturnValue(of([]))
    };
    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [StaffNewSupplierOrderPage, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: MyOrdersSupplierService, useValue: mockOrdersService },
        { provide: ProductService, useValue: mockProductService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StaffNewSupplierOrderPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products and categories on init', () => {
    expect(mockProductService.getAllProducts).toHaveBeenCalled();
    expect(mockProductService.getAllCategories).toHaveBeenCalled();
  });

  it('should add an item to the form array', () => {
    const initialLength = (component as any).items.length;
    (component as any).addItem();
    expect((component as any).items.length).toBe(initialLength + 1);
  });

  it('should remove an item from the form array', () => {
    (component as any).addItem(); // Total 2
    const initialLength = (component as any).items.length;
    (component as any).removeItem(0);
    expect((component as any).items.length).toBe(initialLength - 1);
  });

  it('should not remove the last item', () => {
    expect((component as any).items.length).toBe(1);
    (component as any).removeItem(0);
    expect((component as any).items.length).toBe(1);
  });

  it('should calculate total correctly', () => {
    const items = (component as any).items;
    items.at(0).patchValue({ quantity: 2, costPrice: 10 });
    expect((component as any).calculateTotal()).toBe(20);

    (component as any).addItem();
    items.at(1).patchValue({ quantity: 1, costPrice: 5 });
    expect((component as any).calculateTotal()).toBe(25);
  });

  it('should not submit if form is invalid', () => {
    (component as any).orderForm.patchValue({ supplierName: '' });
    (component as any).submitOrder();
    expect(mockOrdersService.createSupplierOrder).not.toHaveBeenCalled();
  });

  it('should call createSupplierOrder when form is valid', () => {
    (component as any).orderForm.patchValue({ supplierName: 'Test Supplier' });
    const items = (component as any).items;
    items.at(0).patchValue({
      isNewProduct: false,
      productId: 1,
      quantity: 5,
      costPrice: 10
    });

    (component as any).submitOrder();

    expect(mockOrdersService.createSupplierOrder).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/staff/orders'], { queryParams: { view: 'supplier' } });
  });

  it('should handle error from service', () => {
    mockOrdersService.createSupplierOrder.mockReturnValue(throwError(() => new Error('API Error')));

    (component as any).orderForm.patchValue({ supplierName: 'Test Supplier' });
    (component as any).submitOrder();

    expect((component as any).error()).toBe('An error occurred while creating the supplier order.');
    expect((component as any).loading()).toBe(false);
  });

  it('should handle missing creatorId', () => {
    mockAuthService.currentUser.mockReturnValue(null);
    
    // Make form valid first
    (component as any).orderForm.patchValue({ supplierName: 'Test Supplier' });
    
    (component as any).submitOrder();

    expect((component as any).error()).toBe('You must be logged in to create an order.');
    expect(mockOrdersService.createSupplierOrder).not.toHaveBeenCalled();
  });
});
