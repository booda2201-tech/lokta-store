import { Injectable, inject, signal } from '@angular/core';
import { Auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';

// One studio account owns the shop, so the login only asks for the secret half of it.
const ADMIN_EMAIL = 'admin@lokta.store';
const TAPS_REQUIRED = 3;
const TAP_WINDOW = 1500;

@Injectable({ providedIn: 'root' })
export class AdminService {
  // Optional so the shop still runs where no Firebase app is provided, such as the unit tests.
  private readonly auth = inject(Auth, { optional: true });
  readonly tapsRequired = TAPS_REQUIRED;
  readonly authenticated = signal(false);
  readonly loginOpen = signal(false);
  // Firebase restores a saved session asynchronously, so the studio route waits for the first answer.
  readonly ready: Promise<void>;
  private taps: number[] = [];

  constructor() {
    this.ready = new Promise<void>(resolve => {
      if (!this.auth) { resolve(); return; }
      onAuthStateChanged(this.auth, user => {
        this.authenticated.set(user?.email === ADMIN_EMAIL);
        resolve();
      });
    });
  }

  // The studio entrance stays hidden from shoppers: three quick taps on the logo reveal it.
  registerLogoTap(): boolean {
    const now = Date.now();
    this.taps = [...this.taps.filter(tap => now - tap < TAP_WINDOW), now];
    if (this.taps.length < TAPS_REQUIRED) return false;
    this.taps = [];
    this.loginOpen.set(true);
    return true;
  }

  // Resolves with the message to show, so an empty string means the studio is open.
  async login(password: string): Promise<string> {
    if (!this.auth) return 'الدخول للاستوديو محتاج اتصال بالسيرفر.';
    try {
      await signInWithEmailAndPassword(this.auth, ADMIN_EMAIL, password.trim());
      this.loginOpen.set(false);
      return '';
    } catch (error: unknown) {
      return this.loginMessage(error);
    }
  }

  async logout(): Promise<void> {
    if (this.auth) await signOut(this.auth).catch((error: unknown) => console.error('Failed to sign the studio out', error));
    this.authenticated.set(false);
  }

  closeLogin(): void {
    this.taps = [];
    this.loginOpen.set(false);
  }

  private loginMessage(error: unknown): string {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
    if (code === 'auth/too-many-requests') return 'حاولت كتير، استنى شوية وجرّب تاني.';
    if (code === 'auth/network-request-failed') return 'مفيش اتصال بالسيرفر، اتأكد من النت وجرّب تاني.';
    // Only shows up while the project is still being set up, and it says exactly what is missing.
    if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
      return 'حساب الاستوديو لسه مش مفعّل في Firebase Authentication.';
    }
    if (code === 'auth/user-disabled') return 'حساب الاستوديو موقوف من Firebase.';
    return 'كلمة السر غلط، حاول تاني.';
  }
}
