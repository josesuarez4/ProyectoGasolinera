import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import {
  ProductService,
  ProductAndCurrentPriceResponseDTO,
} from '../../../services/products/product.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { ClientResponseDTO, UserService } from '../../../services/users/user.service';

@Component({
  selector: 'app-points',
  imports: [CommonModule],
  templateUrl: './points.html',
  styleUrl: './points.css',
})
export class Points implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);

  storeProducts: ProductAndCurrentPriceResponseDTO[] = [];
  userPoints: number = 0;
  userId: number | null = null;

  ngOnInit(): void {
    const user = this.auth.currentUser();

    // Use token snapshot for immediate render if available, then refresh
    const tokenPoints = this.auth.getTokenPoints?.();
    if (tokenPoints != null) {
      this.userPoints = tokenPoints;
    }

    if (user && user.id) {
      this.userId = user.id;
      this.loadUserPoints(user.id); // live refresh from backend
    }
    this.loadStoreProducts();
  }

  private loadStoreProducts(): void {
    this.productService.getAllCategories().subscribe({
      next: (categories) => {
        const pointCategory = categories.find((c) => c.name === 'Tienda_Puntos'); // Es la categoría que contiene los productos canjeables con puntos

        if (pointCategory) {
          this.productService.getProductsByCategory(pointCategory.id).subscribe({
            next: (products) => {
              this.storeProducts = products;
              this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading products:', err),
          });
        } else {
          console.error('Did not find the Tienda_Puntos category');
        }
      },
      error: (err) => console.error('Error loading categories:', err),
    });
  }

  calculatePointCost(price: number): number {
    return Math.round(price * 100);
  }

  redeemProduct(product: ProductAndCurrentPriceResponseDTO): void {
    if (!this.userId) {
      alert('You must be logged in to redeem products.');
      return;
    }

    const cost = this.calculatePointCost(product.salePrice);

    if (this.userPoints < cost) {
      alert(`You don't have enough points. You need ${cost} and you have ${this.userPoints}.`);
      return;
    }

    if (product.currentStock <= 0) {
      alert('Sorry, this product is out of stock.');
      return;
    }

    if (confirm(`Do you want to redeem "${product.name}" for ${cost} points?`)) {
      // Llamamos al servicio pasando el ID del cliente y los datos del canje
      this.productService.redeemWithPoints(this.userId, product.id, cost).subscribe({
        next: () => {
          // Actualizamos los puntos localmente para feedback inmediato
          this.userPoints -= cost;
          alert('Redemption successful!');
          this.loadStoreProducts(); // Recargamos para actualizar el stock en la vista
        },
        error: (err) => {
          console.error('Error at redeeming product:', err);
          alert('There was an error processing your redemption. Please try again later.');
        },
      });
    }
  }

  private loadUserPoints(id: number): void {
    this.userService.getClientById(id).subscribe({
      next: (clientData: ClientResponseDTO) => {
        this.userPoints = Number(clientData.points);
        console.log('Last points update:', clientData.updatedAt);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading user points:', err),
    });
  }
}
