import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RxStomp } from '@stomp/rx-stomp';
import { myRxStompConfig } from '../../config/websocket.config';
import { Observable, map, EMPTY } from 'rxjs';

export interface UserNotification {
  id: number;
  recipientId: number;
  recipientName: string;
  message: string;
  type: 'ORDER_PICKUP_DEADLINE_REMINDER' | 'ORDER_PICKUP_REMINDER' | 'ORDER_PICKUP' | 'ORDER_CANCELLED' | 'SUPPLIER_ORDER_APPROVAL' | 'ONLINE_ORDER_CREATED' | 'GENERAL_ANNOUNCEMENT';
  status: 'ACTIVE' | 'READ';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  sendNotificationAll(message: string, type: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/all`, { message, type });
  }
  private readonly http = inject(HttpClient);
  private rxStomp?: RxStomp;
  private readonly apiUrl = 'http://localhost:8080/notifications';
  private activeToken: string | null = null;

  // Se inicia la conexión WebSocket con el token de autenticación
  setupConnection(token: string) {
    if (!this.rxStomp) {
      this.rxStomp = new RxStomp();
    }

    if (this.activeToken === token) {
      return;
    }

    if (this.activeToken) {
      void this.rxStomp.deactivate();
    }

    const baseConfig = myRxStompConfig;
    const config = { ...baseConfig, connectHeaders: { Authorization: `Bearer ${token}` } };

    this.rxStomp.configure(config);
    this.rxStomp.activate();
    this.activeToken = token;
  }

  // Se escuchan notificaciones en tiempo real
  watchNotifications(): Observable<UserNotification> {
    if (!this.rxStomp) {
      console.warn('Intentando escuchar notificaciones antes de inicializar la conexión.');
      return EMPTY;
    }

    return this.rxStomp.watch('/user/queue/notifications').pipe(
      map(message => JSON.parse(message.body))
    );
  }

  // Se cargan las notificaciones históricas del usuario
  getHistory(userId: number): Observable<UserNotification[]> {
    return this.http.get<UserNotification[]>(`${this.apiUrl}/user/${userId}`);
  }

  // Se envía una notificación a un usuario (por ejemplo, un encargado a un empleado)
  sendNotification(recipientId: number, message: string, type: UserNotification['type']): Observable<UserNotification> {
    return this.http.post<UserNotification>(this.apiUrl, {
      recipientId,
      message,
      type,
      status: 'ACTIVE'
    });
  }

  // Se marca una notificación como leída
  markAsRead(id: number): Observable<UserNotification> {
    return this.http.patch<UserNotification>(`${this.apiUrl}/${id}/read`, {});
  }

  // Se cierra la conexión WebSocket
  disconnect(): void {
    if (this.rxStomp && this.activeToken) {
      void this.rxStomp.deactivate();
      this.activeToken = null;
    }
  }

  sendNotificationToAll(message: string, type: 'ORDER_PICKUP' | 'SUPPLIER_ORDER_APPROVAL'): Observable<any> {
    return this.http.post(`${this.apiUrl}/all`, { message, type });
  }
}