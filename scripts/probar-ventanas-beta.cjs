'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);

const expected = {
  'BETA-1': ['2026-11-25T08:00:00-07:00', '2026-11-25T12:00:00-07:00', '25 de noviembre'],
  'BETA-2': ['2026-11-27T08:00:00-07:00', '2026-11-27T12:00:00-07:00', '27 de noviembre']
};

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(home, /config\.js\?v=20261123-beta/, 'la portada debe invalidar la configuración anterior en caché');
assert.match(home, /screen\.css\?v=20261123-tv12/, 'la portada debe mostrar fecha y hora a la izquierda y la misión a la derecha');
assert.doesNotMatch(home, /NUESTRA MISIÓN|Diseñar, construir y poner a prueba/, 'la portada no debe mostrar la leyenda de misión');
assert.match(home, /app\.js\?v=20261123-tv7/, 'la portada debe cargar fecha y hora separadas en el encabezado');
assert.doesNotMatch(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), /: 'APERTURA EN'/, 'el contador pendiente no debe mostrar APERTURA EN');
assert.doesNotMatch(home, /Una idea se convierte|INGENIERÍA EN ACCIÓN/, 'la portada debe dejar solo el titular en la columna izquierda');
assert.match(home, /class="launch-heading"[\s\S]*class="launch-code"/, 'el contador debe presentar un encabezado de misión jerarquizado');
assert.match(home, /id="launch-date"[\s\S]*id="launch-time"/, 'el encabezado debe separar FECHA y HORA');

for (const [name, [start, end, dateLabel]] of Object.entries(expected)) {
  const launch = context.window.ROCKET_WINDOWS.find(item => item.nombre === name);
  assert.ok(launch, `${name} debe estar configurada`);
  assert.equal(launch.inicio, start);
  assert.equal(launch.fin, end);
  assert.equal(launch.estado, 'programada');
  assert.equal(launch.qr, `assets/qr-${name}.png`);
  assert.equal(launch.pagina, `https://echucuan.github.io/rocketTecSinaloa2026/ventanas/${name}.html`);

  const pagePath = path.join(root, 'ventanas', `${name}.html`);
  const html = fs.readFileSync(pagePath, 'utf8');
  assert.match(html, new RegExp(`data-window="${name}"`));
  assert.match(html, new RegExp(dateLabel));
  assert.match(html, /8:00 a\. m\.–12:00 p\. m\./);
  assert.match(html, /Campo de soccer/);
  assert.match(html, new RegExp(`bitacoras/index\\.html\\?ventana=${name}`));
  assert.match(html, new RegExp(`bitacoras/lanzamientos\\.html\\?ventana=${name}`));
  assert.match(html, /Misión BETA: validación del diseño/);
  assert.doesNotMatch(html, /sin alerones/i);

  const qr = fs.readFileSync(path.join(root, launch.qr));
  assert.deepEqual([...qr.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
}

assert.equal(new Date('2026-11-25T12:00:00Z').getUTCDay(), 3, 'BETA-1 debe ser miércoles');
assert.equal(new Date('2026-11-27T12:00:00Z').getUTCDay(), 5, 'BETA-2 debe ser viernes');

console.log('OK: BETA-1 y BETA-2 están configuradas, enlazadas y listas para publicarse.');
