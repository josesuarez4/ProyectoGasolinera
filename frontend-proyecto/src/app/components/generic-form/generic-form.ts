import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

/**
 * Configuración para cada campo del formulario
 */
export interface FormFieldConfig {
  key: string;
  label: string;
  type:
    | 'text'
    | 'password'
    | 'email'
    | 'number'
    | 'currency'
    | 'select'
    | 'time'
    | 'date'
    | 'datetime-local';
  placeholder?: string;
  validators?: any[];
  options?: { label: string; value: any }[];
  colSpan?: string;
  showIf?: (formValue: any) => boolean;
}

@Component({
  selector: 'app-generic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
  ],
  templateUrl: './generic-form.html',
  styleUrl: './generic-form.css',
})
export class GenericForm implements OnInit, OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private valueChangeSub?: Subscription;

  @Input() title: string = 'Formulario';
  @Input() saveLabel: string = 'Guardar';
  @Input() visible: boolean = false;
  @Input() config: FormFieldConfig[] = [];
  @Input() initialData: any = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onSave = new EventEmitter<any>();

  form: FormGroup = this.fb.group({});

  ngOnInit() {
    this.buildForm();
  }

  /**
   * Reacciona cuando cambian los datos iniciales (ej: al pasar de Crear a Editar un usuario diferente)
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['config']) {
      this.buildForm();
    }
    if (changes['initialData'] && this.initialData) {
      // Enable all controls first — disabled controls are skipped by patchValue
      this.config.forEach((field) => this.form.get(field.key)?.enable({ emitEvent: false }));
      this.form.patchValue(this.initialData);
      this.syncConditionalControls();
    } else if (changes['initialData'] && !this.initialData) {
      this.form.reset();
      this.syncConditionalControls();
    }
  }

  private buildForm() {
    const group: any = {};
    this.config.forEach((field) => {
      group[field.key] = [
        this.initialData ? this.initialData[field.key] : '',
        field.validators || [],
      ];
    });
    this.form = this.fb.group(group);

    this.valueChangeSub?.unsubscribe();
    this.valueChangeSub = this.form.valueChanges.subscribe(() => {
      this.syncConditionalControls();
    });
    this.syncConditionalControls();
  }

  private syncConditionalControls(): void {
    this.config.forEach((field) => {
      if (!field.showIf) return;
      const control = this.form.get(field.key);
      if (!control) return;
      const visible = field.showIf(this.form.getRawValue());
      if (visible && control.disabled) {
        control.enable({ emitEvent: false });
      } else if (!visible && control.enabled) {
        control.disable({ emitEvent: false });
      }
    });
  }

  ngOnDestroy(): void {
    this.valueChangeSub?.unsubscribe();
  }

  submit() {
    if (this.form.valid) {
      // getRawValue() incluye valores de campos deshabilitados
      this.onSave.emit(this.form.getRawValue());
    } else {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsTouched();
      });
    }
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.form.reset();
  }
}
