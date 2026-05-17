import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule, TablePageEvent as PrimeTablePageEvent } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { SortEvent } from 'primeng/api';

export interface TableRow {
  id?: string | number;
  [key: string]: unknown;
}

export interface TableColumn<T extends TableRow = TableRow> {
  field: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  cellClass?: string;
  emptyValue?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null;
  valueAccessor?: (row: T) => unknown;
  formatter?: (value: unknown, row: T) => string;
}

export interface TableAction<T extends TableRow = TableRow> {
  id: string;
  label: string;
  icon: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast';
  appearance?: 'solid' | 'outlined' | 'text';
  styleClass?: string;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface TableActionEvent<T extends TableRow = TableRow> {
  action: TableAction<T>;
  row: T;
  rowIndex: number;
}

export interface TableRowClickEvent<T extends TableRow = TableRow> {
  row: T;
  rowIndex: number;
}

@Component({
  selector: 'app-table',
  imports: [TableModule, ButtonModule, TooltipModule],
  templateUrl: './table.html',
  styleUrl: './table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table {
  title = input('');
  description = input('');
  entityLabel = input('records');
  loading = input(false);
  emptyMessage = input('No records available.');
  rows = input<TableRow[]>([]);
  columns = input<TableColumn[]>([]);
  actions = input<TableAction[]>([]);
  actionColumnPosition = input<'start' | 'end'>('end');
  paginator = input(false);
  rowsPerPage = input(10);
  totalRecords = input<number | null>(null);
  first = input(0);
  rowsPerPageOptions = input<number[]>([10, 25, 50]);
  showCurrentPageReport = input(false);
  currentPageReportTemplate = input('Showing {first} to {last} of {totalRecords} entries');
  rowTrackBy = input<((row: TableRow, rowIndex: number) => unknown) | null>(null);
  rowClickable = input(false);
  rowClass = input<((row: TableRow) => string) | null>(null);

  actionTriggered = output<TableActionEvent>();
  rowClicked = output<TableRowClickEvent>();
  pageChanged = output<PrimeTablePageEvent>();

  private readonly sortField = signal<string | null>(null);
  private readonly sortOrder = signal<number>(1);

  protected readonly hasActions = computed(() => this.actions().length > 0);
  protected readonly resolvedTotalRecords = computed(
    () => this.totalRecords() ?? this.displayRows().length,
  );

  protected readonly displayRows = computed(() => {
    const rows = this.rows();
    const field = this.sortField();
    if (!field) return rows;

    const order = this.sortOrder();
    const column = this.columns().find((c) => c.field === field);

    return [...rows].sort((a, b) => {
      const aVal = column?.sortValue ? column.sortValue(a) : (a[field] ?? '');
      const bVal = column?.sortValue ? column.sortValue(b) : (b[field] ?? '');

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return order;
      if (bVal == null) return -order;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * order;
      }

      const aText = this.toSortableText(aVal);
      const bText = this.toSortableText(bVal);

      return aText.localeCompare(bText, undefined, { numeric: true }) * order;
    });
  });

  protected handleSort(event: SortEvent): void {
    if (event.field) {
      this.sortField.set(event.field);
      this.sortOrder.set(event.order ?? 1);
    }
  }

  emitAction(action: TableAction, row: TableRow, rowIndex: number): void {
    this.actionTriggered.emit({ action, row, rowIndex });
  }

  emitRowClick(row: TableRow, rowIndex: number): void {
    this.rowClicked.emit({ row, rowIndex });
  }

  emitPageChange(event: PrimeTablePageEvent): void {
    this.pageChanged.emit(event);
  }

  protected getCellValue(column: TableColumn, row: TableRow): string {
    const rawValue = column.valueAccessor ? column.valueAccessor(row) : row[column.field];
    const normalizedValue = rawValue ?? column.emptyValue ?? '—';

    if (column.formatter) {
      return column.formatter(normalizedValue, row);
    }

    if (normalizedValue === '—') {
      return normalizedValue;
    }

    if (Array.isArray(normalizedValue)) {
      return normalizedValue.length > 0 ? normalizedValue.join(', ') : (column.emptyValue ?? '—');
    }

    if (typeof normalizedValue === 'object') {
      return JSON.stringify(normalizedValue);
    }

    if (typeof normalizedValue === 'string') {
      return normalizedValue;
    }

    if (typeof normalizedValue === 'number' || typeof normalizedValue === 'boolean') {
      return `${normalizedValue}`;
    }

    return column.emptyValue ?? '—';
  }

  protected isActionVisible(action: TableAction, row: TableRow): boolean {
    return action.visible ? action.visible(row) : true;
  }

  protected isActionDisabled(action: TableAction, row: TableRow): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  protected getRowClass(row: TableRow): string {
    const classes: string[] = [];
    const customClass = this.rowClass();

    if (customClass) {
      classes.push(customClass(row));
    }

    if (this.rowClickable()) {
      classes.push('staff-table-row-clickable');
    }

    return classes.join(' ');
  }

  private toSortableText(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toSortableText(item)).join(', ');
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return '';
  }

  protected trackRow(row: TableRow, rowIndex: number): unknown {
    const customTrackBy = this.rowTrackBy();

    if (customTrackBy) {
      return customTrackBy(row, rowIndex);
    }

    return row.id ?? rowIndex;
  }
}
