'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const core=require('../bitacoras/core.js');
const catalog=require('../bitacoras/catalogos.js');

const ROOT=path.resolve(__dirname,'..');
const INPUT_DIR=path.join(ROOT,'bitacoras','entradas');
const OUTPUT_DIR=path.join(ROOT,'bitacoras','publicadas');
const REGISTRY=path.join(OUTPUT_DIR,'registros.js');

function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function safe(value){return core.escape(value);}
function slug(record){
  const id=record.id.toUpperCase().replace(/[^A-Z0-9-]/g,'-');
  return `${record.ventana}-G${record.datos.grupo}-E${String(record.datos.equipo).padStart(2,'0')}-${id}`;
}
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'));}
function validTime(value){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);}

function inspectPackage(filePath){
  const original=fs.readFileSync(filePath);
  if(original.length>8*1024*1024)throw Error(`${path.basename(filePath)} supera 8 MB.`);
  const files=core.unzip(new Uint8Array(original));
  let record;
  try{record=JSON.parse(new TextDecoder().decode(files['bitacora.json']));}
  catch{throw Error(`${path.basename(filePath)} contiene un bitacora.json inválido.`);}
  core.validate(record);
  if(!fs.existsSync(path.join(ROOT,'ventanas',record.ventana+'.html')))throw Error(`La ventana ${record.ventana} no existe en el sitio.`);
  if(!validDate(record.datos.fecha)||!validTime(record.datos.hora))throw Error(`La fecha u hora de ${record.folio} no es válida.`);
  if(record.foto){
    const photo=files[record.foto];
    if(!photo||photo.length>3*1024*1024||photo[0]!==0xff||photo[1]!==0xd8)throw Error(`La fotografía de ${record.folio} no es válida.`);
  }
  if(record.logo)core.logoMime(record.logo,files[record.logo]);
  return {filePath,original,files,record,hash:sha256(original)};
}

function duplicateDecision(existing,hash){
  if(!existing)return 'new';
  if(existing.archivo_sha256===hash)return 'duplicate';
  throw Error(`El ID ${existing.id} ya fue publicado con contenido diferente. No se sobrescribió la evidencia.`);
}

function makeEntry(item,folder){
  const r=item.record,team=catalog.equipo(r.datos.grupo,r.datos.equipo);
  return {
    id:r.id,ventana:r.ventana,grupo:r.datos.grupo,equipo:String(r.datos.equipo).padStart(2,'0'),nombre:team.nombre,
    fecha:r.datos.fecha,hora:r.datos.hora,prueba:false,
    resultado:r.datos.resultado||'Resultado no declarado',
    trayectoria:r.datos.trayectoria||'Trayectoria no declarada',
    pagina:`publicadas/${folder}/index.html`,archivo_sha256:item.hash
  };
}

function renderPage(item,entry){
  const r=item.record,d=r.datos,team=catalog.equipo(d.grupo,d.equipo);
  const logo='../../../'+team.logo;
  const photo=r.foto?`<section aria-labelledby="photo-title"><p class="eyebrow">03 / EVIDENCIA FOTOGRÁFICA</p><h2 id="photo-title">Foto después del lanzamiento</h2><img class="attachment" src="foto-grupal.jpg" alt="${safe(team.nombre)} con su cohete después del lanzamiento" loading="lazy"><p class="hint">Imagen incluida por el equipo y publicada con la autorización declarada en la bitácora.</p></section>`:'';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#061a38"><title>${safe(r.ventana)} · ${safe(team.nombre)} · Rocket Tec</title><link rel="icon" href="../../../assets/rocket-tec-oficial.png"><link rel="stylesheet" href="../../estilos.css"><style>.record-heading{display:flex;align-items:center;gap:30px}.record-heading>div{flex:1;min-width:0}.record-heading img{width:150px;height:150px;object-fit:contain}.record-heading h1{font-size:clamp(32px,6vw,48px)}.flight-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding-top:16px}.flight-summary small,.flight-summary strong{display:block}.flight-summary strong{margin-top:6px;font-size:22px}.review-data{display:grid;grid-template-columns:minmax(160px,1fr) 2fr;gap:0 24px}.review-data dt,.review-data dd{padding:12px 0;margin:0;border-bottom:1px solid #e5ecf4;align-content:center}.attachment{display:block;max-width:min(100%,600px);max-height:620px;object-fit:contain;margin:24px auto;border-radius:8px}@media(max-width:650px){.record-heading img{width:95px;height:95px}.record-heading{gap:15px}.flight-summary{grid-template-columns:1fr}.review-data{display:block}.review-data dt{border-bottom:0;padding-bottom:0}.review-data dd{padding-top:5px}}</style></head>
<body><header><a href="../../../index.html"><img src="../../../assets/tec-monterrey-blanco.png" alt="Tecnológico de Monterrey"></a><span>CAMPUS SINALOA</span></header><main>
<nav aria-label="Regresar"><a href="../../../ventanas/${encodeURIComponent(r.ventana)}.html">Volver a la ventana ${safe(r.ventana)}</a></nav>
<div class="intro record-heading"><div><p class="eyebrow">ROCKET TEC / BITÁCORA PUBLICADA</p><span class="pill">LANZAMIENTO DOCUMENTADO</span><h1>${safe(r.ventana)} / ${safe(team.nombre)}</h1><p>Grupo ${safe(d.grupo)} · Equipo ${safe(entry.equipo)} · Campus ${safe(r.campus)}</p></div><img src="${safe(logo)}" alt="Logo de ${safe(team.nombre)}"></div>
<section aria-labelledby="summary-title"><p class="eyebrow">01 / RESUMEN DEL VUELO</p><h2 id="summary-title">Lo que reportó el equipo</h2><div class="flight-summary"><div><small>DISEÑO</small><strong>${safe(d.version||'No declarado')}</strong></div><div><small>MASA DECLARADA</small><strong>${safe(d.masa||'—')} g</strong></div><div><small>MOTORES RESTANTES</small><strong>${safe(d.motores_restantes||'—')}</strong></div></div><p>${safe(entry.resultado)}. ${safe(entry.trayectoria)}. ${safe(d.recuperacion||'Recuperación no declarada')}.</p></section>
<section aria-labelledby="data-title"><p class="eyebrow">02 / DATOS DE LA ENTREGA</p><h2 id="data-title">Bitácora completa</h2><dl class="review-data">${core.rows(r)}</dl><details><summary>Identificación del archivo recibido</summary><p>Folio: ${safe(r.folio)}</p><p>ID: ${safe(r.id)}</p><p>Elaboración declarada por el dispositivo: ${safe(r.creada)} (UTC).</p></details></section>
${photo}
<section aria-labelledby="files-title"><p class="eyebrow">${r.foto?'04':'03'} / ARCHIVO ORIGINAL</p><h2 id="files-title">Consultar la entrega</h2><p>El ZIP conserva el paquete original enviado por el equipo.</p><div class="buttons"><a class="button" href="entrega-original.zip" download>Descargar ZIP original</a><a class="button secondary" href="bitacora.json" download>Descargar datos JSON</a><a class="button secondary" href="../../lanzamientos.html?ventana=${encodeURIComponent(r.ventana)}">Ver lanzamientos de ${safe(r.ventana)}</a></div></section>
<footer>ROCKET TEC · F1025B · CAMPUS SINALOA · BITÁCORA PUBLICADA</footer></main></body></html>`;
}

function registrySource(records){
  return `// Archivo actualizado automáticamente al procesar los ZIP de bitacoras/entradas/.\n(function(root){\n  const registros=${JSON.stringify(records,null,2)};\n  root.ROCKET_FLIGHTS=registros;\n  if(typeof module!=='undefined')module.exports=registros;\n})(typeof window!=='undefined'?window:globalThis);\n`;
}

