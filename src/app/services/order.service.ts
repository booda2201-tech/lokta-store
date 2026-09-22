import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderData } from '../models/order.model';

export interface OrderResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  submitOrder(order: OrderData): Observable<OrderResponse> {
    return this.http.post<OrderResponse>('/api/send-order', order);
  }
}
