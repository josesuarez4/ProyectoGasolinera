import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { ChartComponent } from '../../components/chart/chart.component';
import { MetricsService } from '../../services/metrics/metrics.service';

@Component({
  selector: 'app-charts-demo',
  standalone: true,
  imports: [ChartComponent, ButtonModule, DividerModule, TagModule],
  templateUrl: './charts-demo.html',
  styleUrl: './charts-demo.css'
})
export class ChartsDemoPage implements OnInit {

  // ─── Period selector ───────────────────────────────────────────────────────
  selectedPeriod: 'day' | 'week' | 'month' = 'week';

  // ─── Line ──────────────────────────────────────────────────────────────────
  salesData: any = null;
  salesLoading = true;
  // Override: añadir formato € en el tooltip (default muestra valor crudo)
  salesOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          title:  (items: any[]) => `Periodo: ${items[0].label}`,
          label:  (ctx: any) => ctx.dataset.label?.includes('€')
                    ? ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`
                    : ` ${ctx.dataset.label}: ${ctx.parsed.y} tickets`,
          footer: (items: any[]) =>
                    `Ventas: ${items[0].parsed.y.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`
        }
      }
    },
    scales: {
      y: { ticks: { callback: (v: number) => `${v} €` } }
    }
  };

  // ─── Bar horizontal (stock) ─────────────────────────────────────────────────
  stockData: any = null;
  stockLoading = true;
  // Override: eje horizontal + tooltip con categoría
  stockOptions = {
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label:      (ctx: any) => ` Stock: ${ctx.parsed.x.toLocaleString('es-ES')} uds.`,
          afterLabel: (ctx: any) => `Categoría: ${(ctx.dataset as any).categories?.[ctx.dataIndex] ?? ''}`
        }
      }
    },
    scales: {
      x: { beginAtZero: true },
      y: { grid: { display: false } }
    }
  };

  // ─── Bar apilado (caja por empleado) ────────────────────────────────────────
  cashData: any = null;
  cashLoading = true;
  // Override: stacked + animation bounce + tooltip con total
  cashOptions = {
    animation: { easing: 'easeOutBounce' },
    plugins: {
      tooltip: {
        callbacks: {
          label:  (ctx: any) =>
                    ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`,
          footer: (items: any[]) => {
                    const total = items.reduce((s, i) => s + i.parsed.y, 0);
                    return `Total turno: ${total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`;
                  }
        }
      }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, ticks: { callback: (v: number) => `${v} €` } }
    }
  };

  // ─── Doughnut ──────────────────────────────────────────────────────────────
  paymentData: any = null;
  paymentLoading = true;
  // Override: tooltip con importe además del porcentaje (default solo %)
  paymentOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
            return ` ${ctx.label}: ${ctx.parsed.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} (${pct}%)`;
          }
        }
      }
    }
  };

  // ─── Pie (pedidos) ─────────────────────────────────────────────────────────
  ordersData: any = null;
  ordersLoading = true;
  // Sin overrides — defaults del componente son suficientes

  // ─── Radar ─────────────────────────────────────────────────────────────────
  radarData: any = null;
  radarLoading = true;
  // Sin overrides

  // ─── PolarArea ─────────────────────────────────────────────────────────────
  polarData: any = null;
  polarLoading = true;
  // Override: tooltip con formato moneda
  polarOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) =>
            ` ${ctx.label}: ${ctx.parsed.r.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`
        }
      }
    }
  };

  // ─── Mixed (bar + line) ────────────────────────────────────────────────────
  mixedData: any = null;
  mixedLoading = true;
  // Override: doble eje Y — esto no lo puede asumir el componente por defecto
  mixedOptions = {
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => ctx.dataset.type === 'line'
            ? ` Tickets: ${ctx.parsed.y}`
            : ` Ventas: ${ctx.parsed.y.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`
        }
      }
    },
    scales: {
      y:  { ticks: { callback: (v: number) => `${v} €` } },
      y2: {
        beginAtZero: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { callback: (v: number) => `${v} tk` }
      }
    }
  };

  constructor(private metrics: MetricsService) {}

  ngOnInit(): void {
    this.loadSales('week');
    this.loadStock();
    this.loadCash();
    this.loadPayments();
    this.loadOrders();
    this.loadTopProducts();
  }

  // ─── Loaders ───────────────────────────────────────────────────────────────

  loadSales(period: 'day' | 'week' | 'month'): void {
    this.selectedPeriod = period;
    this.salesLoading = true;
    this.metrics.getSalesByPeriod(period).subscribe(dtos => {
      this.salesData = {
        labels: dtos.map(d => d.period),
        datasets: [
          {
            label: 'Ventas (€)',
            data: dtos.map(d => d.totalAmount),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.15)',
            fill: true, tension: 0.4,
            pointRadius: 5, pointHoverRadius: 8,
            borderDash: undefined
          },
          {
            label: 'Tickets emitidos',
            data: dtos.map(d => d.ticketCount),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.15)',
            fill: true, tension: 0.4,
            pointRadius: 5, pointHoverRadius: 8,
            borderDash: [6, 3]
          }
        ]
      };
      this.salesLoading = false;
    });
  }

  private loadStock(): void {
    this.metrics.getProductStock().subscribe(dtos => {
      this.stockData = {
        labels: dtos.map(d => d.productName),
        datasets: [{
          label: 'Stock',
          data: dtos.map(d => d.currentStock),
          backgroundColor: ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7'],
          borderRadius: 4,
          categories: dtos.map(d => d.categoryName)
        }]
      };
      this.stockLoading = false;
    });
  }

  private loadCash(): void {
    this.metrics.getCashRegisterSummary().subscribe(dtos => {
      this.cashData = {
        labels: dtos.map(d => d.employeeName),
        datasets: [
          { label: 'Efectivo', data: dtos.map(d => d.cashTotal), backgroundColor: '#f59e0b', borderRadius: 4 },
          { label: 'Tarjeta',  data: dtos.map(d => d.cardTotal), backgroundColor: '#6366f1', borderRadius: 4 }
        ]
      };
      this.cashLoading = false;
    });
  }

  private loadPayments(): void {
    this.metrics.getIncomeByPaymentType().subscribe(dtos => {
      this.paymentData = {
        labels: dtos.map(d => d.paymentType === 'CASH' ? 'Efectivo' : 'Tarjeta'),
        datasets: [{ data: dtos.map(d => d.totalAmount), backgroundColor: ['#f59e0b','#6366f1'], hoverOffset: 12 }]
      };
      this.paymentLoading = false;
    });
  }

  private loadOrders(): void {
    this.metrics.getOrdersByStatus().subscribe(dtos => {
      const labelMap: Record<string, string> = {
        PENDING: 'Pendiente', PICKED_UP: 'Recogido', CANCELLED: 'Cancelado'
      };
      this.ordersData = {
        labels: dtos.map(d => labelMap[d.status]),
        datasets: [{ data: dtos.map(d => d.count), backgroundColor: ['#f59e0b','#22c55e','#ef4444'], hoverOffset: 12 }]
      };
      this.ordersLoading = false;
    });
  }

  private loadTopProducts(): void {
    this.metrics.getTopProducts().subscribe(dtos => {
      const labels = dtos.map(d => d.productName);

      this.radarData = {
        labels,
        datasets: [
          {
            label: 'Unidades vendidas',
            data: dtos.map(d => d.totalSold),
            borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.2)',
            pointBackgroundColor: '#6366f1', pointHoverRadius: 6
          },
          {
            label: 'Ingresos (€)',
            data: dtos.map(d => d.totalRevenue),
            borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)',
            pointBackgroundColor: '#f59e0b', pointHoverRadius: 6
          }
        ]
      };
      this.radarLoading = false;

      this.polarData = {
        labels,
        datasets: [{
          data: dtos.map(d => d.totalRevenue),
          backgroundColor: ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4']
        }]
      };
      this.polarLoading = false;

      this.metrics.getSalesByPeriod('week').subscribe(sales => {
        this.mixedData = {
          labels: sales.map(d => d.period),
          datasets: [
            {
              type: 'bar',
              label: 'Ventas (€)',
              data: sales.map(d => d.totalAmount),
              backgroundColor: 'rgba(99,102,241,0.7)',
              borderRadius: 4,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: 'Tickets',
              data: sales.map(d => d.ticketCount),
              borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)',
              tension: 0.4, fill: false,
              pointRadius: 5, pointHoverRadius: 8,
              yAxisID: 'y2'
            }
          ]
        };
        this.mixedLoading = false;
      });
    });
  }
}