function listZipFiles(directory){
  if(!fs.existsSync(directory))return [];
  return fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name.toLowerCase().endsWith('.zip')).map(entry=>path.join(directory,entry.name)).sort();
}

function loadRecords(){
  delete require.cache[require.resolve(REGISTRY)];
  return require(REGISTRY).map(record=>({...record}));
}

function publish(root=ROOT){
  if(root!==ROOT)throw Error('La publicación solo puede ejecutarse desde la raíz configurada.');
  const paths=listZipFiles(INPUT_DIR);
  if(!paths.length){console.log('No hay ZIP pendientes en bitacoras/entradas/.');return {published:0,duplicates:0};}
  const items=paths.map(inspectPackage),records=loadRecords(),byId=new Map(records.map(record=>[record.id,record]));
  const seen=new Map();let duplicates=0;

  // Se valida el lote completo antes de escribir o retirar cualquier archivo.
  for(const item of items){
    const previous=seen.get(item.record.id);
    if(previous){
      if(previous.hash!==item.hash)throw Error(`El lote contiene dos ZIP diferentes con el mismo ID ${item.record.id}.`);
      item.decision='duplicate';duplicates++;continue;
    }
    seen.set(item.record.id,item);
    item.decision=duplicateDecision(byId.get(item.record.id),item.hash);
    if(item.decision==='duplicate')duplicates++;
  }

  let published=0;
  for(const item of items){
    if(item.decision==='new'){
      const folder=slug(item.record),destination=path.join(OUTPUT_DIR,folder),entry=makeEntry(item,folder);
      fs.mkdirSync(destination,{recursive:true});
      fs.writeFileSync(path.join(destination,'entrega-original.zip'),item.original);
      fs.writeFileSync(path.join(destination,'bitacora.json'),JSON.stringify(item.record,null,2)+'\n','utf8');
      if(item.record.foto)fs.writeFileSync(path.join(destination,'foto-grupal.jpg'),item.files[item.record.foto]);
      fs.writeFileSync(path.join(destination,'index.html'),renderPage(item,entry),'utf8');
      records.push(entry);byId.set(entry.id,entry);published++;
      console.log(`PUBLICADA ${item.record.folio} -> ${entry.pagina}`);
    }else console.log(`DUPLICADA ${item.record.folio} -> omitida`);
  }
  records.sort((a,b)=>(a.fecha+'T'+a.hora+a.id).localeCompare(b.fecha+'T'+b.hora+b.id));
  fs.writeFileSync(REGISTRY,registrySource(records),'utf8');
  for(const item of items)fs.unlinkSync(item.filePath);
  console.log(`Resultado: ${published} publicada(s), ${duplicates} duplicada(s).`);
  return {published,duplicates};
}

if(require.main===module){try{publish();}catch(error){console.error('ERROR:',error.message);process.exitCode=1;}}
module.exports={sha256,slug,inspectPackage,duplicateDecision,makeEntry,renderPage,registrySource,publish};
