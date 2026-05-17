import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StaffProfile {
  id: number;
  name: string;
  email: string;
  birthDate: string;
  role: 'MANAGER' | 'EMPLOYEE';
  salary: number;
  startTime: string;
  endTime: string;
  days: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class StaffProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/employees';

  getStaffProfile(id: number): Observable<StaffProfile> {
    return this.http.get<StaffProfile>(`${this.apiUrl}/${id}`);
  }
}
