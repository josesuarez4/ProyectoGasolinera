import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';
import { CartComponent } from './components/cart/cart.component';
import { AuthService } from './services/auth/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { Toast } from 'primeng/toast';
import { CartService } from './services/cart/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footer, Header, CartComponent, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'frontend-proyecto';

  /** Exposed to the template so the header can receive live auth state. */
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly isAdminRoute = computed(() => this.currentUrl().startsWith('/staff'));

  protected onHeaderAction(action: string): void {
    if (action === 'logout') {
      this.auth.logout();
    }
  }
}
