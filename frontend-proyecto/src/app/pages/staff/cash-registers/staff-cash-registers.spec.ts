import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffCashRegistersPage } from './staff-cash-registers';
import {
  CashRegistersService,
  CashRegisterResponseDTO,
} from '../../../services/cash-registers/cash-registers.service';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth/auth.service';
import { MessageService } from 'primeng/api';

describe('StaffCashRegistersPage', () => {
  let component: StaffCashRegistersPage;
  let fixture: ComponentFixture<StaffCashRegistersPage>;
  let mockService: any;
  let mockAuth: any;

  const mockRecord: CashRegisterResponseDTO = {
    id: 123,
    employeeId: 1,
    employeeName: 'John Doe',
    cashAmount: 100,
    cardAmount: 50,
    openingCash: 100,
    closingCash: 200,
    openedAt: '2024-04-27T08:00:00',
    closedAt: '2024-04-27T17:00:00',
  };

  beforeEach(async () => {
    mockAuth = {
      currentUser: jest.fn().mockReturnValue({ id: 7, name: 'Manager', role: 'MANAGER' }),
      currentRole: jest.fn().mockReturnValue('MANAGER')
    };

    mockService = {
      openRegister: jest.fn(),
      closeRegister: jest.fn(),
      getAll: jest.fn().mockReturnValue(of([mockRecord])),
      getOpenRegisters: jest.fn().mockReturnValue(of([])),
      getById: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [StaffCashRegistersPage],
      providers: [
        { provide: CashRegistersService, useValue: mockService },
        { provide: AuthService, useValue: mockAuth },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffCashRegistersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the active register on init', () => {
    expect(mockService.getAll).toHaveBeenCalled();
    expect(component['activeRegister']()).toBeNull();
    expect(component['pastRegisters']()).toEqual([mockRecord]);
  });

  it('should show "No Active Register" when activeRegister is null', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h2').textContent).toContain('New Day, New Shift');
  });

  it('should open the dialog in OPEN mode when clicking Open Cash Register', () => {
    component['onOpenRegister']();
    expect(component['showDialog']()).toBe(true);
    expect(component['dialogMode']()).toBe('OPEN');
    expect(component['formConfig']().some((field) => field.key === 'employeeId')).toBe(false);
  });

  it('should call openRegister and update state when saving in OPEN mode', () => {
    const formData = { openingCash: 50, openedAt: '2024-04-27T08:00:00' };
    const newRecord = { ...mockRecord, employeeId: 7, openingCash: 50 };
    mockService.openRegister.mockReturnValue(of(newRecord));

    component['dialogMode'].set('OPEN');
    component['onSave'](formData);

    expect(mockService.openRegister).toHaveBeenCalledWith({
      employeeId: 7,
      openingCash: 50,
      openedAt: '2024-04-27T08:00:00',
    });
    expect(component['activeRegister']()).toEqual(newRecord);
    expect(component['showDialog']()).toBe(false);
    expect(component['statusMessage']()).toBe('Cash register updated successfully.');
  });

  it('should call closeRegister when saving in CLOSE mode', () => {
    component['activeRegister'].set(mockRecord);

    const closeData = { closingCash: 200, closedAt: '2024-04-27T17:00:00' };
    const closedRecord = { ...mockRecord, closingCash: 200 };
    mockService.closeRegister.mockReturnValue(of(closedRecord));

    component['dialogMode'].set('CLOSE');
    component['onSave'](closeData);

    expect(mockService.closeRegister).toHaveBeenCalledWith(mockRecord.id, closeData);
    expect(component['activeRegister']()).toBeNull();
    expect(component['pastRegisters']()[0]).toEqual(closedRecord);
  });

  it('should handle errors when saving fails', () => {
    mockService.openRegister.mockReturnValue(throwError(() => new Error('Fail')));
    component['dialogMode'].set('OPEN');
    component['onSave']({});
    expect(component['errorMessage']()).toBe('Error saving cash register data.');
  });

  it('should handle error when opening a register', () => {
    mockService.openRegister.mockReturnValue(throwError(() => new Error('Server Error')));
    component['dialogMode'].set('OPEN');

    component['onSave']({ openingCash: 50 });

    expect(component['errorMessage']()).toBe('Error saving cash register data.');
    expect(component['statusMessage']()).toBeNull();
  });

  it('should handle error when closing a register', () => {
    component['activeRegister'].set(mockRecord);
    mockService.closeRegister.mockReturnValue(throwError(() => new Error('Server Error')));
    component['dialogMode'].set('CLOSE');

    component['onSave']({ closingCash: 200 });

    expect(component['errorMessage']()).toBe('Error saving cash register data.');
  });

  describe('Formatters', () => {
    it('should format currency correctly', () => {
      const result = component['formatCurrency'](1234.5).replace(/\s/g, ' ');
      expect(result).toContain("1234,50 €");
      expect(component['formatCurrency'](null)).toBe('—');
      expect(component['formatCurrency'](undefined)).toBe('—');
    });

    it('should format date time correctly', () => {
      const isoDate = '2024-04-27T08:00:00';
      const formatted = component['formatDateTime'](isoDate);
      expect(formatted).not.toBe('—');
      expect(component['formatDateTime']('')).toBe('—');
      expect(component['formatDateTime'](null)).toBe('—');
    });

    it('should return empty string for invalid dates in getDateKey', () => {
      expect(component['getDateKey']('')).toBe('');
      expect(component['getDateKey']('invalid-date')).toBe('');
    });
  });

  // it('should return correct form config based on dialogMode', () => {
  //   component['dialogMode'].set('OPEN');
  //   fixture.detectChanges();
  //   let config = component['formConfig']();
  //   expect(config.some(c => c.key === 'openingCash')).toBe(true);
  //   expect(config.some(c => c.key === 'employeeId')).toBe(true);

  //   component['dialogMode'].set('CLOSE');
  //   fixture.detectChanges();
  //   config = component['formConfig']();
  //   expect(config.some(c => c.key === 'closingCash')).toBe(true);
  //   expect(config.some(c => c.key === 'closedAt')).toBe(true);
  // });
  describe('checkDescuadre', () => {
    it('should return empty string if register is open', () => {
      const row = { id: 1, closedAt: null };
      expect(component['checkDescuadre'](row)).toBe('');
    });

    it('should return row-cuadre if closingCash matches opening + cashAmount', () => {
      const row = { id: 1, closedAt: '2024-04-27T17:00:00', openingCash: 100, cashAmount: 50, closingCash: 150 };
      expect(component['checkDescuadre'](row)).toBe('row-cuadre');
    });

    it('should return row-descuadre if closingCash does not match opening + cashAmount', () => {
      const row = { id: 1, closedAt: '2024-04-27T17:00:00', openingCash: 100, cashAmount: 50, closingCash: 160 };
      expect(component['checkDescuadre'](row)).toBe('row-descuadre');
    });
  });

  describe('Filters', () => {
    it('should filter past registers by employee ID', () => {
      component['pastRegisters'].set([
        { id: 1, employeeId: 10, employeeName: 'Alice', openedAt: '2024-04-27T17:00:00', closedAt: '2024-04-27T17:00:00' },
        { id: 2, employeeId: 20, employeeName: 'Bob', openedAt: '2024-04-27T17:00:00', closedAt: '2024-04-27T17:00:00' },
      ]);
      
      component['managerFilter'].set('20');
      
      const filtered = component['filteredPastRegisters']();
      expect(filtered.length).toBe(1);
      expect(filtered[0]['employeeName']).toBe('Bob');
    });
  });

  describe('Analysis Logic', () => {
    it('should calculate correct stats for past registers', () => {
      const mockData = [
        { id: 1, openingCash: 100, cashAmount: 50, cardAmount: 30, closingCash: 150, closedAt: '2024-01-01T10:00:00Z' }, // Cuadra
        { id: 2, openingCash: 100, cashAmount: 50, cardAmount: 20, closingCash: 140, closedAt: '2024-01-02T10:00:00Z' }, // Descuadre de 10
      ];
      component['pastRegisters'].set(mockData);
      
      const stats = component['analysisStats']();
      expect(stats).toBeTruthy();
      if (stats) {
        expect(stats.totalRegisters).toBe(2);
        expect(stats.totalSales).toBe(150); // (50+30) + (50+20) = 80 + 70 = 150
        expect(stats.discrepancyCount).toBe(1);
        expect(stats.totalDiscrepancySum).toBe(10);
        expect(stats.accuracyRate).toBe(50);
      }
    });

    it('should return null if no past registers exist', () => {
      component['pastRegisters'].set([]);
      expect(component['analysisStats']()).toBeNull();
    });
  });
});
