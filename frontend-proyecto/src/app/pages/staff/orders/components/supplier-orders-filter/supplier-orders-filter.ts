import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-supplier-orders-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './supplier-orders-filter.html',
  styleUrl: './supplier-orders-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierOrdersFilterComponent {
  nameFilter = input.required<string>();
  creatorFilter = input.required<string>();
  dateFilter = input.required<string>();
  statusFilter = input.required<string>();
  statusOptions = input.required<{ label: string; value: string }[]>();
  dateSortOrder = input.required<'asc' | 'desc'>();
  hasActiveFilters = input.required<boolean>();

  nameFilterChange = output<string>();
  creatorFilterChange = output<string>();
  dateFilterChange = output<string>();
  statusFilterChange = output<string>();
  toggleDateSort = output<void>();
  clearFilters = output<void>();
}
