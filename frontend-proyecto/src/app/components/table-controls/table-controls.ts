import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

export interface SortOption {
  label: string;
  value: string;
}

export interface TableControlsEvent {
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-table-controls',
  standalone: true,
  imports: [ButtonModule, InputTextModule, TooltipModule],
  templateUrl: './table-controls.html',
  styleUrl: './table-controls.css',
})
export class TableControls {
  // Inputs (Signals)
  searchTerm = input('');
  sortBy = input('');
  sortOrder = input<'asc' | 'desc'>('asc');
  sortOptions = input<SortOption[]>([]);
  loading = input(false);

  // Outputs
  filterChanged = output<TableControlsEvent>();
  clearFilters = output<void>();
  refreshRequested = output<void>();

  onSearchChange(val: string): void {
    this.emitChange({ searchTerm: val });
  }

  onSortByChange(val: string): void {
  if (val === 'monthlySales') {
    this.emitChange({ sortBy: val, searchTerm: '' });
  } else {
    this.emitChange({ sortBy: val });
  }
}

  toggleSortOrder(): void {
    const nextOrder = this.sortOrder() === 'asc' ? 'desc' : 'asc';
    this.emitChange({ sortOrder: nextOrder });
  }

  onClearFilters(): void {
    this.clearFilters.emit();
  }

  onRefresh(): void {
    this.refreshRequested.emit();
  }

  private emitChange(overrides: Partial<TableControlsEvent>): void {
    this.filterChanged.emit({
      searchTerm: overrides.searchTerm ?? this.searchTerm(),
      sortBy: overrides.sortBy ?? this.sortBy(),
      sortOrder: overrides.sortOrder ?? this.sortOrder(),
    });
  }
}
