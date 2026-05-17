import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import {
  Table,
  TableAction,
  TableActionEvent,
  TableColumn,
  TableRow,
} from '../../../components/table/table';
import { CatalogService, ProductResponseDTO } from '../../../services/catalog/catalog.service';
import { CartService } from '../../../services/cart/cart.service';
import { MyOrdersClientService } from '../../../services/orders/orders.service';
import { AuthService } from '../../../services/auth/auth.service';
import { getErrorMessage } from '../../../utils/error-handler';

type StoreStockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

interface StoreProductRow extends TableRow {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  currentStock: number;
  salePrice: number;
  description: string;
}

interface StoreCategoryOption {
  id: number | null;
  name: string;
}

@Component({
  selector: 'app-staff-store-purchases',
  imports: [CurrencyPipe, Table, Button],
  templateUrl: './store-purchases.html',
  styleUrl: './store-purchases.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorePurchasesPage {
  private readonly catalogService = inject(CatalogService);
  private readonly ordersService = inject(MyOrdersClientService);
  protected readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly storeProducts = signal<StoreProductRow[]>([]);
  protected readonly storeLoading = signal(false);
  protected readonly storeErrorMessage = signal<string | null>(null);
  protected readonly storeSearchTerm = signal('');
  protected readonly storeCategoryId = signal<number | null>(null);
  protected readonly storeStockFilter = signal<StoreStockFilter>('all');
  protected readonly storePurchaseError = signal<string | null>(null);
  protected readonly storePurchaseSuccess = signal<string | null>(null);
  protected readonly storePurchasing = signal(false);
  protected readonly loyaltyCode = signal<string>('');
  protected readonly paymentType = signal<'CASH' | 'CARD'>('CASH');

  protected readonly storeColumns: TableColumn[] = [
    { field: 'name', header: 'Product', width: '16rem' },
    { field: 'categoryName', header: 'Category', width: '12rem' },
    { field: 'currentStock', header: 'Stock', width: '7rem', align: 'right' },
    {
      field: 'salePrice',
      header: 'Price',
      width: '9rem',
      align: 'right',
      formatter: (value) => this.formatCurrency(Number(value)),
    },
  ];

  protected readonly storeActions: TableAction[] = [
    {
      id: 'add-store-product',
      label: '',
      icon: 'pi pi-cart-plus',
      severity: 'primary',
      appearance: 'outlined',
      disabled: (row) => Number(row['currentStock']) <= 0,
    },
  ];

  protected readonly storeCategories = computed<StoreCategoryOption[]>(() => {
    const categories = new Map<number, string>();

    for (const product of this.storeProducts()) {
      categories.set(product.categoryId, product.categoryName);
    }

    return [
      { id: null, name: 'All categories' },
      ...Array.from(categories.entries()).map(([id, name]) => ({ id, name })),
    ];
  });

  protected readonly filteredStoreProducts = computed(() => {
    const term = this.storeSearchTerm().trim().toLowerCase();
    const selectedCategoryId = this.storeCategoryId();
    const selectedStockFilter = this.storeStockFilter();

    return this.storeProducts()
      .filter((product) => {
        const matchesTerm =
          term.length === 0 ||
          product.name.toLowerCase().includes(term) ||
          product.categoryName.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term) ||
          product.id.toString().includes(term);

        const matchesCategory =
          selectedCategoryId === null || product.categoryId === selectedCategoryId;

        const matchesStock =
          selectedStockFilter === 'all' ||
          (selectedStockFilter === 'in-stock' && product.currentStock > 0) ||
          (selectedStockFilter === 'low-stock' &&
            product.currentStock > 0 &&
            product.currentStock <= 5) ||
          (selectedStockFilter === 'out-of-stock' && product.currentStock === 0);

        return matchesTerm && matchesCategory && matchesStock;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  });

  constructor() {
    this.loadStoreProducts();
  }

  protected handleStoreAction(event: TableActionEvent): void {
    const product = event.row as StoreProductRow;

    if (event.action.id !== 'add-store-product' || Number.isFinite(Number(product.id)) === false) {
      return;
    }

    this.addStoreProductToCart(product);
  }

  protected onStoreSearchChange(rawValue: string): void {
    this.storeSearchTerm.set(rawValue);
  }

  protected onStoreCategoryChange(rawValue: string): void {
    if (rawValue === '') {
      this.storeCategoryId.set(null);
      return;
    }

    const parsedValue = Number(rawValue);
    this.storeCategoryId.set(Number.isFinite(parsedValue) ? parsedValue : null);
  }

  protected onStoreStockFilterChange(rawValue: string): void {
    if (
      rawValue === 'all' ||
      rawValue === 'in-stock' ||
      rawValue === 'low-stock' ||
      rawValue === 'out-of-stock'
    ) {
      this.storeStockFilter.set(rawValue as StoreStockFilter);
    }
  }

  protected clearStoreFilters(): void {
    this.storeSearchTerm.set('');
    this.storeCategoryId.set(null);
    this.storeStockFilter.set('all');
  }

  protected addStoreProductToCart(product: StoreProductRow): void {
    if (product.currentStock <= 0) {
      return;
    }

    this.cart.addItem({
      productId: product.id,
      name: product.name,
      price: product.salePrice,
      quantity: 1,
      stock: product.currentStock,
    });

    this.storePurchaseError.set(null);
    this.storePurchaseSuccess.set(null);
  }

  protected checkoutStorePurchase(): void {
    if (this.cart.itemCount() === 0) {
      this.storePurchaseError.set('Add products to the cart before completing the purchase.');
      return;
    }

    this.storePurchaseError.set(null);
    this.storePurchaseSuccess.set(null);
    this.storePurchasing.set(true);

    const loyaltyCodeValue = this.loyaltyCode().trim();

    const request = {
      loyaltyCode: loyaltyCodeValue.length > 0 ? loyaltyCodeValue : undefined,
      paymentType: this.paymentType(),
      items: this.cart.items().map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        salePrice: item.price,
      })),
    };

    this.ordersService
      .checkoutStorePurchase(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.storePurchasing.set(false)),
      )
      .subscribe({
        next: (ticket) => {
          this.cart.clearCart();
          this.loyaltyCode.set('');
          this.storePurchaseSuccess.set(`Purchase completed successfully. Ticket #${ticket.code}.`);
          this.messageService.add({
            severity: 'success',
            summary: 'Purchase Successful',
            detail: `Ticket #${ticket.code} has been generated.`,
            life: 3000
          });
        },
        error: (err) => {
          const errorMsg = getErrorMessage(err, 'Could not complete the store purchase, you might not have a cash register open.');
          this.storePurchaseError.set(errorMsg);
          this.messageService.add({
            severity: 'error',
            summary: 'Purchase Failed',
            detail: errorMsg,
            life: 3000
          });
        },
      });
  }

  private loadStoreProducts(): void {
    this.storeLoading.set(true);
    this.storeErrorMessage.set(null);

    this.catalogService
      .getAvailableProducts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.storeLoading.set(false)),
      )
      .subscribe({
        next: (products) => {
          this.storeProducts.set(products.map((product) => this.mapStoreProduct(product)));
        },
        error: (err) => {
          this.storeProducts.set([]);
          this.storeErrorMessage.set(getErrorMessage(err, 'Could not load products for store purchases.'));
        },
      });
  }

  private mapStoreProduct(product: ProductResponseDTO): StoreProductRow {
    return {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      currentStock: product.currentStock,
      salePrice: product.salePrice ?? 0,
      description: product.description ?? '',
    };
  }

  private formatCurrency(value: number | undefined): string {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(value);
    }

    return '-';
  }

  protected onQuantityInputChange(productId: number, stock: number, rawValue: string): void {
    const parsed = parseInt(rawValue, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      this.cart.updateQuantity(productId, 1);
      return;
    }

    if (parsed > stock) {
      this.cart.updateQuantity(productId, stock);
      return;
    }

    this.cart.updateQuantity(productId, parsed);
  }
}
