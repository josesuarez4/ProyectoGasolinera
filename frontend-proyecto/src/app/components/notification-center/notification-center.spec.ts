import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { NotificationCenter } from './notification-center';
import { AuthService } from '../../services/auth/auth.service';
import {
  NotificationService,
  UserNotification,
} from '../../services/notification/notification.service';
import { of, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';

describe('NotificationCenter', () => {
  let component: NotificationCenter;
  let fixture: ComponentFixture<NotificationCenter>;

  // Mocks
  let authServiceMock: any;
  let notificationServiceMock: any;
  let watchNotificationsSubject: Subject<UserNotification>;

  const mockNotification: UserNotification = {
    id: 1,
    recipientId: 3,
    recipientName: 'Test',
    message: 'Test message',
    type: 'ORDER_PICKUP',
    status: 'ACTIVE',
    createdAt: '2026-04-28T10:00:00.000Z',
  };

  beforeEach(async () => {
    const mockUserSignal = signal<{ id: number } | null>({ id: 3 });
    const mockTokenSignal = signal<string | null>('fake-jwt-token');
    const mockRoleSignal = signal<string | null>('MANAGER');

    authServiceMock = {
      currentUser: mockUserSignal,
      token: mockTokenSignal,
      currentRole: mockRoleSignal,
    };

    watchNotificationsSubject = new Subject<UserNotification>();

    notificationServiceMock = {
      setupConnection: jest.fn(),
      disconnect: jest.fn(),
      getHistory: jest.fn().mockReturnValue(of([mockNotification])),
      watchNotifications: jest.fn().mockReturnValue(watchNotificationsSubject.asObservable()),
      markAsRead: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationCenter],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenter);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Computed Signals (unreadCount & badgeLabel)', () => {
    it('should correctly calculate unreadCount based on ACTIVE notifications', () => {
      component.notifications.set([
        { ...mockNotification, status: 'ACTIVE' },
        { ...mockNotification, id: 2, status: 'READ' },
        { ...mockNotification, id: 3, status: 'ACTIVE' },
      ]);

      expect(component.unreadCount()).toBe(2);
    });

    it('should show badge label as string if unreadCount > 0', () => {
      component.notifications.set([{ ...mockNotification, status: 'ACTIVE' }]);
      expect(component.badgeLabel()).toBe('1');
    });

    it('should return undefined for badgeLabel if unreadCount is 0', () => {
      component.notifications.set([{ ...mockNotification, status: 'READ' }]);
      expect(component.badgeLabel()).toBeUndefined();
    });
  });

  describe('Auth & WebSocket Effects', () => {
    it('should connect and load history if user is logged in', () => {
      expect(notificationServiceMock.setupConnection).toHaveBeenCalledWith('fake-jwt-token');
      expect(notificationServiceMock.getHistory).toHaveBeenCalledWith(3);
      expect(component.notifications().length).toBe(1);
    });

    it('should merge new live notification correctly', () => {
      const newNotif: UserNotification = {
        ...mockNotification,
        id: 99,
        createdAt: '2026-04-28T11:00:00.000Z',
      };

      watchNotificationsSubject.next(newNotif);

      expect(component.notifications().length).toBe(2);
      expect(component.notifications()[0].id).toBe(99);
    });

    it('should disconnect and clear notifications if user logs out', () => {
      authServiceMock.currentUser.set(null);
      authServiceMock.token.set(null);

      fixture.detectChanges();

      expect(notificationServiceMock.disconnect).toHaveBeenCalled();
      expect(component.notifications().length).toBe(0);
    });
  });

  describe('UI Actions (togglePanel & computePosition)', () => {
    it('should toggle panel state and calculate position', () => {
      expect(component.isOpen()).toBeFalsy();

      component.togglePanel();

      expect(component.isOpen()).toBeTruthy();
      expect(component.panelStyles()).not.toBeNull();
    });

    it('should clean up panel styles when closed', () => {
      component.isOpen.set(true);
      component.togglePanel(); // Cierra

      expect(component.isOpen()).toBeFalsy();
      expect(component.panelStyles()).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should NOT call API if notification is already READ', () => {
      const readNotif = { ...mockNotification, status: 'READ' } as UserNotification;

      component.markAsRead(readNotif);

      expect(notificationServiceMock.markAsRead).not.toHaveBeenCalled();
    });

    it('should call API and update signal if notification is ACTIVE', () => {
      const activeNotif = { ...mockNotification, status: 'ACTIVE' } as UserNotification;
      const updatedNotif = { ...mockNotification, status: 'READ' } as UserNotification;

      component.notifications.set([activeNotif]);

      notificationServiceMock.markAsRead.mockReturnValue(of(updatedNotif));

      component.markAsRead(activeNotif);

      expect(notificationServiceMock.markAsRead).toHaveBeenCalledWith(activeNotif.id);

      const notificationsInSignal = component.notifications();
      expect(notificationsInSignal[0].status).toBe('READ');
    });
  });

  describe('handleNotificationClick', () => {
    let routerNavigateSpy: jest.SpyInstance;

    beforeEach(() => {
      routerNavigateSpy = jest.spyOn(component['router'], 'navigate').mockResolvedValue(true);
      jest.spyOn(component, 'markAsRead').mockImplementation();
    });

    it('should mark as read and close panel', () => {
      component.isOpen.set(true);
      component.handleNotificationClick(mockNotification);
      
      expect(component.markAsRead).toHaveBeenCalledWith(mockNotification);
      expect(component.isOpen()).toBeFalsy();
    });

    it('should NOT navigate if user is CLIENT', () => {
      authServiceMock.currentRole.set('CLIENT');
      component.handleNotificationClick(mockNotification);
      expect(routerNavigateSpy).not.toHaveBeenCalled();
    });

    it('should navigate to client orders with orderId query param if ONLINE_ORDER_CREATED', () => {
      authServiceMock.currentRole.set('MANAGER');
      const notif = { ...mockNotification, type: 'ONLINE_ORDER_CREATED', message: 'Order #123 created' } as UserNotification;
      
      component.handleNotificationClick(notif);
      
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/staff/orders'], { queryParams: { view: 'client', orderId: '#123' }});
    });

    it('should navigate to supplier orders with orderId query param if SUPPLIER_ORDER_APPROVAL', () => {
      authServiceMock.currentRole.set('ADMIN');
      const notif = { ...mockNotification, type: 'SUPPLIER_ORDER_APPROVAL', message: 'Supplier Order #456 approved' } as UserNotification;
      
      component.handleNotificationClick(notif);
      
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/staff/orders'], { queryParams: { view: 'supplier', orderId: '#456' }});
    });

    it('should navigate without orderId if no ID found in message', () => {
      authServiceMock.currentRole.set('EMPLOYEE');
      const notif = { ...mockNotification, type: 'ONLINE_ORDER_CREATED', message: 'New order created' } as UserNotification;
      
      component.handleNotificationClick(notif);
      
      expect(routerNavigateSpy).toHaveBeenCalledWith(['/staff/orders'], { queryParams: { view: 'client' }});
    });
  });

  describe('markAllAsRead', () => {
    it('should NOT call API if there are no ACTIVE notifications', () => {
      component.notifications.set([{ ...mockNotification, status: 'READ' } as UserNotification]);
      component.markAllAsRead();
      expect(notificationServiceMock.markAsRead).not.toHaveBeenCalled();
    });

    it('should NOT call API if isMarkingAllRead is true', () => {
      component.notifications.set([{ ...mockNotification, status: 'ACTIVE' } as UserNotification]);
      component.isMarkingAllRead.set(true);
      component.markAllAsRead();
      expect(notificationServiceMock.markAsRead).not.toHaveBeenCalled();
    });

    it('should call API for all ACTIVE notifications and update state on success', () => {
      const active1 = { ...mockNotification, id: 1, status: 'ACTIVE' } as UserNotification;
      const active2 = { ...mockNotification, id: 2, status: 'ACTIVE' } as UserNotification;
      const read1 = { ...mockNotification, id: 3, status: 'READ' } as UserNotification;
      
      const updated1 = { ...active1, status: 'READ' } as UserNotification;
      const updated2 = { ...active2, status: 'READ' } as UserNotification;

      component.notifications.set([active1, active2, read1]);
      
      // We need to return an observable for each call
      notificationServiceMock.markAsRead.mockImplementation((id: number) => {
        if (id === 1) return of(updated1);
        if (id === 2) return of(updated2);
        return of(null);
      });

      component.markAllAsRead();

      expect(notificationServiceMock.markAsRead).toHaveBeenCalledTimes(2);
      expect(notificationServiceMock.markAsRead).toHaveBeenCalledWith(1);
      expect(notificationServiceMock.markAsRead).toHaveBeenCalledWith(2);

      const notificationsInSignal = component.notifications();
      expect(notificationsInSignal.length).toBe(3);
      expect(notificationsInSignal.every(n => n.status === 'READ')).toBe(true);
      expect(component.isMarkingAllRead()).toBe(false);
    });
  });

  describe('Formatting Utils', () => {
    it('should format notification type to human-readable label', () => {
      expect(component.formatType('ONLINE_ORDER_CREATED')).toBe('Online order');
      expect(component.formatType('UNKNOWN' as any)).toBe('Notification'); // Fallback test
    });

    it('should build aria label correctly', () => {
      const notif = {
        ...mockNotification,
        type: 'ORDER_PICKUP',
        message: 'Ready',
      } as UserNotification;
      expect(component.buildAriaLabel(notif)).toBe('Order ready: Ready');
    });
  });
});
