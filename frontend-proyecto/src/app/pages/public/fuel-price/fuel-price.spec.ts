import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FuelPrice } from './fuel-price';
import { FuelService } from '../../../services/fuel/fuel.service';
import { of, throwError } from 'rxjs';

describe('FuelPriceComponent', () => {
  let component: FuelPrice;
  let fixture: ComponentFixture<FuelPrice>;
  let mockFuelService: any;

  beforeEach(async () => {
    mockFuelService = {
      getAll: jest.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [FuelPrice], // Standalone component
      providers: [{ provide: FuelService, useValue: mockFuelService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FuelPrice);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('formatHorario', () => {
    it('should format schedule correctly', () => {
      expect(component.formatHorario('L-D: 24H')).toBe('Monday to Sunday: 24 Hours');
      expect(component.formatHorario('L-V: 08:00')).toBe('Monday to Friday: 08:00');
      expect(component.formatHorario('L-S: 12:00')).toBe('Monday to Saturday: 12:00');
    });

    it('should return "No information" when horario is empty or null', () => {
      expect(component.formatHorario('')).toBe('No information');
      expect(component.formatHorario(null as unknown as string)).toBe('No information');
    });
  });

  describe('loadFuelPrices', () => {
    it('should fetch data and extract PLENERGY target station exclusively', () => {
      const mockData = [
        { IDEESS: '11111', Rótulo: 'OTHER', 'Precio Gasolina 95 E5': '1,200', Horario: 'L-D: 24H' },
        {
          IDEESS: '16015',
          Rótulo: 'PLENERGY',
          'Precio Gasolina 95 E5': '1,349',
          Horario: 'L-D: 24H',
        },
      ];
      mockFuelService.getAll.mockReturnValue(of(mockData));

      // Dispara ngOnInit
      fixture.detectChanges();

      expect(mockFuelService.getAll).toHaveBeenCalled();
      expect(component.gasolineras.length).toBe(1);
      expect(component.gasolineras[0]['Rótulo']).toBe('PLENERGY');
      expect(component.gasolineras[0]['HorarioFormateado']).toBe('Monday to Sunday: 24 Hours');
      expect(component.loading).toBe(false);
    });

    it('should initialize with empty array if target station is missing', () => {
      const mockData = [
        {
          IDEESS: '11111',
          Rótulo: 'OTHER STATION',
          'Precio Gasolina 95 E5': '1,200',
          Horario: 'L-D: 24H',
        },
      ];
      mockFuelService.getAll.mockReturnValue(of(mockData));

      fixture.detectChanges();

      expect(component.gasolineras.length).toBe(0);
      expect(component.loading).toBe(false);
    });

    it('should catch errors and hide the spinner', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFuelService.getAll.mockReturnValue(throwError(() => new Error('Error simulado de API')));

      fixture.detectChanges();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al recibir los datos:',
        expect.any(Error),
      );
      expect(component.loading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });
});
