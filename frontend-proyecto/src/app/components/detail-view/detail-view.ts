import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

export type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined;

@Component({
  selector: 'app-detail-view',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule],
  template: `
    <div class="detail-container">
      <div class="detail-header">
        <button pButton icon="pi pi-arrow-left" (click)="back.emit()" 
                class="p-button-text detail-back-btn"></button>
        
        <div class="header-main">
          <h1>{{ title }}</h1>
          @if (status) {
            <p-tag [severity]="statusSeverity" [value]="status" styleClass="header-tag" />
          }
        </div>

        <div class="header-actions">
          <ng-content select="[actions]" />
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-sidebar">
          <p-card>
            <ng-content select="[sidebar]" />
          </p-card>
        </div>

        <div class="detail-content">
          <p-card [header]="subtitle">
            <ng-content select="[main]" />
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: `
    .detail-container { padding: 1.5rem 2rem; max-width: 1200px; margin: 0 auto; }
    .detail-header { 
      display: grid;
      grid-template-columns: 48px 1fr 48px;
      align-items: center;
      margin-bottom: 3.5rem;
      width: 100%;
    }

    .detail-back-btn {
      color: #94a3b8 !important;
      width: 48px !important;
      height: 48px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      cursor: pointer !important;
      padding: 0 !important;
    }

    .detail-back-btn:hover {
      color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.1) !important;
      transform: scale(1.15);
    }

    .header-main { 
      display: flex; 
      flex-direction: row;
      align-items: center; 
      justify-content: center;
      gap: 1.5rem; 
      text-align: center;
    }
    
    .header-main h1 { 
      margin: 0; 
      font-size: 2.5rem; 
      font-weight: 900; 
      color: #0f172a; 
      letter-spacing: -0.04em;
      line-height: 1.1;
    }
    
    .detail-grid {
      display: flex;
      align-items: stretch; 
      gap: 2rem;
      width: 100%;
    }

    .detail-sidebar {
      width: 340px;
      display: flex;
    }

    .detail-content {
      flex: 1;
      display: flex;
    }

    :host ::ng-deep .p-card {
      width: 100%;
      display: flex;
      flex-direction: column;
      border: none !important;
      background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05) !important;
      border-radius: 1rem;
    }

    :host ::ng-deep .p-card .p-card-body {
      padding: 1.75rem !important;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    :host ::ng-deep .p-card-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 1.25rem;
      padding-bottom: 0.5rem;
      letter-spacing: -0.01em;
    }

    /* Dark Mode support — Premium Glassmorphism */
    :host-context(html.my-app-dark) .header-main h1 {
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255,255,255,0.1);
    }

    :host-context(html.my-app-dark) ::ng-deep .p-card {
      background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%) !important;
      border: none !important;
      color: #e2e8f0 !important;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
    }

    :host-context(html.my-app-dark) ::ng-deep .p-card-title {
      color: #ffffff !important;
    }

    :host ::ng-deep .header-tag .p-tag {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      border-radius: 9999px;
      letter-spacing: 0.02em;
    }

    .detail-back-btn {
      color: #64748b !important;
      width: 48px;
      height: 48px;
      border-radius: 50% !important;
      transition: all 0.2s ease !important;
    }

    .detail-back-btn:hover {
      color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.1) !important;
      transform: scale(1.1);
    }

    :host-context(html.my-app-dark) .detail-back-btn {
      color: #94a3b8 !important;
    }

    :host-context(html.my-app-dark) .detail-back-btn:hover {
      color: #f87171 !important;
      background: rgba(248, 113, 113, 0.15) !important;
    }

    @media (max-width: 992px) {
      .detail-grid { flex-direction: column; }
      .detail-sidebar { width: 100%; }
    }
  `
})
export class DetailView {
  @Input({ required: true }) title: string = '';
  @Input() subtitle: string = '';
  @Input() status?: string;

  @Input() statusSeverity: TagSeverity = 'info';
  
  @Output() back = new EventEmitter<void>();
}