import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StaffProfileService, StaffProfile } from './staff-profile.service';

describe('StaffProfileService', () => {
  let service: StaffProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StaffProfileService],
    });
    service = TestBed.inject(StaffProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch staff profile by ID', () => {
    const mockProfile: StaffProfile = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      birthDate: '1990-01-15',
      role: 'MANAGER',
      salary: 5000,
      startTime: '09:00',
      endTime: '17:00',
      days: 'Mon-Fri',
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
    };

    service.getStaffProfile(1).subscribe((profile) => {
      expect(profile).toEqual(mockProfile);
    });

    const req = httpMock.expectOne('http://localhost:8080/employees/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });
});
