import { Component, Input, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Componente genérico de gráficas — wrapper de p-chart (PrimeNG).
 *
 * Cada tipo de gráfica tiene opciones por defecto incorporadas (animación, tooltips,
 * ejes, leyenda). El consumidor puede sobreescribir cualquier opción pasando [options],
 * que se fusiona en profundidad (deep merge) sobre los defaults.
 *
 * Uso mínimo:
 *   <app-chart type="line" [data]="chartData" [loading]="isLoading" />
 *
 * Uso con overrides:
 *   <app-chart type="bar" [data]="chartData" [options]="{ scales: { x: { stacked: true } } }" />
 *
 * Responsabilidades del smart component consumidor:
 *   1. Suscribirse al servicio y recibir DTOs.
 *   2. Mapear los DTOs al formato ChartData de Chart.js.
 *   3. Pasar [data] y, solo si necesita, [options] con overrides puntuales.
 *
 * Referencias:
 *   - Inyección HTML / eventos Angular → PrimeNG: https://primeng.org/chart
 *   - Opciones visuales internas (ejes, tooltips, colores) → Chart.js: https://www.chartjs.org/docs/
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [ChartModule, SkeletonModule, NgStyle],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.css'
})
export class ChartComponent implements OnChanges {

  /** Tipo de gráfica. Valores válidos según Chart.js. */
  @Input() type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' = 'bar';

  /**
   * Datos en formato Chart.js:
   * { labels: string[], datasets: { label, data, backgroundColor, ... }[] }
   * Ver: https://www.chartjs.org/docs/latest/general/data-structures.html
   */
  @Input() data: any = null;

  /**
   * Overrides puntuales sobre las opciones por defecto del tipo.
   * Se fusionan en profundidad: solo hace falta pasar lo que difiere del default.
   * Ver defaults en getDefaultOptions() de este componente.
   * Ver opciones completas: https://www.chartjs.org/docs/latest/configuration/
   */
  @Input() options: any = {};

  /** Título mostrado sobre la gráfica. */
  @Input() title: string = '';

  /** Altura del componente. Afecta al skeleton y a la gráfica. */
  @Input() height: string = '300px';

  /**
   * Mientras sea true muestra p-skeleton en lugar de la gráfica.
   * Pasar a false cuando los datos del servicio estén listos.
   */
  @Input() loading: boolean = false;

  /** Mensaje para el estado vacío (sin datos tras la llamada HTTP). */
  @Input() emptyMessage: string = 'No hay datos disponibles para este periodo';

  /** Opciones finales = defaults del tipo + overrides del consumidor. */
  resolvedOptions: any = {};

  /** Renderizado solo en browser — Chart.js manipula el DOM (<canvas>). */
  readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['type'] || changes['options']) {
      this.resolvedOptions = this.deepMerge(this.getDefaultOptions(), this.options ?? {});
    }
  }

  get hasData(): boolean {
    return (
      this.data != null &&
      Array.isArray(this.data.datasets) &&
      this.data.datasets.length > 0 &&
      Array.isArray(this.data.labels) &&
      this.data.labels.length > 0
    );
  }

  // ─── Defaults por tipo ──────────────────────────────────────────────────────

  private getDefaultOptions(): any {
    const isDark = this.isBrowser && document.documentElement.classList.contains('my-app-dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const labelColor = isDark ? '#f8fafc' : '#0f172a';

    const base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: labelColor, font: { size: 12, weight: '500' } }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#64748b',
          borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: true
        }
      }
    };

    const pctTooltip = (ctx: any): string => {
      const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
      const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
      return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
    };

    const defaults: Record<string, any> = {
      line: {
        ...base,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          ...base.plugins,
          tooltip: {
            ...base.plugins.tooltip,
            callbacks: {
              label: (ctx: any) => ` ${ctx.dataset.label ?? ''}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { maxTicksLimit: 6, color: textColor },
            grid: { color: gridColor }
          },
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      },

      bar: {
        ...base,
        animation: { duration: 500, easing: 'easeInOutQuart' },
        plugins: {
          ...base.plugins,
          tooltip: {
            ...base.plugins.tooltip,
            callbacks: {
              label: (ctx: any) => ` ${ctx.dataset.label ?? ''}: ${ctx.parsed.y ?? ctx.parsed.x}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { maxTicksLimit: 6, color: textColor },
            grid: { color: gridColor }
          },
          x: {
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      },

      doughnut: {
        ...base,
        cutout: '65%',
        rotation: -90,
        animation: { animateRotate: true, animateScale: false, duration: 700 },
        plugins: {
          ...base.plugins,
          legend: { ...base.plugins.legend, position: 'bottom' },
          tooltip: { ...base.plugins.tooltip, callbacks: { label: pctTooltip } }
        }
      },

      pie: {
        ...base,
        animation: { animateRotate: true, duration: 800 },
        plugins: {
          ...base.plugins,
          legend: { ...base.plugins.legend, position: 'bottom' },
          tooltip: { ...base.plugins.tooltip, callbacks: { label: pctTooltip } }
        }
      },

      radar: {
        ...base,
        animation: { duration: 800 },
        plugins: { ...base.plugins, legend: { ...base.plugins.legend, position: 'top' } },
        scales: {
          r: {
            beginAtZero: true,
            ticks: { backdropColor: 'transparent', color: textColor },
            grid: { color: gridColor },
            angleLines: { color: gridColor },
            pointLabels: { color: labelColor, font: { size: 11 } }
          }
        }
      },

      polarArea: {
        ...base,
        animation: { animateRotate: true, animateScale: true, duration: 900 },
        plugins: {
          ...base.plugins,
          legend: { ...base.plugins.legend, position: 'right', labels: { ...base.plugins.legend.labels, boxWidth: 12 } }
        },
        scales: {
          r: {
            ticks: { backdropColor: 'transparent', color: textColor },
            grid: { color: gridColor }
          }
        }
      }
    };

    return defaults[this.type] ?? base;
  }

  // ─── Deep merge ─────────────────────────────────────────────────────────────

  /**
   * Fusiona `overrides` sobre `base` en profundidad.
   * Las funciones y arrays se reemplazan directamente (no se fusionan).
   */
  private deepMerge(base: any, overrides: any): any {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return base;
    if (!base    || typeof base     !== 'object' || Array.isArray(base))     return overrides;

    const result = { ...base };
    for (const key of Object.keys(overrides)) {
      const ov = overrides[key];
      const ba = base[key];
      const bothPlainObjects =
        ov !== null && typeof ov === 'object' && !Array.isArray(ov) && typeof ov !== 'function' &&
        ba !== null && typeof ba === 'object' && !Array.isArray(ba) && typeof ba !== 'function';

      result[key] = bothPlainObjects ? this.deepMerge(ba, ov) : ov;
    }
    return result;
  }
}
