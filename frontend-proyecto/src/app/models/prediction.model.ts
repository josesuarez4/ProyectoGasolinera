export interface PredictionPoint {
  date: string; // ISO format
  value: number;
}

export interface DemandPrediction {
  productId: number;
  productName: string;
  horizonDays: number;
  generatedAt: string;
  projections: PredictionPoint[];
  confidenceIntervalUpper: number;
  confidenceIntervalLower: number;
}

export interface PredictionConfig {
  productId: number;
  horizonDays: number;
  includeSeasonalFactors: boolean;
}
