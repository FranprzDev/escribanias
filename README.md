# Turnero para Escribanías

Demo de sistema de turnos online para escribanías de Tucumán: reserva de turnos con requisitos por trámite, bot de WhatsApp simulado y panel del escribano (agenda, bloqueos, estado de trámites, exportación CSV).

- `index.html`: aplicación completa, autocontenida (HTML + CSS + JS, sin backend). Abrila en el navegador.
- Cada escribanía se personaliza con `#slug` en la URL; los datos van en el bloque `<script id="demo-data">` (en este repo, dos escribanías de ejemplo).
- `test/test.js`: corre el `selfTest()` de la página con un DOM mínimo (`node test/test.js`).

Próximos pasos: backend real (turnos persistentes), integración con WhatsApp Business API y lectura de documentos con IA.
