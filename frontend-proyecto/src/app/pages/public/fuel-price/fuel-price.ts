import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FuelService } from '../../../services/fuel/fuel.service';
import { Card } from '../../../components/card/card';

@Component({
  selector: 'app-fuel-price',
  standalone: true,
  imports: [CommonModule, Card, TagModule, ProgressSpinnerModule],
  templateUrl: './fuel-price.html',
  styleUrl: './fuel-price.css',
})
export class FuelPrice implements OnInit {
  gasolineras: any[] = [];
  loading: boolean = true;

  constructor(
    private fuelService: FuelService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFuelPrices();
  }

  loadFuelPrices() {
    this.fuelService.getAll().subscribe({
      next: (data: any) => {
        console.log(data);
        //Filters by station ID
        const targetStation = data.find(
          (g: any) => g['IDEESS'] === '16015' || g['Rótulo'] === 'PLENERGY',
        );

        if (targetStation && targetStation['Horario']) {
          targetStation['HorarioFormateado'] = this.formatHorario(targetStation['Horario']);
        }

        this.gasolineras = targetStation ? [targetStation] : [];
        this.loading = false;

        //Detects changes in the view
        this.cdr.detectChanges();

        console.log('Datos cargados y vista actualizada');
      },
      error: (error: any) => {
        console.error('Error al recibir los datos:', error);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  formatHorario(horario: string): string {
    if (!horario) return 'No information';

    let formatted = horario;
    formatted = formatted.replace(/L-D/g, 'Monday to Sunday');
    formatted = formatted.replace(/L-V/g, 'Monday to Friday');
    formatted = formatted.replace(/L-S/g, 'Monday to Saturday');
    formatted = formatted.replace(/S-D/g, 'Saturday to Sunday');
    formatted = formatted.replace(/ 24H/gi, ' 24 Hours');
    formatted = formatted.replace(/: 24H/gi, ': 24 Hours');

    return formatted;
  }
}
