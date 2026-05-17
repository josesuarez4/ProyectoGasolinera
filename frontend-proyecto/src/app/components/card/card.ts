import { CommonModule } from '@angular/common';
import { Component, ContentChild, TemplateRef, input, output } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-card',
  imports: [CommonModule, CardModule],
  templateUrl: './card.html',
  styleUrl: './card.css',
  host: {
    '[class.ui-card-clickable]': 'clickable()',
    '[attr.role]': 'clickable() ? "button" : null',
    '[attr.tabindex]': 'clickable() ? "0" : null',
    '(click)': 'handleCardClick($event)',
    '(keydown.enter)': 'handleCardKeydown($event)',
    '(keydown.space)': 'handleCardKeydown($event)',
  },
})
export class Card {
  @ContentChild('cardHeader', { read: TemplateRef })
  protected readonly cardHeaderTemplate?: TemplateRef<unknown>;

  @ContentChild('cardTitle', { read: TemplateRef })
  protected readonly cardTitleTemplate?: TemplateRef<unknown>;

  @ContentChild('cardSubtitle', { read: TemplateRef })
  protected readonly cardSubtitleTemplate?: TemplateRef<unknown>;

  @ContentChild('cardFooter', { read: TemplateRef })
  protected readonly cardFooterTemplate?: TemplateRef<unknown>;

  readonly header = input<string | undefined>(undefined);
  readonly subheader = input<string | undefined>(undefined);
  readonly styleClass = input<string | undefined>(undefined);
  readonly cardStyle = input<Record<string, string> | undefined>(undefined);
  readonly clickable = input(false);

  readonly cardClick = output<MouseEvent>();

  protected handleCardClick(event: MouseEvent): void {
    if (!this.clickable() || this.isInteractiveTarget(event.target)) {
      return;
    }

    this.cardClick.emit(event);
  }

  protected handleCardKeydown(event: Event): void {
    if (!this.clickable() || this.isInteractiveTarget(event.target)) {
      return;
    }

    event.preventDefault();
    this.cardClick.emit(event as unknown as MouseEvent);
  }

  private isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest('button, a, input, textarea, select, [data-stop-card-click]'),
    );
  }
}