export interface ErrorResponse {
  status: number;
  message: string;
  errors?: Record<string, string>;
}
