import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ChartComponent } from './chart.component';

describe('ChartComponent', () => {
  let component: ChartComponent;
  let fixture: ComponentFixture<ChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }]
    }).compileComponents();

    fixture = TestBed.createComponent(ChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isBrowser should be true when platform is browser', () => {
    expect(component.isBrowser).toBe(true);
  });

  it('hasData should be false when data is null', () => {
    component.data = null;
    expect(component.hasData).toBe(false);
  });

  it('hasData should be false when datasets is empty array', () => {
    component.data = { labels: ['A', 'B'], datasets: [] };
    expect(component.hasData).toBe(false);
  });

  it('hasData should be false when labels is empty array', () => {
    component.data = { labels: [], datasets: [{ data: [1, 2] }] };
    expect(component.hasData).toBe(false);
  });

  it('hasData should be true with valid data', () => {
    component.data = {
      labels: ['Lunes', 'Martes'],
      datasets: [{ label: 'Ventas', data: [100, 200] }]
    };
    expect(component.hasData).toBe(true);
  });

  it('should show skeleton when loading is true', () => {
    component.loading = true;
    component.data = { labels: ['A'], datasets: [{ data: [1] }] };
    fixture.detectChanges();
    const skeleton = fixture.nativeElement.querySelector('p-skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('should show empty state when not loading and no data', () => {
    component.loading = false;
    component.data = null;
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.chart-empty');
    expect(empty).toBeTruthy();
  });

  it('should display custom emptyMessage', () => {
    component.loading = false;
    component.data = null;
    component.emptyMessage = 'Sin ventas este mes';
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.chart-empty__message');
    expect(msg?.textContent?.trim()).toBe('Sin ventas este mes');
  });

  it('should not render anything when platform is server', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ChartComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
    }).compileComponents();
    const serverFixture = TestBed.createComponent(ChartComponent);
    serverFixture.detectChanges();
    const container = serverFixture.nativeElement.querySelector('.chart-container');
    expect(container).toBeNull();
  });
});
