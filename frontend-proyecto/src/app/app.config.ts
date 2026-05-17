import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { ConfirmationService, MessageService } from 'primeng/api';


import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { jwtInterceptor } from './security/interceptors/jwt.interceptor';
import { errorInterceptor } from './security/interceptors/error.interceptor';

// Register es-ES locale data so CurrencyPipe formats numbers correctly
// (comma as decimal separator, dot as thousands separator).
registerLocaleData(localeEs, 'es-ES');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, errorInterceptor])),
    providePrimeNG({
      theme: {
        preset: definePreset(Aura, {
          semantic: {
            primary: {
              50:  '{blue.50}',
              100: '{blue.100}',
              200: '{blue.200}',
              300: '{blue.300}',
              400: '{blue.400}',
              500: '{blue.500}',
              600: '{blue.600}',
              700: '{blue.700}',  /* #1d4ed8 — brand blue */
              800: '{blue.800}',
              900: '{blue.900}',
              950: '{blue.950}',
            },
            colorScheme: {
              light: {
                primary: {
                  color:        '{blue.700}',
                  contrastColor: '#ffffff',
                  hoverColor:   '{blue.800}',
                  activeColor:  '{blue.900}',
                },
              },
              dark: {
                primary: {
                  color:        '{blue.500}',
                  contrastColor: '#ffffff',
                  hoverColor:   '{blue.400}',
                  activeColor:  '{blue.300}',
                },
              },
            },
          },
        }),
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
    }),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    MessageService,
    ConfirmationService,
  ],
};
