import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentData, Firestore, Query, QuerySnapshot, Unsubscribe, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from '@angular/fire/firestore';
import { OrderData, OrderItem, OrderStatus, StoredOrder } from '../models/order.model';

export interface OrderResponse {
  success: boolean;
  message: string;
}

const ORDERS_KEY = 'loqta-orders';
const MAX_STORED_ORDERS = 200;

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  // Optional so the order flow still works where no Firebase app is provided, such as the unit tests.
  private readonly firestore = inject(Firestore, { optional: true });
  private readonly ordersSignal = signal<StoredOrder[]>(this.loadOrders());
  readonly orders = this.ordersSignal.asReadonly();
  readonly cloudError = signal('');
  private liveOrders?: Unsubscribe;
  // Ids the cloud has already shown: an order that leaves the collection was deleted elsewhere.
  private cloudIds = new Set<string>();

  submitOrder(order: OrderData): Observable<OrderResponse> {
    this.saveOrder(this.withLinkableImages(order));
    return this.http.post<OrderResponse>('/api/send-order', order);
  }

  // The notifier gets every picture, uploads included. The studio's copy keeps links only: a photo
  // uploaded into the catalogue is a data url that would fill the browser's storage after a few orders.
  private withLinkableImages(order: OrderData): OrderData {
    const linkable = (image?: string): boolean => !!image && /^https?:\/\//i.test(image);
    const light = { ...order, items: order.items?.map(item => linkable(item.image) ? item : this.withoutImage(item)) };
    for (const key of ['productImage', 'imageUrl'] as const) {
      if (light[key] && !linkable(light[key])) delete light[key];
    }
    return light;
  }

  private withoutImage(item: OrderItem): OrderItem {
    const { image, ...rest } = item;
    return rest;
  }

  pieces(order: OrderData): number {
    return order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 1;
  }

  total(order: OrderData): number {
    return order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? order.price ?? 0;
  }

  setStatus(id: string, status: OrderStatus): void {
    this.persistOrders(this.ordersSignal().map(stored => stored.id === id ? { ...stored, status } : stored));
    if (this.firestore) {
      updateDoc(doc(this.firestore, 'orders', id), { status })
        .catch((error: unknown) => console.error('Failed to update the order status in Firestore', error));
    }
  }

  removeOrder(id: string): void {
    this.cloudIds.delete(id);
    this.persistOrders(this.ordersSignal().filter(stored => stored.id !== id));
    if (this.firestore) {
      deleteDoc(doc(this.firestore, 'orders', id))
        .catch((error: unknown) => console.error('Failed to delete the order from Firestore', error));
    }
  }

  // Only the studio watches orders in realtime, so shoppers never pay for the listener.
  startLiveOrders(): void {
    if (!this.firestore || this.liveOrders) return;
    this.liveOrders = onSnapshot(this.cloudOrders(), snapshot => {
      this.mergeCloud(snapshot);
      this.cloudError.set('');
    }, (error: unknown) => {
      console.error('Failed to watch the orders in Firestore', error);
      this.cloudError.set('الطلبات الجديدة مش بتوصل من السيرفر دلوقتي، بتشوف المحفوظ محلياً.');
    });
  }

  stopLiveOrders(): void {
    this.liveOrders?.();
    this.liveOrders = undefined;
  }

  // Orders placed from other devices only exist in Firestore, so the studio can also pull them on demand.
  async syncFromCloud(): Promise<void> {
    if (!this.firestore) return;
    this.mergeCloud(await getDocs(this.cloudOrders()));
  }

  private cloudOrders(): Query<DocumentData> {
    return query(collection(this.firestore!, 'orders'), orderBy('createdAt', 'desc'), limit(MAX_STORED_ORDERS));
  }

  // Firestore wins over the local copy: it carries the status every device writes to.
  private mergeCloud(snapshot: QuerySnapshot<DocumentData>): void {
    const cloud = snapshot.docs.map(document => this.fromCloud(document.id, document.data()));
    const ids = new Set(cloud.map(order => order.id));
    const merged = new Map(this.ordersSignal()
      .filter(stored => ids.has(stored.id) || !this.cloudIds.has(stored.id))
      .map(stored => [stored.id, stored]));
    cloud.forEach(order => merged.set(order.id, order));
    this.cloudIds = ids;
    this.persistOrders([...merged.values()]);
  }

  // Firestore only acknowledges a write once it reaches the server, so it stays off the
  // response path: an offline write is queued locally without delaying the Telegram notification.
  private saveOrder(order: OrderData): void {
    const stored: StoredOrder = { id: `order-${Date.now()}`, placedAt: new Date().toISOString(), status: 'جديد', details: order };
    this.persistOrders([stored, ...this.ordersSignal()]);
    if (!this.firestore) return;
    const fields = Object.entries(order).filter(([, value]) => value !== undefined && value !== '');
    setDoc(doc(this.firestore, 'orders', stored.id), {
      ...Object.fromEntries(fields), status: stored.status, placedAt: stored.placedAt, createdAt: serverTimestamp()
    }).catch((error: unknown) => console.error('Failed to save the order to Firestore', error));
  }

  private fromCloud(id: string, data: DocumentData): StoredOrder {
    const text = (key: string): string | undefined => typeof data[key] === 'string' ? data[key] as string : undefined;
    return {
      id,
      placedAt: text('placedAt') ?? new Date().toISOString(),
      status: this.toStatus(text('status')),
      details: {
        customerName: text('customerName') ?? '',
        phone: text('phone') ?? '',
        address: text('address') ?? '',
        productTitle: text('productTitle'),
        productImage: text('productImage'),
        size: text('size'),
        color: text('color'),
        price: typeof data['price'] === 'number' ? data['price'] as number : undefined,
        notes: text('notes'),
        items: Array.isArray(data['items']) ? data['items'] as OrderItem[] : undefined
      }
    };
  }

  private toStatus(value?: string): OrderStatus {
    const statuses: OrderStatus[] = ['جديد', 'تم التأكيد', 'تم التسليم', 'ملغي'];
    return statuses.find(status => status === value) ?? 'جديد';
  }

  private loadOrders(): StoredOrder[] {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.filter((entry): entry is StoredOrder =>
        !!entry && typeof entry.id === 'string' && typeof entry.placedAt === 'string' && !!entry.details);
    } catch { return []; }
  }

  private persistOrders(orders: StoredOrder[]): void {
    const sorted = [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, MAX_STORED_ORDERS);
    this.ordersSignal.set(sorted);
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(sorted)); } catch { /* In-memory state remains usable if storage is unavailable. */ }
  }
}
