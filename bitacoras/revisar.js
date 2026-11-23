'use strict';

const $=id=>document.getElementById(id);
const core=window.BitacoraCore;
const store=window.BitacoraReviewStore;
let photoUrl;
let logoUrl;
let current;

function clearObjectUrls(){
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  if(logoUrl)URL.revokeObjectURL(logoUrl);
  photoUrl=logoUrl=undefined;
}

function setError(message){
  $('error').textContent=message;
  $('error').hidden=!message;
}

function mimeFromName(name){
  return name.toLowerCase().endsWith('.json')?'application/json':'application/zip';
}

function parsePackage(bytes,fileName){
  let record,photo,files;
  if(fileName.toLowerCase().endsWith('.zip')){
    files=core.unzip(bytes);
    if(!files['bitacora.json'])throw Error('El ZIP no contiene bitacora.json.');
    record=JSON.parse(new TextDecoder().decode(files['bitacora.json']));
    photo=files['foto-grupal.jpg'];
  }else if(fileName.toLowerCase().endsWith('.json')){
    record=JSON.parse(new TextDecoder().decode(bytes));
  }else throw Error('Selecciona un ZIP original o un archivo JSON.');
  core.validate(record);
  return {record,photo,files};
}

function downloadBytes(bytes,fileName,fileType){
  const url=URL.createObjectURL(new Blob([bytes],{type:fileType||mimeFromName(fileName)}));
  const link=document.createElement('a');
  link.href=url;
  link.download=fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function renderPackage(parsed,source){
  const {record:r,photo,files}=parsed;
  clearObjectUrls();
  $('photo').hidden=true;
  $('review-identity').hidden=true;
  $('folio').textContent=r.folio;
  $('meta').textContent=`Campus ${r.campus} · ${r.ventana} · ID ${r.id} · Elaboración ${r.creada} (UTC)`;
  $('fields').innerHTML=core.rows(r);

  const team=window.ROCKET_CATALOG.equipo(r.datos.grupo,r.datos.equipo);
  if(team){
    const logo=r.logo&&files?.[r.logo];
    if(logo){
      logoUrl=URL.createObjectURL(new Blob([logo],{type:core.logoMime(r.logo,logo)}));
      $('review-logo').src=logoUrl;
    }else $('review-logo').src='../'+team.logo;
    $('review-logo').alt='Logo de '+team.nombre;
    $('review-team').textContent=team.nombre;
    $('review-team-meta').textContent='Grupo '+r.datos.grupo+' · Equipo '+team.numero;
    $('review-identity').hidden=false;
  }

  $('photo-note').textContent=r.foto?'El equipo declaró que adjunta una foto. Verifica la autorización antes de hacerla pública.':'Entrega sin foto grupal.';
  if(photo){
    if(!r.foto||photo.length>3*1024*1024||photo[0]!==0xff||photo[1]!==0xd8)throw Error('Fotografía inválida.');
    photoUrl=URL.createObjectURL(new Blob([photo],{type:'image/jpeg'}));
    $('photo').src=photoUrl;
    $('photo').hidden=false;
  }else if(r.foto){
    $('photo-note').textContent='El registro menciona una foto, pero no está en el archivo seleccionado. Abre el ZIP completo o solicita la imagen.';
  }

  current={
    record:r,
    bytes:source.bytes instanceof Uint8Array?source.bytes:new Uint8Array(source.bytes),
    fileName:source.fileName,
    fileType:source.fileType||mimeFromName(source.fileName),
    teamName:team?.nombre
  };
  $('save-record').disabled=false;
  $('download-current').disabled=false;
  $('save-status').textContent=source.saved?'Guardada localmente · pendiente de publicación':'';
  $('record').hidden=false;
  $('record').scrollIntoView({behavior:'smooth',block:'start'});
}

async function openSource(source){
  if(source.bytes.byteLength>store.MAX_BYTES)throw Error('El archivo supera 8 MB.');
  const bytes=source.bytes instanceof Uint8Array?source.bytes:new Uint8Array(source.bytes);
  renderPackage(parsePackage(bytes,source.fileName),{...source,bytes});
}

function savedCard(entry){
  const article=document.createElement('article');
  article.className='saved-card';
  article.dataset.id=entry.id;

  const info=document.createElement('div');
  const title=document.createElement('strong');
  title.textContent=entry.folio;
  const team=document.createElement('p');
  team.textContent=`${entry.nombreEquipo} · Grupo ${entry.grupo} · ${entry.ventana}`;
  const date=document.createElement('small');
  const savedDate=new Date(entry.guardada);
  date.textContent=`Guardada ${Number.isNaN(savedDate.getTime())?entry.guardada:savedDate.toLocaleString('es-MX')} · Pendiente de publicación`;
  info.append(title,team,date);

  const actions=document.createElement('div');
  actions.className='saved-card-actions';
  [['open','Abrir'],['download','Descargar'],['delete','Eliminar']].forEach(([action,label])=>{
    const button=document.createElement('button');
    button.type='button';
    button.dataset.action=action;
    button.textContent=label;
    if(action!=='open')button.className='secondary';
    actions.appendChild(button);
  });
  article.append(info,actions);
  return article;
}

async function refreshSaved(){
  try{
    const entries=await store.list();
    $('saved-list').replaceChildren(...entries.map(savedCard));
    $('saved-empty').hidden=entries.length>0;
    $('saved-count').textContent=`${entries.length} ${entries.length===1?'PENDIENTE':'PENDIENTES'}`;
    $('saved-error').hidden=true;
  }catch(error){
    $('saved-error').textContent='No se pudo leer la bandeja local: '+error.message;
    $('saved-error').hidden=false;
  }
}

$('file').addEventListener('change',async()=>{
  setError('');
  $('record').hidden=true;
  $('save-record').disabled=true;
  $('download-current').disabled=true;
  current=undefined;
  const file=$('file').files[0];
  if(!file)return;
  try{
    const bytes=new Uint8Array(await file.arrayBuffer());
    await openSource({bytes,fileName:file.name,fileType:file.type||mimeFromName(file.name),saved:false});
  }catch(error){
    setError('No se pudo abrir: '+error.message);
  }
});

$('save-record').addEventListener('click',async()=>{
  if(!current)return;
  const button=$('save-record');
  button.disabled=true;
  $('save-status').textContent='Guardando…';
  try{
    const entry=store.makeEntry(current);
    await store.save(entry);
    $('save-status').textContent='Guardada localmente · pendiente de publicación';
    await refreshSaved();
  }catch(error){
    $('save-status').textContent='No se pudo guardar: '+error.message;
  }finally{button.disabled=false;}
});

$('download-current').addEventListener('click',()=>{
  if(current)downloadBytes(current.bytes,current.fileName,current.fileType);
});

$('saved-list').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  const card=button?.closest('.saved-card');
  if(!button||!card)return;
  try{
    const entry=await store.get(card.dataset.id);
    if(!entry)throw Error('La bitácora ya no existe en la bandeja local.');
    if(button.dataset.action==='open')await openSource({bytes:entry.bytes,fileName:entry.fileName,fileType:entry.fileType,saved:true});
    if(button.dataset.action==='download')downloadBytes(entry.bytes,entry.fileName,entry.fileType);
    if(button.dataset.action==='delete'){
      if(!confirm(`¿Eliminar ${entry.folio} de este navegador? El archivo original de tu correo no se modifica.`))return;
      await store.remove(entry.id);
      if(current?.record.id===entry.id)$('save-status').textContent='Eliminada de la bandeja local';
      await refreshSaved();
    }
  }catch(error){
    $('saved-error').textContent='No se pudo completar la operación: '+error.message;
    $('saved-error').hidden=false;
  }
});

refreshSaved();
