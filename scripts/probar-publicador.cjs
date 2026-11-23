'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const publisher=require('./publicar-bitacoras.cjs');

test('un ZIP idéntico se reconoce como duplicado',()=>{
  assert.equal(publisher.duplicateDecision({id:'abc',archivo_sha256:'huella-1'},'huella-1'),'duplicate');
});

test('un mismo ID con contenido distinto se rechaza',()=>{
  assert.throws(()=>publisher.duplicateDecision({id:'abc',archivo_sha256:'huella-1'},'huella-2'),/contenido diferente/);
});

test('la carpeta publicada usa solo caracteres seguros y conserva el ID',()=>{
  const record={id:'02f7179b-9be0-4896-9d7d-ba7760ecab84',ventana:'ALFA-4',datos:{grupo:'501',equipo:'1'}};
  const folder=publisher.slug(record);
  assert.match(folder,/^ALFA-4-G501-E01-[A-Z0-9-]+$/);
  assert.ok(folder.includes(record.id.toUpperCase()));
});

test('el workflow tiene permisos de escritura y procesa solo la carpeta de entradas',()=>{
  const root=path.resolve(__dirname,'..');
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/publicar-bitacoras.yml'),'utf8');
  assert.match(workflow,/contents:\s*write/);
  assert.match(workflow,/bitacoras\/entradas\/\*\*\/\*\.zip/);
  assert.match(workflow,/node scripts\/publicar-bitacoras\.cjs/);
});

test('el registro generado sigue siendo JavaScript válido',()=>{
  const source=publisher.registrySource([{id:'abc',ventana:'ALFA-4'}]);
  new vm.Script(source);
  assert.match(source,/ROCKET_FLIGHTS/);
});
