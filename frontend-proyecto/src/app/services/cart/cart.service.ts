import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// ── Public types ──────────────────────────────────────────────────────────────

/** Represents a single product line in the shopping cart. */
export interface CartItem {
  productId: number;
  name: string;
  price: number;     // unit sale price (€, excl. tax)
  quantity: number;
  stock: number;
  imageUrl?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** IGIC general rate for the Canary Islands (7 %). */
const IGIC_RATE = 0.07;

/** localStorage key used to persist the cart between sessions. */
const STORAGE_KEY = 'hub_cart';

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * CartService — single source of truth for the shopping cart.
 *
 * State is held in Angular Signals so any component reacts to changes
 * without explicit subscriptions or manual change-detection calls.
 *
 * Persistence is handled automatically: an effect writes to localStorage
 * on every mutation (browser-only; no-op during SSR).
 *
 * Mathematical precision: all monetary computed signals apply
 * `round2()` to eliminate floating-point residuals before they propagate.
 */
@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly platformId = inject(PLATFORM_ID);

  // ── Private mutable state ─────────────────────────────────────────────────

  /** Internal items array; initialised from localStorage if available. */
  private readonly _items = signal<CartItem[]>(this.loadFromStorage());

  /** Controls the cart drawer visibility across the app. */
  readonly isOpen = signal(false);

  // ── Public derived state (read-only computed) ─────────────────────────────

  /** Current list of cart items (immutable view). */
  readonly items = computed(() => this._items());

  /** Total number of units across all items. */
  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );

  /** Sum of (price × quantity) for all items, rounded to 2 decimals. */
  readonly subtotal = computed(() =>
    this.round2(
      this._items().reduce((sum, item) => sum + item.price * item.quantity, 0)
    )
  );

  /** IGIC amount (7 % of subtotal), rounded to 2 decimals. */
  readonly taxAmount = computed(() =>
    this.round2(this.subtotal() * IGIC_RATE)
  );

  /** Grand total (subtotal + IGIC), rounded to 2 decimals. */
  readonly total = computed(() =>
    this.round2(this.subtotal() + this.taxAmount())
  );

  constructor() {
    // Auto-persist cart to localStorage whenever items change (browser only).
    effect(() => {
      const items = this._items();
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    });
  }

  // ── Mutation methods ──────────────────────────────────────────────────────

  /**
   * Adds a product to the cart.
   * If the product already exists, increments its quantity instead of
   * creating a duplicate line.
   */
  addItem(item: CartItem): void {
    this._items.update(items => {
      const existing = items.find(i => i.productId === item.productId);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + item.quantity, existing.stock);
        return items.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: newQuantity }
            : i
        );
      }
      const initialQuantity = Math.min(item.quantity, item.stock);
      return [...items, { ...item, quantity: initialQuantity }];
    });
  }

  /**
   * Removes a product from the cart entirely.
   * @param productId - ID of the product to remove.
   */
  removeItem(productId: number): void {
    this._items.update(items =>
      items.filter(i => i.productId !== productId)
    );
  }

  /**
   * Sets the exact quantity for a product.
   * If the resulting quantity is 0 or below, the item is removed.
   * @param productId - ID of the product to update.
   * @param quantity  - New quantity (integer ≥ 0).
   */
  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this._items.update(items =>
      items.map(i => {
        if (i.productId === productId) {

          const cappedQuantity = Math.min(quantity, i.stock);
          return { ...i, quantity: cappedQuantity };
        }
        return i;
      })
    );
  }

  /** Removes all items from the cart and clears localStorage. */
  clearCart(): void {
    this._items.set([]);
  }

  // ── Drawer visibility ─────────────────────────────────────────────────────

  openCart(): void { this.isOpen.set(true); }
  closeCart(): void { this.isOpen.set(false); }
  toggleCart(): void { this.isOpen.update(v => !v); }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Rounds a number to exactly two decimal places.
   * Uses the Number.EPSILON technique to avoid floating-point residuals
   * (e.g. 0.1 + 0.2 = 0.30000000000000004 → 0.30).
   */
  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Reads persisted cart items from localStorage.
   * Returns an empty array during SSR or when no data is found.
   */
  private loadFromStorage(): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      // Corrupted data — start fresh.
      return [];
    }
  }
}
