import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandPrediction, PredictionConfig } from '../models/prediction.model';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private apiUrl = `http://localhost:8080/reports/predictive`;

  constructor(private http: HttpClient) {}

  predictDemand(config: PredictionConfig): Observable<DemandPrediction> {
    let params = new HttpParams()
      .set('productId', config.productId.toString())
      .set('horizonDays', config.horizonDays.toString())
      .set('includeSeasonalFactors', config.includeSeasonalFactors.toString());

    return this.http.get<DemandPrediction>(this.apiUrl, { params });
  }
}
