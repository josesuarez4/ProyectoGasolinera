import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'staff',
    renderMode: RenderMode.Client,
  },
  {
    path: 'staff/cash-registers/:cashRegisterId/tickets',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
