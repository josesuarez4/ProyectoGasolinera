import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, switchMap, of } from 'rxjs';

import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { RippleModule } from 'primeng/ripple';

import { AuthService } from '../../../../services/auth/auth.service';
import {
  MyOrdersSupplierService,
  SupplierOrderRequestDTO,
} from '../../../../services/orders/orders.service';
import { ProductService, Product, Category } from '../../../../services/products/product.service';

@Component({
  selector: 'app-staff-new-supplier-order',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    RippleModule,
  ],
  templateUrl: './staff-new-supplier-order.html',
  styleUrl: './staff-new-supplier-order.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffNewSupplierOrderPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly ordersService = inject(MyOrdersSupplierService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);

  protected readonly orderForm = this.fb.group({
    supplierName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    items: this.fb.array([this.createItemFormGroup()]),
  });

  constructor() {
    this.loadProducts();
    this.loadCategories();
  }

  protected get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  protected createItemFormGroup(): FormGroup {
    const group = this.fb.group({
      isNewProduct: [false],
      productId: [null],
      productName: [''],
      productDescription: [''],
      categoryId: [null],
      isNewCategory: [false],
      categoryName: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      costPrice: [0, [Validators.required, Validators.min(0)]],
    });

    // Add dynamic validators: require productId if not new, require productName + categoryId if new
    group.get('isNewProduct')?.valueChanges.subscribe((isNew: boolean | null) => {
      const productIdControl = group.get('productId');
      const productNameControl = group.get('productName');
      const categoryIdControl = group.get('categoryId');
      const isNewCategoryControl = group.get('isNewCategory');
      const categoryNameControl = group.get('categoryName');

      if (isNew) {
        // Existing product mode → productId required
        productIdControl?.clearAsyncValidators();
        productIdControl?.clearValidators();
        productNameControl?.setValidators([Validators.required]);
        productNameControl?.enable();
        categoryIdControl?.enable();
        isNewCategoryControl?.enable();
      } else {
        // New product mode → productName required
        productIdControl?.setValidators([Validators.required]);
        productIdControl?.enable();
        productNameControl?.clearValidators();
        productNameControl?.disable();
        categoryIdControl?.clearValidators();
        categoryIdControl?.disable();
        isNewCategoryControl?.reset(false);
        isNewCategoryControl?.disable();
        categoryNameControl?.clearValidators();
        categoryNameControl?.disable();
      }

      productIdControl?.updateValueAndValidity({ emitEvent: false });
      productNameControl?.updateValueAndValidity({ emitEvent: false });
      categoryIdControl?.updateValueAndValidity({ emitEvent: false });
      categoryNameControl?.updateValueAndValidity({ emitEvent: false });
    });

    // Handle isNewCategory changes
    group.get('isNewCategory')?.valueChanges.subscribe((isNewCategory: boolean | null) => {
      const categoryIdControl = group.get('categoryId');
      const categoryNameControl = group.get('categoryName');

      if (isNewCategory) {
        categoryIdControl?.clearValidators();
        categoryIdControl?.disable();
        categoryNameControl?.setValidators([Validators.required]);
        categoryNameControl?.enable();
      } else {
        categoryIdControl?.setValidators([Validators.required]);
        categoryIdControl?.enable();
        categoryNameControl?.clearValidators();
        categoryNameControl?.disable();
      }

      categoryIdControl?.updateValueAndValidity({ emitEvent: false });
      categoryNameControl?.updateValueAndValidity({ emitEvent: false });
    });

    return group;
  }

  protected addItem(): void {
    this.items.push(this.createItemFormGroup());
  }

  protected removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  protected calculateTotal(): number {
    return this.items.controls.reduce((total, control) => {
      const qty = control.get('quantity')?.value || 0;
      const price = control.get('costPrice')?.value || 0;
      return total + qty * price;
    }, 0);
  }

  protected formatCurrency(value: number | undefined | null): string {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(value);
    }
    return '-';
  }

  private loadProducts(): void {
    this.productService
      .getAllProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => this.error.set('Could not load products inventory.'),
      });
  }

  private loadCategories(): void {
    this.productService
      .getAllCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => this.error.set('Could not load categories.'),
      });
  }

  protected submitOrder(): void {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const creatorId = this.auth.currentUser()?.id;
    if (!creatorId) {
      this.error.set('You must be logged in to create an order.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.orderForm.value;
    const items: any[] = formValue.items || [];

    // 1. Calculamos el total (Obligatorio para el DTO de Java)
    const total = items.reduce((sum: number, item: any) => {
      return sum + item.quantity * item.costPrice;
    }, 0);

    // 2. Lógica de creación de categorías (si aplica)
    const newCategoryNames = [
      ...new Set(
        items
          .filter(
            (item: any) => item.isNewProduct && item.isNewCategory && item.categoryName?.trim(),
          )
          .map((item: any) => item.categoryName.trim() as string),
      ),
    ];

    const categoryCreates$ =
      newCategoryNames.length > 0
        ? forkJoin(newCategoryNames.map((name) => this.productService.createCategory({ name })))
        : of([] as { id: number; name: string }[]);

    categoryCreates$
      .pipe(
        switchMap((createdCategories) => {
          const nameToId = new Map<string, number>(createdCategories.map((c) => [c.name, c.id]));

          // 3. CONSTRUCCIÓN DEL REQUEST (Coincide con SupplierOrderRequestDTO.java)
          const request: SupplierOrderRequestDTO = {
            creatorId: creatorId,
            supplierName: formValue.supplierName as string,

            items: items.map((item: any) => {
              // For existing products: send productId + quantity + costPrice
              if (!item.isNewProduct && item.productId) {
                return {
                  productId: item.productId?.id || item.productId,
                  quantity: item.quantity,
                  costPrice: item.costPrice,
                };
              }

              // For new products: send productName + productDescription + categoryId + quantity + costPrice
              if (item.isNewProduct && item.productName) {
                const categoryId = item.isNewCategory
                  ? nameToId.get(item.categoryName)
                  : item.categoryId;

                return {
                  productName: item.productName,
                  productDescription: item.productDescription || '',
                  categoryId: categoryId,
                  quantity: item.quantity,
                  costPrice: item.costPrice,
                };
              }

              // Fallback (should not happen if form validation works)
              throw new Error(
                'Invalid item: must provide either productId or productName+categoryId',
              );
            }),
          };

          return this.ordersService.createSupplierOrder(request);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/staff/orders'], { queryParams: { view: 'supplier' } });
        },
        error: (err) => {
          console.error('Order creation error:', err);
          this.error.set('An error occurred while creating the supplier order.');
        },
      });
  }
}
