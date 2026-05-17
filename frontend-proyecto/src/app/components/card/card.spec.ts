import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from './card';

describe('Card (direct tests)', () => {
  let fixture: ComponentFixture<Card>;
  let component: Card;
  let hostElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Card],
    }).compileComponents();

    fixture = TestBed.createComponent(Card);
    component = fixture.componentInstance;
    hostElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set host interactive attributes when clickable=true', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();

    expect(hostElement.getAttribute('role')).toBe('button');
    expect(hostElement.getAttribute('tabindex')).toBe('0');
    expect(hostElement.classList.contains('ui-card-clickable')).toBe(true);
  });

  it('should remove host interactive attributes when clickable=false', () => {
    fixture.componentRef.setInput('clickable', false);
    fixture.detectChanges();

    expect(hostElement.getAttribute('role')).toBeNull();
    expect(hostElement.getAttribute('tabindex')).toBeNull();
    expect(hostElement.classList.contains('ui-card-clickable')).toBe(false);
  });

  it('should emit cardClick when clicked and clickable=true', () => {
    const emitted: MouseEvent[] = [];
    component.cardClick.subscribe((event) => emitted.push(event));

    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();

    hostElement.click();

    expect(emitted).toHaveLength(1);
  });

  it('should not emit cardClick when clicked and clickable=false', () => {
    const emitted: MouseEvent[] = [];
    component.cardClick.subscribe((event) => emitted.push(event));

    fixture.componentRef.setInput('clickable', false);
    fixture.detectChanges();

    hostElement.click();

    expect(emitted).toHaveLength(0);
  });

  it('should emit cardClick on Enter and Space keydown when clickable=true', () => {
    const emitted: MouseEvent[] = [];
    component.cardClick.subscribe((event) => emitted.push(event));

    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();

    hostElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    hostElement.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(emitted).toHaveLength(2);
  });

  it('should not emit cardClick when interactive targets are clicked', () => {
    const emitted: MouseEvent[] = [];
    component.cardClick.subscribe((event) => emitted.push(event));

    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const button = document.createElement('button');
    const link = document.createElement('a');
    const input = document.createElement('input');
    const customStop = document.createElement('div');
    customStop.setAttribute('data-stop-card-click', '');

    (component as any).handleCardClick({ target: button } as unknown as MouseEvent);
    (component as any).handleCardClick({ target: link } as unknown as MouseEvent);
    (component as any).handleCardClick({ target: input } as unknown as MouseEvent);
    (component as any).handleCardClick({ target: customStop } as unknown as MouseEvent);

    expect(emitted).toHaveLength(0);
  });

  it('should pass header, subheader and styleClass inputs to rendered card', () => {
    fixture.componentRef.setInput('header', 'Header Value');
    fixture.componentRef.setInput('subheader', 'Subheader Value');
    fixture.componentRef.setInput('styleClass', 'test-card-class');
    fixture.componentRef.setInput('cardStyle', { 'min-height': '100px' });
    fixture.detectChanges();

    const rootCard = hostElement.querySelector('.p-card') as HTMLElement;
    const title = hostElement.querySelector('.p-card-title') as HTMLElement;
    const subtitle = hostElement.querySelector('.p-card-subtitle') as HTMLElement;

    expect(rootCard).toBeTruthy();
    expect(rootCard.classList.contains('test-card-class')).toBe(true);
    expect(title?.textContent?.trim()).toBe('Header Value');
    expect(subtitle?.textContent?.trim()).toBe('Subheader Value');
  });
});
