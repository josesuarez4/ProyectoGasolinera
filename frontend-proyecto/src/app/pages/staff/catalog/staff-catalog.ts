import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

import { CategoryRevenueService } from '../../../services/category-revenue/category-revenue';
import {
  Category,
  CreateProductRequest,
  Product,
  ProductService,
  UpdateProductRequest,
} from '../../../services/products/product.service';
import { ProductEvolutionService } from '../../../services/product-evolution/product-evolution.service';
import { AuthService } from '../../../services/auth/auth.service';
import { Table, TableAction, TableActionEvent, TableColumn, TableRowClickEvent } from '../../../components/table/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GenericForm, FormFieldConfig } from '../../../components/generic-form/generic-form';
import { SortOption } from '../../../components/table-controls/table-controls';
import { CurrencyPipe } from '@angular/common';
import { DetailView } from '../../../components/detail-view/detail-view';
import { getErrorMessage } from '../../../utils/error-handler';

interface ProductRow extends Product {
  categoryName: string;
  [key: string]: unknown;
}

import { DialogModule } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-staff-catalog-page',
  standalone: true,
  imports: [CardModule, ButtonModule, Table, GenericForm, DialogModule, TagModule, DetailView, CurrencyPipe, ConfirmDialog],
  templateUrl: './staff-catalog.html',
  styleUrl: './staff-catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffCatalogPage {
  private readonly categoryRevenueService = inject(CategoryRevenueService);
  private readonly productService = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly evolutionService = inject(ProductEvolutionService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Revenue chart ────────────────────────────────────────────────────────
  protected readonly loadingRevenue = signal(true);
  protected readonly categoryChartData = signal<any>(null);

  // ── Products CRUD ────────────────────────────────────────────────────────
  protected readonly productRows = signal<ProductRow[]>([]);
  protected readonly loadingProducts = signal(true);
  protected readonly togglingId = signal<number | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showDialog = signal(false);
  protected readonly productToEdit = signal<ProductRow | null>(null);
  protected readonly estimationData = signal<any>(null);
  protected readonly showEstimationDialog = signal(false);
  protected readonly loadingEstimation = signal(false);
  private readonly categories = signal<Category[]>([]);
  protected readonly productFormConfig = signal<FormFieldConfig[]>([]);
  protected readonly productDetails = signal<ProductRow | null>(null);

  // Filters & Sorting 
  protected readonly productNameFilter = signal('');
  protected readonly supplierFilter = signal('');
  protected readonly sortBy = signal('name');
  protected readonly sortOrder = signal<'asc' | 'desc'>('asc');

  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly productStatusFilter = signal<'all' | 'active' | 'inactive'>('all');

  protected readonly sortOptions: SortOption[] = [
    { label: 'Name', value: 'name' },
    { label: 'Monthly Sales', value: 'monthlySales' },
    { label: 'Supplier', value: 'supplierName' },
  ];

  protected readonly categoryOptions = computed(() => [
    { label: 'All categories', value: '' },
    ...this.categories().map((category) => ({ label: category.name, value: String(category.id) })),
  ]);

  protected readonly statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  protected readonly hasActiveFilters = computed(() => {
    return (
      this.productNameFilter().trim().length > 0 ||
      this.supplierFilter().trim().length > 0 ||
      this.selectedCategoryId() !== null ||
      this.productStatusFilter() !== 'all'
    );
  });

  protected readonly filteredProductRows = computed(() => {
    const term = this.productNameFilter().trim().toLowerCase();
    const categoryId = this.selectedCategoryId();
    const statusFilter = this.productStatusFilter();

    let filtered = this.productRows().filter((product) => {
      let matchesSearch = true;
      if (term.length > 0) {
        const supplierName = ((product['supplierName'] as string) || '').toLowerCase();
        matchesSearch =
          product.name.toLowerCase().includes(term) ||
          supplierName.includes(term);
      }

      const matchesCategory = categoryId === null || product.categoryId === categoryId;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && product.active === true) ||
        (statusFilter === 'inactive' && product.active === false);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    const sortField = this.sortBy();
    const order = this.sortOrder() === 'asc' ? 1 : -1;

    return filtered.sort((a, b) => {
      const aVal = a[sortField as keyof ProductRow];
      const bVal = b[sortField as keyof ProductRow];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1 * order;
      if (bVal == null) return -1 * order;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * order;
      }

      return String(aVal).localeCompare(String(bVal)) * order;
    });
  });

  protected readonly canEdit = computed(() => {
    const r = this.auth.currentRole();
    return r === 'ADMIN' || r === 'MANAGER';
  });
  private readonly canToggleActive = computed(() => this.auth.currentRole() === 'ADMIN');

  protected readonly productColumns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '5rem' },
    {
      field: 'active',
      header: 'Status',
      width: '7rem',
      formatter: (val: any) => (val === true ? 'Active' : val === false ? 'Inactive' : '—'),
    },
    { field: 'name', header: 'Name', width: '16rem' },
    { field: 'categoryName', header: 'Category', width: '12rem' },
    { field: 'supplierName', header: 'Supplier', width: '12rem' },
    { field: 'monthlySales', header: 'Sales (Month)', width: '9rem', align: 'right', formatter: (v) => `${v} units` },
    { field: 'currentStock', header: 'Stock', width: '7rem', align: 'right' },
    { field: 'salePrice', header: 'Price (€)', width: '9rem', align: 'right' },
    { field: 'description', header: 'Description', width: '20rem' },
  ];

  protected readonly productActions = computed<TableAction[]>(() => {
    if (!this.canEdit()) return [];
    return [
      { id: 'edit', label: 'Edit', icon: 'pi pi-pencil', severity: 'info', appearance: 'outlined' },
      { id: 'estimate', label: 'Estimate Sales', icon: 'pi pi-chart-line', severity: 'help', appearance: 'outlined', visible: (row) => row['active'] === true },
      { id: 'deactivate-product', label: 'Deactivate', icon: 'pi pi-ban', severity: 'danger', appearance: 'text', visible: (row) => row['active'] === true && this.canToggleActive(), disabled: (row) => this.togglingId() === Number(row['id']) },
      { id: 'reactivate-product', label: 'Reactivate', icon: 'pi pi-refresh', severity: 'success', appearance: 'outlined', visible: (row) => row['active'] === false && this.canToggleActive(), disabled: (row) => this.togglingId() === Number(row['id']) },
    ];
  });

  constructor() {
    this.loadCategoryRevenue();
    this.loadProducts();
  }

  protected onCategoryFilterChange(rawValue: string): void {
    const categoryId = rawValue.trim().length === 0 ? null : Number(rawValue);
    this.selectedCategoryId.set(Number.isFinite(categoryId) ? categoryId : null);
    this.loadProducts();
  }

  protected onStatusFilterChange(rawValue: string): void {
    const val = rawValue.toLowerCase();
    this.productStatusFilter.set(val === 'active' || val === 'inactive' ? (val as any) : 'all');
    this.loadProducts();
  }

  protected onCatalogSearchChange(rawValue: string): void {
    this.productNameFilter.set(rawValue);
  }

  protected onSortByChange(rawValue: string): void {
    this.sortBy.set(rawValue);
  }

  protected toggleSortOrder(): void {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
  }

  protected clearFilters(): void {
    this.productNameFilter.set('');
    this.supplierFilter.set('');
    this.selectedCategoryId.set(null);
    this.productStatusFilter.set('all');
    this.sortBy.set('name');
    this.sortOrder.set('asc');
  }

  private loadCategoryRevenue(): void {
    this.categoryRevenueService.getRevenueByCategory().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.categoryChartData.set(this.mapToChartData(data));
        this.loadingRevenue.set(false);
      });
  }

  private mapToChartData(data: any[]): any {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    return {
      labels: data.map((d) => d.categoryName),
      datasets: [{ label: 'Revenue (€)', data: data.map((d) => d.totalRevenue), backgroundColor: data.map((_, i) => colors[i % colors.length]), borderRadius: 6, borderSkipped: false }],
    };
  }

  protected loadProducts(): void {
    this.loadingProducts.set(true);
    this.productService.getAllProductsAdmin({
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      name: this.productNameFilter(),
      supplierName: this.supplierFilter(),
      categoryId: this.selectedCategoryId() ?? undefined,
      active: this.productStatusFilter() === 'all' ? undefined : this.productStatusFilter() === 'active',
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.productService.getAllCategories().subscribe(cats => {
            this.categories.set(cats);
            this.productFormConfig.set(this.buildFormConfig(cats));
            this.productRows.set(products.map((p: any) => ({
              ...p,
              categoryName: cats.find(c => c.id === p.categoryId)?.name ?? '-',
              supplierName: p.supplierName ?? '-',
              monthlySales: p.monthlySales ?? 0
            })));
            this.loadingProducts.set(false);
          });
        },
        error: (err) => {
          this.errorMessage.set(getErrorMessage(err, 'Error at loading products.'));
          this.loadingProducts.set(false);
        },
      });
  }

  private buildFormConfig(cats: Category[]): FormFieldConfig[] {
    return [
      { key: 'name', label: 'Name', type: 'text', validators: [Validators.required], colSpan: 'col-12' },
      { key: 'description', label: 'Description', type: 'text', placeholder: 'Product description', colSpan: 'col-12' },
      { key: 'categoryId', label: 'Category', type: 'select', options: cats.map((c) => ({ label: c.name, value: c.id })), validators: [Validators.required], colSpan: 'col-6' },
      { key: 'salePrice', label: 'Sale Price (€)', type: 'currency', colSpan: 'col-6' },
      { key: 'currentStock', label: 'Stock', type: 'number', colSpan: 'col-6' },
    ];
  }

  protected handleProductAction(event: TableActionEvent): void {
    const product = event.row as unknown as ProductRow;
    if (event.action.id === 'edit') { this.productToEdit.set(product); this.showDialog.set(true); }
    else if (event.action.id === 'estimate') this.showSalesEstimation(product);
    else if (event.action.id === 'deactivate-product') this.toggleProductActive(product, false);
    else if (event.action.id === 'reactivate-product') this.toggleProductActive(product, true);
  }

  protected handleRowClick(event: TableRowClickEvent): void {
    const product = event.row as unknown as ProductRow;
    this.productDetails.set(product);
  }

  private showSalesEstimation(product: ProductRow): void {
    this.loadingEstimation.set(true);
    this.showEstimationDialog.set(true);
    this.estimationData.set(null);

    this.evolutionService.estimateProductSales(product.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.estimationData.set(data);
          this.loadingEstimation.set(false);
        },
        error: (err) => {
          this.errorMessage.set(getErrorMessage(err, 'Could not load sales estimation.'));
          this.loadingEstimation.set(false);
          this.showEstimationDialog.set(false);
        }
      });
  }

  private toggleProductActive(product: ProductRow, active: boolean): void {
    if (!product.id) return;
    const id = Number(product.id);

    if (!active) {
      this.confirmationService.confirm({
        message: `Are you sure you want to deactivate the product "${product.name}"?`,
        header: 'Confirm Deactivation',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancel',
        rejectButtonProps: {
          severity: 'secondary',
          text: true,
        },
        acceptLabel: 'Deactivate',
        acceptButtonProps: {
          severity: 'danger',
        },
        accept: () => this._executeToggle(id, product.name, active),
      });
    } else {
      this._executeToggle(id, product.name, active);
    }
  }

  private _executeToggle(id: number, productName: string, active: boolean): void {
    this.errorMessage.set(null);
    this.togglingId.set(id);
    this.productService
      .setProductActive(id, active)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.togglingId.set(null))
      )
      .subscribe({
        next: (updated) => {
          this.productRows.update((rows) =>
            rows.map((r) => (r.id === id ? { ...r, active: updated.active } : r))
          );
          const label = active ? 'reactivated' : 'deactivated';
          this.statusMessage.set(`Product "${productName}" ${label}.`);
          this.messageService.add({
            severity: active ? 'success' : 'error',
            summary: active ? 'Product Reactivated' : 'Product Deactivated',
            detail: `Product "${productName}" has been ${label}.`,
            life: 3000,
          });
        },
        error: (err) =>
          this.errorMessage.set(
            getErrorMessage(err, `Could not ${active ? 'reactivate' : 'deactivate'} the product.`)
          ),
      });
  }

  protected onSaveProduct(formData: any): void {
    const id = this.productToEdit()?.id;
    if (!id) return;
    const dto: UpdateProductRequest = {
      name: formData.name,
      description: formData.description || undefined,
      categoryId: Number(formData.categoryId),
      salePrice: formData.salePrice ?? undefined,
      currentStock:
        formData.currentStock != null ? Number(formData.currentStock) : undefined,
    };
    this.errorMessage.set(null);
    this.statusMessage.set('Saving...');
    this.productService
      .updateProduct(id, dto)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.statusMessage.set(null))
      )
      .subscribe({
        next: () => {
          this.showDialog.set(false);
          this.productToEdit.set(null);
          this.loadProducts();
          this.statusMessage.set('Saved successfully.');
          this.messageService.add({
            severity: 'warn',
            summary: 'Product Updated',
            detail: `Changes to "${formData.name}" have been saved.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.errorMessage.set(getErrorMessage(err, 'Check that all fields are correctly filled'));
        },
      });
  }
}
