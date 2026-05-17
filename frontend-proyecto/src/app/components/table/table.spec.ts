import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Table, TableActionEvent, TableRowClickEvent } from './table';

describe('Table', () => {
  let component: Table;
  let fixture: ComponentFixture<Table>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Table],
    }).compileComponents();

    fixture = TestBed.createComponent(Table);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit action events for row buttons', () => {
    const emittedEvents: TableActionEvent[] = [];
    component.actionTriggered.subscribe((event) => emittedEvents.push(event));

    component.emitAction(
      { id: 'edit', label: 'Modify', icon: 'pi pi-pencil' },
      { id: 1, name: 'Fuel' },
      0,
    );

    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].action.id).toBe('edit');
    expect(emittedEvents[0].rowIndex).toBe(0);
  });

  it('should emit row click events when enabled', () => {
    const emittedEvents: TableRowClickEvent[] = [];
    component.rowClicked.subscribe((event) => emittedEvents.push(event));

    component.emitRowClick({ id: 2, name: 'Register' }, 3);

    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].row.id).toBe(2);
    expect(emittedEvents[0].rowIndex).toBe(3);
  });
});
