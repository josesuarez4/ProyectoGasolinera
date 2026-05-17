import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, NgClass, DecimalPipe, DatePipe } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DemandPrediction } from '../../models/prediction.model';
import { ProductSalesPoint } from '../../services/product-evolution/product-evolution.service';

@Component({
  selector: 'app-sales-projection',
  standalone: true,
  imports: [ChartModule, SkeletonModule, TooltipModule, NgClass, DecimalPipe, DatePipe],
  templateUrl: './sales-projection.html',
  styleUrl: './sales-projection.css',
})
export class SalesProjectionComponent implements OnChanges {

  @Input() prediction: DemandPrediction | null = null;
  @Input() historicalPoints: ProductSalesPoint[] = [];
  @Input() currentStock: number = 0;
  @Input() productName: string = '';
  @Input() loading: boolean = false;

  readonly isBrowser: boolean;

  chartData: any = null;
  chartOptions: any = {};

  get totalProjected(): number {
    if (!this.prediction) return 0;
    return this.prediction.projections.reduce((acc, p) => acc + p.value, 0);
  }

  get optimalStock(): number {
    if (!this.prediction) return 0;
    return Math.ceil(this.prediction.confidenceIntervalUpper * 1.15);
  }

  get stockDelta(): number {
    return this.optimalStock - this.currentStock;
  }

  get confidenceLow(): number {
    return this.prediction?.confidenceIntervalLower ?? 0;
  }

  get confidenceHigh(): number {
    return this.prediction?.confidenceIntervalUpper ?? 0;
  }

  get historicalAvgDaily(): number {
    if (!this.historicalPoints.length) return 0;
    const total = this.historicalPoints.reduce((acc, p) => acc + p.unitsSold, 0);
    return total / this.historicalPoints.length;
  }

  get projectedAvgDaily(): number {
    if (!this.prediction?.projections.length) return 0;
    return this.totalProjected / this.prediction.projections.length;
  }

  get demandTrend(): 'rising' | 'falling' | 'stable' {
    const hist = this.historicalAvgDaily;
    const proj = this.projectedAvgDaily;
    if (hist === 0) return 'stable';
    const delta = (proj - hist) / hist;
    if (delta > 0.05) return 'rising';
    if (delta < -0.05) return 'falling';
    return 'stable';
  }

  get trendIcon(): string {
    switch (this.demandTrend) {
      case 'rising':  return 'pi pi-arrow-up-right';
      case 'falling': return 'pi pi-arrow-down-right';
      default:        return 'pi pi-minus';
    }
  }

  get trendLabel(): string {
    switch (this.demandTrend) {
      case 'rising':  return 'Rising demand';
      case 'falling': return 'Falling demand';
      default:        return 'Stable demand';
    }
  }

  get trendClass(): string {
    switch (this.demandTrend) {
      case 'rising':  return 'trend-rising';
      case 'falling': return 'trend-falling';
      default:        return 'trend-stable';
    }
  }

  get needsPurchase(): boolean {
    return this.stockDelta > 0;
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prediction'] || changes['historicalPoints']) {
      this.buildChart();
    }
  }

  private buildChart(): void {
    if (!this.prediction) {
      this.chartData = null;
      return;
    }

    const histSorted = [...this.historicalPoints].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const histLabels = histSorted.map(p => this.formatDate(p.date));
    const histValues = histSorted.map(p => p.unitsSold);

    const projSorted = [...this.prediction.projections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const projLabels = projSorted.map(p => this.formatDate(p.date));
    const projValues = projSorted.map(p => p.value);

    const allLabels = [...histLabels];
    for (const l of projLabels) {
      if (!allLabels.includes(l)) allLabels.push(l);
    }

    const histPadded: (number | null)[] = allLabels.map(l =>
      histLabels.includes(l) ? histValues[histLabels.indexOf(l)] : null
    );
    const projPadded: (number | null)[] = allLabels.map(l =>
      projLabels.includes(l) ? projValues[projLabels.indexOf(l)] : null
    );

    if (histSorted.length > 0 && projSorted.length > 0) {
      const lastHistLabel = histLabels[histLabels.length - 1];
      const lastHistIdx = allLabels.indexOf(lastHistLabel);
      if (lastHistIdx >= 0 && projPadded[lastHistIdx] === null) {
        projPadded[lastHistIdx] = histValues[histValues.length - 1];
      }
    }

    this.chartData = {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical Sales',
          data: histPadded,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#6366f1',
          spanGaps: false,
        },
        {
          label: 'Projected Demand',
          data: projPadded,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249,115,22,0.07)',
          borderWidth: 2.5,
          borderDash: [7, 4],
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#f97316',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          spanGaps: false,
        },
      ],
    };

    this.chartOptions = {
      responsive: true,
      animation: { duration: 700, easing: 'easeInOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyleWidth: 14,
            padding: 18,
            font: { size: 12, weight: '600' },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.92)',
          padding: 12,
          cornerRadius: 10,
          titleFont: { size: 12, weight: '700' },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx: any) => {
              const val = ctx.parsed.y;
              if (val === null || val === undefined) return '';
              return ` ${ctx.dataset.label}: ${Number(val).toFixed(1)} units`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, maxRotation: 40 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { maxTicksLimit: 7, font: { size: 11 } },
          title: {
            display: true,
            text: 'Units sold / day',
            font: { size: 11, weight: '600' },
            color: '#64748b',
          },
        },
      },
    };
  }

  private formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  get hasChart(): boolean {
    return (
      this.chartData != null &&
      Array.isArray(this.chartData.datasets) &&
      this.chartData.datasets.length > 0 &&
      Array.isArray(this.chartData.labels) &&
      this.chartData.labels.length > 0
    );
  }
}
