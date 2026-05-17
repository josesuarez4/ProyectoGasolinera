import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { Dashboard } from './dashboard';
import { DashboardService, DashboardData } from '../../../services/dashboard/dashboard.service';
import { AuthService, SessionUser } from '../../../services/auth/auth.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAuthMock(user: SessionUser | null): Partial<AuthService> {
  return { currentUser: signal(user) as any };
}

const loggedInUser: SessionUser = {
  id: 1,
  email: 'test@test.com',
  name: 'Test',
  role: 'CLIENT',
  exp: 9999999999,
};

const mockActivities = [
  { id: 1, date: '2026-04-18', type: 'Online Order', total: 50.0, status: 'PENDING' },
  { id: 2, date: '2026-04-15', type: 'Online Order', total: 30.0, status: 'PICKED_UP' },
  { id: 3, date: '2026-04-10', type: 'Online Order', total: 100.0, status: 'CANCELLED' },
];

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let dashboardServiceMock: jest.Mocked<DashboardService>;

  const buildModule = async (user: SessionUser | null, data: DashboardData) => {
    dashboardServiceMock = {
      getDashboardData: jest.fn().mockReturnValue(of(data)),
    } as any;

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AuthService, useValue: makeAuthMock(user) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should create', async () => {
    await buildModule(loggedInUser, { stats: [], activities: [] });
    expect(component).toBeTruthy();
  });

  it('should load stats and activities from service on init', async () => {
    const data: DashboardData = {
      stats: [
        { title: 'Total Spent', value: '€80.00' },
        { title: 'Average Spent', value: '€40.00' },
        { title: 'Valid Purchases', value: '2' },
      ],
      activities: mockActivities,
    };
    await buildModule(loggedInUser, data);

    expect(dashboardServiceMock.getDashboardData).toHaveBeenCalledWith(1);
    expect(component.clientSummary).toHaveLength(3);
    expect(component.clientSummary[0].value).toBe('€80.00');
    expect(component.clientSummary[1].value).toBe('€40.00');
    expect(component.clientSummary[2].value).toBe('2');
    expect(component.recentActivity).toHaveLength(3);
    expect(component.loading).toBe(false);
  });

  it('should not call service and show empty state when not logged in', async () => {
    await buildModule(null, { stats: [], activities: [] });

    expect(dashboardServiceMock.getDashboardData).not.toHaveBeenCalled();
    expect(component.clientSummary).toHaveLength(0);
    expect(component.loading).toBe(false);
  });

  it('should handle service error gracefully', async () => {
    dashboardServiceMock = {
      getDashboardData: jest.fn().mockReturnValue(throwError(() => new Error('fail'))),
    } as any;

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AuthService, useValue: makeAuthMock(loggedInUser) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading).toBe(false);
  });

  describe('Loyalty points visibility', () => {
    it('should hide loyalty points when not in stats (unauthenticated/no card)', async () => {
      const data: DashboardData = {
        stats: [
          { title: 'Total Spent', value: '€0.00' },
          { title: 'Average Spent', value: '€0.00' },
          { title: 'Valid Purchases', value: '0' },
        ],
        activities: [],
      };
      await buildModule(loggedInUser, data);

      const pointsStat = component.clientSummary.find((s) => s.title === 'Loyalty Points');
      expect(pointsStat).toBeUndefined();
    });

    it('should show loyalty points when included in stats', async () => {
      const data: DashboardData = {
        stats: [
          { title: 'Total Spent', value: '€80.00' },
          { title: 'Average Spent', value: '€40.00' },
          { title: 'Valid Purchases', value: '2' },
          { title: 'Loyalty Points', value: '150' },
        ],
        activities: [],
      };
      await buildModule(loggedInUser, data);

      const pointsStat = component.clientSummary.find((s) => s.title === 'Loyalty Points');
      expect(pointsStat).toBeDefined();
      expect(pointsStat?.value).toBe('150');
    });
  });

  describe('getStatusSeverity', () => {
    beforeEach(async () => {
      await buildModule(loggedInUser, { stats: [], activities: [] });
    });

    it('should return warn for PENDING', () => {
      expect(component.getStatusSeverity('PENDING')).toBe('warn');
    });

    it('should return success for PICKED_UP', () => {
      expect(component.getStatusSeverity('PICKED_UP')).toBe('success');
    });

    it('should return danger for CANCELLED', () => {
      expect(component.getStatusSeverity('CANCELLED')).toBe('danger');
    });
  });

  describe('getStatusLabel', () => {
    beforeEach(async () => {
      await buildModule(loggedInUser, { stats: [], activities: [] });
    });

    it('should return Spanish label for PENDING', () => {
      expect(component.getStatusLabel('PENDING')).toBe('Pendiente');
    });

    it('should return Spanish label for PICKED_UP', () => {
      expect(component.getStatusLabel('PICKED_UP')).toBe('Recogido');
    });

    it('should return Spanish label for CANCELLED', () => {
      expect(component.getStatusLabel('CANCELLED')).toBe('Cancelado');
    });
  });
});
