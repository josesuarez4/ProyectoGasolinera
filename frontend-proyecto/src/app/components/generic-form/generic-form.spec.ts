import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericForm, FormFieldConfig } from './generic-form';
import { Validators } from '@angular/forms';

describe('GenericForm', () => {
  let component: GenericForm;
  let fixture: ComponentFixture<GenericForm>;

  const mockConfig: FormFieldConfig[] = [
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text', 
      validators: [Validators.required] 
    },
    { 
      key: 'role', 
      label: 'Role', 
      type: 'select', 
      options: [{ label: 'Admin', value: 'ADMIN' }, { label: 'Client', value: 'CLIENT' }] 
    },
    { 
      key: 'loyaltyPoints', 
      label: 'Points', 
      type: 'number', 
      showIf: (val) => val.role === 'CLIENT' 
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericForm]
    }).compileComponents();

    fixture = TestBed.createComponent(GenericForm);
    component = fixture.componentInstance;
    
    // Usamos setInput para Angular moderno
    fixture.componentRef.setInput('config', mockConfig);
    fixture.componentRef.setInput('visible', true);
    
    fixture.detectChanges(); 
  });

  it('should create the form based on config', () => {
    // Verificamos que el control exista en el objeto form
    expect(component.form.get('name')).toBeDefined();
    expect(component.form.get('role')).toBeDefined();
    expect(component.form.get('loyaltyPoints')).toBeDefined();
  });

  it('should handle conditional visibility (showIf)', () => {
    const loyaltyControl = component.form.get('loyaltyPoints');
    
    // Inicialmente debe estar deshabilitado (role es '')
    expect(loyaltyControl?.disabled).toBe(true);

    // Cambiamos a CLIENT
    component.form.patchValue({ role: 'CLIENT' });
    expect(loyaltyControl?.enabled).toBe(true);

    // Cambiamos a ADMIN
    component.form.patchValue({ role: 'ADMIN' });
    expect(loyaltyControl?.disabled).toBe(true);
  });

  it('should emit data on submit if form is valid', () => {
    // CAMBIO: Sintaxis de Jest para espiar
    const emitSpy = jest.spyOn(component.onSave, 'emit');

    component.form.patchValue({ name: 'Test User', role: 'ADMIN' });
    
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test User',
      role: 'ADMIN'
    }));
  });

  it('should NOT emit data if form is invalid', () => {
    const emitSpy = jest.spyOn(component.onSave, 'emit');

    // Nombre vacío es inválido
    component.form.patchValue({ name: '', role: 'ADMIN' });
    
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should clean up subscriptions on destroy', () => {
    const sub = (component as any).valueChangeSub;
    const unsubscribeSpy = jest.spyOn(sub, 'unsubscribe');
    
    component.ngOnDestroy();
    
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});