export interface HttpRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
}

export interface HttpResponse {
  statusCode?: number;
}
