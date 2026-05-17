import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailView } from './detail-view';

describe('DetailView', () => {
  let component: DetailView;
  let fixture: ComponentFixture<DetailView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailView],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
