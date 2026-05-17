import { Component, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { CarouselModule } from 'primeng/carousel';
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { Card } from '../../../components/card/card';

@Component({
  selector: 'app-landing',
  imports: [Card, DividerModule, ButtonModule, MenubarModule, RouterLink, CarouselModule],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  constructor(private authService: AuthService) {}

  /* added for carrousel */
  images = signal<{ src: string; alt: string }[]>([
    { src: './img/ImgGas1.jpg', alt: 'Gas station img 1' },
    { src: './img/ImgGas2.jpg', alt: 'Gas station img 2' },
    { src: './img/ImgGas3.jpg', alt: 'Gas station img 3' },
  ]);

  companyName = signal('Gas station Management');
  slogan = signal('Drive more, worry less.');

  items = signal<MenuItem[]>([
    { label: 'AboutUs', icon: 'pi pi-info-circle', routerLink: '#nosotros' },
    { label: 'Services', icon: 'pi pi-cog', routerLink: '#servicios' },
  ]);

  servicios = signal([
    {
      title: 'Inventory management',
      desc: 'Total synchronization of stock and categories through relational databases.',
      icon: 'pi pi-box',
    },
    {
      title: 'Active loyalty',
      desc: 'Reward algorithms and user profile management to enhance engagement.',
      icon: 'pi pi-users',
    },
    {
      title: 'Sales traceability',
      desc: 'Integral control of tickets, transactions and orders in real time.',
      icon: 'pi pi-chart-line',
    },
  ]);

  protected isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }
}
