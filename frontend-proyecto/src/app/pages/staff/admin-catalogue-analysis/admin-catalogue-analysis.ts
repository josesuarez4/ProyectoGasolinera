import {
  Component,
  OnInit,
  signal,
  computed,
  DestroyRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { Table, TableAction, TableActionEvent } from '../../../components/table/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { PredictionService } from '../../../services/prediction.service';
import { DemandPrediction } from '../../../models/prediction.model';
import { ProductAnalyticsService } from '../../../services/product-analytics.service';
import { ProductAnalytics } from '../../../models/product-analytics.model';
import {
  ProductEvolutionService,
  ProductSalesPoint,
} from '../../../services/product-evolution/product-evolution.service';
import { SalesProjectionComponent } from '../../../components/sales-projection/sales-projection';
import { getErrorMessage } from '../../../utils/error-handler';

@Component({
  selector: 'app-admin-catalogue-analysis',
  standalone: true,
  imports: [
    CommonModule,
    Table,
    ButtonModule,
    TooltipModule,
    DialogModule,
    SalesProjectionComponent,
  ],
  templateUrl: './admin-catalogue-analysis.html',
  styleUrl: './admin-catalogue-analysis.css',
})
export class AdminCatalogueAnalysisPage implements OnInit {

  private readonly analyticsService   = inject(ProductAnalyticsService);
  private readonly predictionService  = inject(PredictionService);
  private readonly evolutionService   = inject(ProductEvolutionService);
  private readonly messageService     = inject(MessageService);
  private readonly destroyRef         = inject(DestroyRef);

  analyticsData         = signal<ProductAnalytics[]>([]);
  loading               = signal<boolean>(false);
  hideInactive          = signal<boolean>(false);
  showPredictionDialog  = signal<boolean>(false);
  predictionLoading     = signal<boolean>(false);
  currentPrediction     = signal<DemandPrediction | null>(null);
  currentHistorical     = signal<ProductSalesPoint[]>([]);
  currentStock          = signal<number>(0);
  selectedProductName   = signal<string>('');

  filteredData = computed(() => {
    const data = this.analyticsData();
    if (!this.hideInactive()) return data;
    return data.filter(
      (p) => p.monthlySalesCount > 0 || p.lastSupplierName !== 'N/A'
    );
  });

  totalRevenue = computed(() =>
    this.filteredData().reduce((acc, p) => acc + (p.monthlyRevenue ?? 0), 0)
  );

  totalSales = computed(() =>
    this.filteredData().reduce((acc, p) => acc + (p.monthlySalesCount ?? 0), 0)
  );

  lowStockCount = computed(() =>
    this.filteredData().filter((p) => p.currentStock > 0 && p.currentStock <= 5).length
  );

  columns = [
    { field: 'name',              header: 'Product' },
    { field: 'categoryName',      header: 'Category' },
    { field: 'currentStock',      header: 'Stock' },
    { field: 'currentPrice',      header: 'Price',           type: 'currency' },
    { field: 'monthlySalesCount', header: 'Sales (Month)' },
    { field: 'monthlyRevenue',    header: 'Revenue (Month)', type: 'currency' },
    { field: 'lastSupplierName',  header: 'Last Supplier' },
    { field: 'lastCostPrice',     header: 'Last Cost',       type: 'currency' },
  ];

  actions: TableAction[] = [
    {
      id: 'forecast',
      label: 'Forecast',
      icon: 'pi pi-chart-bar',
      severity: 'help' as const,
    },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  handleAction(event: TableActionEvent): void {
    if (!event?.action) return;
    
    if (event.action.id === 'forecast') {
      this.openForecastDialog(event.row as ProductAnalytics);
    }
  }

  private openForecastDialog(product: ProductAnalytics): void {
    this.predictionLoading.set(true);
    this.currentPrediction.set(null);
    this.currentHistorical.set([]);
    this.currentStock.set(product.currentStock);
    this.selectedProductName.set(product.name);
    this.showPredictionDialog.set(true);

    this.evolutionService.getChartData('month', product.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (points) => {
          const filtered = points.filter(
            (p) => p.product.toLowerCase() === product.name.toLowerCase()
          );
          this.currentHistorical.set(filtered);
          this.startPredictionSequence(product);
        },
        error: () => {
          this.startPredictionSequence(product);
        }
      });
  }

  private startPredictionSequence(product: ProductAnalytics): void {
    this.predictionService.predictDemand({
      productId: product.id,
      horizonDays: 7,
      includeSeasonalFactors: true,
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (prediction) => {
        this.currentPrediction.set(prediction);
        this.predictionLoading.set(false);
      },
      error: () => {
        this.tryTier2Prediction(product);
      }
    });
  }

  private tryTier2Prediction(product: ProductAnalytics): void {
    this.predictionService.predictDemand({
      productId: product.id,
      horizonDays: 7,
      includeSeasonalFactors: false,
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (prediction) => {
        this.currentPrediction.set(prediction);
        this.predictionLoading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'Simplified Forecast',
          detail: 'Showing projection based on recent trend only.',
          life: 4000,
        });
      },
      error: () => {
        this.tryTier3LocalEstimation(product);
      }
    });
  }

  private tryTier3LocalEstimation(product: ProductAnalytics): void {
    this.evolutionService.estimateProductSales(product.name)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.predictionLoading.set(false))
      )
      .subscribe({
        next: (est) => {
          const daysToProject = 7;
          const avgDaily = est.estimatedNextMonth / 30;
          
          const projections = Array.from({ length: daysToProject }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i + 1);
            return {
              date: date.toISOString().split('T')[0],
              value: Math.max(0, avgDaily * (1 + (Math.random() * 0.1 - 0.05)))
            };
          });

          const mockPrediction: DemandPrediction = {
            productId: product.id,
            productName: product.name,
            horizonDays: daysToProject,
            generatedAt: new Date().toISOString(),
            projections: projections,
            confidenceIntervalLower: Math.max(0, est.estimatedNextMonth * 0.8),
            confidenceIntervalUpper: est.estimatedNextMonth * 1.2
          };

          this.currentPrediction.set(mockPrediction);
          this.messageService.add({
            severity: 'warn',
            summary: 'Local Estimation',
            detail: 'Server prediction unavailable. Using local trend calculation.',
            life: 5000,
          });
        },
        error: () => {
          this.predictionLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Forecast Unavailable',
            detail: 'Insufficient data to generate any projection for this product.',
            life: 6000,
          });
        }
      });
  }

  loadData(): void {
    this.loading.set(true);
    this.analyticsService
      .getProductAnalytics()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data: ProductAnalytics[]) => this.analyticsData.set(data),
        error: (err) => {
          this.analyticsData.set([]);
          this.messageService.add({
            severity: 'error',
            summary: 'Load Error',
            detail: getErrorMessage(err, 'Could not load product analytics.'),
            life: 4000,
          });
        },
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }
}
