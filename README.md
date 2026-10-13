# Turnero para Escribanías

Demo de un sistema de turnos online para escribanías, hecho con [Astro](https://astro.build) como sitio 100 % estático (sin backend).

- **Clientes:** reserva de turnos en 4 pasos (trámite → día y horario → datos → confirmación), requisitos por trámite, link para agregar el turno a Google Calendar, "Mis turnos" y consulta del estado de un trámite por código.
- **Bot de WhatsApp simulado:** sacar turno, consultar el estado del trámite, ver requisitos y contacto de la escribanía.
- **Panel del escribano:** indicadores, agenda diaria (confirmar, asistió / no asistió, cancelar, recordatorio por WhatsApp), bloqueo de horarios, estado de cada trámite y exportación de la agenda a CSV.
- **Personalización por escribanía:** con `#slug` en la URL (`/#escribania-ejemplo`) o con una página estática propia (`/escribania-ejemplo/`).

> Es una demo: los turnos viven en memoria, en la pestaña del navegador, y se pierden al recargar. No se envía nada real. Este repo trae solo **escribanías ficticias de ejemplo**.

## Requisitos

- Node.js **22.12 o superior**
- npm 9.6.5 o superior

## Cómo correrlo

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:4321
npm run build      # chequeo de tipos (astro check) + sitio estático en dist/
npm run preview    # sirve dist/ para revisarlo
```

Abrí `http://localhost:4321/#escribania-ejemplo` o `http://localhost:4321/escribania-demo-yerba-buena/`.

## Tests

```bash
npm test           # vitest: lógica, datos y DOM renderizado por Astro
```

- `test/selftest.test.ts`: corre la autoprueba (`src/lib/selftest.ts`) en distintos días de la semana.
- `test/data.test.ts`: valida `src/data/escribanias.json` (campos obligatorios, slugs únicos y aptos para URL).
- `test/dom.test.ts`: renderiza las páginas con la Container API de Astro y prueba el flujo completo en un DOM (happy-dom): reserva, chat, panel, `#slug` y rutas `/[slug]`.

Prueba de punta a punta en un navegador real (Chromium), con capturas de escritorio y celular en `e2e-output/`:

```bash
npx playwright install chromium   # una sola vez
npm run build
npm run test:e2e
```

En el navegador también podés abrir la página con `?selftest` o ejecutar `selfTest()` en la consola.

## Estructura

```
├── astro.config.mjs          # salida estática; SITE y BASE_PATH por variable de entorno
├── public/favicon.svg
├── src/
│   ├── data/escribanias.json # datos de cada escribanía (solo ejemplos)
│   ├── layouts/Layout.astro  # <head>, datos embebidos y script del cliente
│   ├── pages/
│   │   ├── index.astro       # demo general (+ selector y #slug)
│   │   └── [slug].astro      # una página por escribanía (getStaticPaths)
│   ├── components/
│   │   ├── App.astro         # arma la página completa
│   │   ├── Header.astro      # barra superior
│   │   ├── Tabs.astro        # Clientes / Panel del escribano
│   │   ├── OfficeHero.astro  # nombre, registro, dirección y selector
│   │   ├── BookingFlow.astro # reserva en 4 pasos
│   │   ├── Requisitos.astro  # qué traer a cada trámite
│   │   ├── MisTurnos.astro   # mis turnos + estado de trámite
│   │   ├── PanelEscribano.astro
│   │   ├── WhatsAppBot.astro
│   │   └── Footer.astro
│   ├── lib/                  # lógica sin DOM (testeable)
│   │   ├── escribanias.ts    # tipos, búsqueda por slug y colores
│   │   ├── tramites.ts       # trámites, duraciones y requisitos
│   │   ├── turnero.ts        # agenda, disponibilidad, bloqueos, CSV, links
│   │   └── selftest.ts       # autoprueba compartida (tests y navegador)
│   ├── scripts/              # TypeScript del cliente, sin frameworks
│   │   ├── main.ts / app.ts  # arranque
│   │   ├── office.ts         # #slug, ?e=slug o ruta /[slug]
│   │   ├── booking.ts  mis.ts  panel.ts  chat.ts  tabs.ts  dom.ts
│   └── styles/global.css     # estilos (paleta azul notarial + dorado)
└── test/
```

## Cómo agregar una escribanía

1. Sumá un objeto a `src/data/escribanias.json`:

   ```json
   {
     "slug": "escribania-perez",
     "nombre": "Escribanía Pérez",
     "registro": "12",
     "titular": "Pérez, Juana",
     "direccion": "San Martín 100, San Miguel de Tucumán, Tucumán",
     "ciudad": "San Miguel de Tucumán",
     "telefono": "+54 381 400-0000",
     "colores": "#1f3a2e,#c08a2b"
   }
   ```

   - `slug`: minúsculas, números y guiones; tiene que ser único.
   - `colores` (opcional): `"#primario,#acento"` para personalizar la paleta. Dejalo `""` para usar la paleta por defecto.

2. `npm test` valida los datos y `npm run build` genera `/escribania-perez/`. También funciona `/#escribania-perez` y `/?e=escribania-perez`.

Los trámites y sus requisitos se editan en `src/lib/tramites.ts`; los horarios de atención (`SLOTS`) en `src/lib/turnero.ts`.

## Deploy

El sitio es estático: cualquier hosting que sirva la carpeta `dist/` sirve.

### Vercel

Importá el repo en Vercel. Detecta Astro solo: build `npm run build`, salida `dist`. No hace falta configurar nada más.

### Netlify

Importá el repo con build command `npm run build` y publish directory `dist` (o agregá un `netlify.toml`):

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

### GitHub Pages

En **Settings → Pages**, elegí **Source: GitHub Actions** y creá `.github/workflows/deploy.yml` con:

```yaml
name: Deploy a GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          SITE: https://${{ github.repository_owner }}.github.io
          BASE_PATH: /${{ github.event.repository.name }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`BASE_PATH` hace que los links y assets funcionen bajo `https://<usuario>.github.io/escribanias/`. En Vercel o Netlify no hace falta.

## Próximos pasos

- Backend real: turnos persistentes, notificaciones por WhatsApp Business API y email.
- Login real para el panel del escribano.
- CRM de clientes y lectura de documentos con IA.

---

Hecho por [Francisco Perez](https://github.com/franprzdev).
