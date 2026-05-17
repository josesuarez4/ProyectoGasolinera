import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService, UserNotification } from './notification.service';
import { RxStomp } from '@stomp/rx-stomp';
import { of } from 'rxjs';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  const mockNotification: UserNotification = {
    id: 1,
    recipientId: 3,
    recipientName: 'Admin Hub',
    message: 'Test notification',
    type: 'ONLINE_ORDER_CREATED',
    status: 'ACTIVE',
    createdAt: '2026-04-28T10:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [NotificationService, provideHttpClientTesting()],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);

    jest.spyOn(RxStomp.prototype, 'configure').mockImplementation(() => {});
    jest.spyOn(RxStomp.prototype, 'activate').mockImplementation(() => {});
    jest.spyOn(RxStomp.prototype, 'deactivate').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setupConnection', () => {
    it('should initialize and activate RxStomp on first call', () => {
      const token = 'fake-jwt-token';
      
      service.setupConnection(token);

      expect(RxStomp.prototype.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          connectHeaders: { Authorization: `Bearer ${token}` },
        })
      );
      expect(RxStomp.prototype.activate).toHaveBeenCalled();
      expect(RxStomp.prototype.deactivate).not.toHaveBeenCalled(); 
    });

    it('should do nothing if called with the same token', () => {
      const token = 'fake-jwt-token';
      
      service.setupConnection(token);
      
      jest.clearAllMocks();
      
      service.setupConnection(token);

      expect(RxStomp.prototype.configure).not.toHaveBeenCalled();
      expect(RxStomp.prototype.activate).not.toHaveBeenCalled();
    });

    it('should deactivate old connection and create new one if token changes', () => {
      service.setupConnection('token-1');
      
      service.setupConnection('token-2');

      expect(RxStomp.prototype.deactivate).toHaveBeenCalled();
      expect(RxStomp.prototype.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          connectHeaders: { Authorization: `Bearer token-2` },
        })
      );
      expect(RxStomp.prototype.activate).toHaveBeenCalledTimes(2); 
    });
  });

  describe('watchNotifications', () => {
    it('should return EMPTY and warn if called before setupConnection', (done) => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      service.watchNotifications().subscribe({
        next: () => fail('Should not emit anything'),
        complete: () => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Intentando escuchar notificaciones antes de inicializar la conexión.'
          );
          done();
        },
      });
    });

    it('should return parsed messages from the websocket', (done) => {
      service.setupConnection('fake-token');

      const mockStompMessage = { body: JSON.stringify(mockNotification) };
      jest.spyOn(RxStomp.prototype, 'watch').mockReturnValue(of(mockStompMessage as any));

      service.watchNotifications().subscribe((notification) => {
        expect(RxStomp.prototype.watch).toHaveBeenCalledWith('/user/queue/notifications');
        expect(notification).toEqual(mockNotification);
        done();
      });
    });
  });

  describe('HTTP REST calls', () => {
    it('getHistory should perform GET request to correct URL', () => {
      const userId = 3;

      service.getHistory(userId).subscribe((history) => {
        expect(history).toEqual([mockNotification]);
      });

      const req = httpMock.expectOne(`http://localhost:8080/notifications/user/${userId}`);
      expect(req.request.method).toBe('GET');
      req.flush([mockNotification]);
    });

    it('markAsRead should perform PATCH request to correct URL', () => {
      const notifId = 1;
      const updatedMock = { ...mockNotification, status: 'READ' };

      service.markAsRead(notifId).subscribe((updated) => {
        expect(updated).toEqual(updatedMock);
      });

      const req = httpMock.expectOne(`http://localhost:8080/notifications/${notifId}/read`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(updatedMock);
    });
  });

  describe('disconnect', () => {
    it('should deactivate connection and clear token if connected', () => {
      service.setupConnection('fake-token');
      
      service.disconnect();

      expect(RxStomp.prototype.deactivate).toHaveBeenCalled();
      
      jest.clearAllMocks();
      service.setupConnection('fake-token');
      expect(RxStomp.prototype.activate).toHaveBeenCalled();
    });

    it('should do nothing if not connected', () => {
      service.disconnect();
      expect(RxStomp.prototype.deactivate).not.toHaveBeenCalled();
    });
  });
});