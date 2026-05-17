# FrontendProyecto

Este proyecto es una aplicación frontend Angular generada con [Angular CLI](https://github.com/angular/angular-cli) versión 21.2.3.

## Requisitos previos

Antes de instalar la aplicación, asegúrate de tener instalado:

- Node.js compatible (recomendado: versión 25.x)
- npm (la versión indicada en este proyecto es `npm@11.11.0`)

Puedes comprobar las versiones con:

```bash
node -v
npm -v
```

## Instalación

1. Clona el repositorio o descarga el proyecto.
2. En la raíz del proyecto, instala las dependencias:

```bash
npm install
```

## Ejecución en modo desarrollo

Para iniciar la aplicación localmente con recarga automática:

```bash
npm start
```

Después de arrancar, abre el navegador en:

```text
http://localhost:4200/
```

## Creación del build de producción

Para compilar la aplicación en modo producción:

```bash
npm run build
```

Los archivos generados se guardarán en la carpeta `dist/`.

## Servir la aplicación con SSR

Este proyecto cuenta con un script para servir el build de Angular Universal / SSR después de compilar:

```bash
npm run serve:ssr:frontend-proyecto
```

Asegúrate de ejecutar primero `npm run build` antes de este comando.

## Pruebas unitarias

Para ejecutar las pruebas unitarias con Jest:

```bash
npm test
```

O bien, para ver las pruebas en modo watch:

```bash
npm run test:watch
```

Para generar el informe de cobertura:

```bash
npm run test:coverage
```

## Documentation

Detailed manuals are available for different sections of the application:

- [General Manual (Public/Auth)](manual.md): Landing, Login, and Registration.
- [Staff Dashboard Manual](manual_dashboard_staff.md): Analytics, metrics, and business charts.
- [Staff Store Purchases Manual](manual_store_purchases_staff.md): Point-of-Sale (POS) system for physical sales.
- [Fuel Price Manual](manual_fuel_price.md): Real-time fuel rate monitoring.
- [Client Orders Manual](manual_my_orders_client.md): Personal purchase history and tracking for clients.

## Scripts disponibles

- `npm start`: inicia el servidor de desarrollo (`ng serve -o`)
- `npm run build`: construye la aplicación para producción (`ng build`)
- `npm run watch`: construye continuamente en modo desarrollo
- `npm test`: ejecuta las pruebas con Jest
- `npm run test:watch`: pruebas en modo observador
- `npm run test:coverage`: informe de cobertura de pruebas
- `npm run serve:ssr:frontend-proyecto`: sirve la versión compilada con SSR

