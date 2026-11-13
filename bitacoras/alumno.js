'use strict';
const settings=window.BITACORA_SETTINGS,core=window.BitacoraCore,form=document.getElementById('form'),$=id=>document.getElementById(id);
const windows=window.ROCKET_WINDOWS||[];
const requested=new URLSearchParams(location.search).get('ventana');
const selectedWindow=windows.find(w=>w.nombre===requested);
const draftKey='rockettec-bitacora-draft-v2:'+(selectedWindow?.nombre||'sin-ventana');
const catalog=window.ROCKET_CATALOG;
function refreshTeams(value=''){
  const list=catalog.grupos[$('grupo').value]||[];
  $('equipo').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent=list.length?'Selecciona tu equipo':'Primero selecciona el grupo';$('equipo').append(blank);
  for(const team of list){const option=document.createElement('option');option.value=team.numero;option.textContent=`Equipo ${team.numero} — ${team.nombre}${team.rol==='profesor'?' (profesor)':''}`;$('equipo').append(option);}
  $('equipo').disabled=!list.length;$('equipo').value=value===''?'':String(value).padStart(2,'0');
}
refreshTeams();
$('grupo').addEventListener('change',()=>refreshTeams());
let photo=null,photoUrl=null,id='',created='',downloaded=false,photoBusy=false,photoRevision=0,packageFile=null,packageBusy=false,revision=0;
const logoCache=new Map();
function refreshIdentity(){
  const team=catalog.equipo($('grupo').value,$('equipo').value);
  $('team-identity').hidden=!team;
  if(!team){$('team-logo').removeAttribute('src');return;}
  const source='../'+team.logo;
  if($('team-logo').getAttribute('src')!==source){$('team-logo').src=source;attachmentLogo(team).catch(()=>{});}
  $('team-logo').alt='Logo de '+team.nombre;
  $('team-name').textContent=team.nombre;
  $('team-meta').textContent='Grupo '+$('grupo').value+' · Equipo '+team.numero;
}
async function attachmentLogo(team){
  if(!logoCache.has(team.logo))logoCache.set(team.logo,(async()=>{
    const response=await fetch('../'+team.logo,{cache:'force-cache',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('No se pudo descargar el logo del equipo. Revisa tu conexión e inténtalo de nuevo.');
    const bytes=new Uint8Array(await response.arrayBuffer());
    const name=team.logo.endsWith('.jpg')?'logo-equipo.jpg':'logo-equipo.png';
    core.logoMime(name,bytes);return {name,bytes};
  })().catch(error=>{logoCache.delete(team.logo);throw error;}));
  return logoCache.get(team.logo);
}
function error(message){$('error').textContent=message;$('error').hidden=!message;}
function setBlock(name,on){$(name).hidden=!on;$(name).querySelectorAll('input,select,textarea').forEach(el=>el.disabled=!on);}
function currentWindow(){return windows.find(w=>w.nombre===$('ventana').value);}
function folio(){const d=new FormData(form);return `${$('ventana').value}-G${d.get('grupo')||'___'}-E${String(d.get('equipo')||'__').padStart(2,'0')}-R${id}`;}
function recipient(){return settings.profesorEmail;}
function emailState(){const email=recipient(),valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);$('email').classList.toggle('disabled',!downloaded||!valid);$('email').setAttribute('aria-disabled',String(!downloaded||!valid));$('email-status').textContent=valid?`Destinatario: ${email}. Adjunta manualmente el ZIP; abrir el correo no confirma su envío.`:'Correo del profesor pendiente de confirmar. Puedes usar el campo de prueba local.';if(downloaded&&valid){const subject=`F1025B | ${folio()}`;const body=`Profesor:\r\n\r\nAdjuntamos la bitácora ${folio()} del Campus ${settings.campus}.\r\n\r\nArchivo a adjuntar: ${folio()}.zip\r\n\r\n[Adjunta aquí el ZIP descargado antes de enviar.]`; $('email').href=`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;}else $('email').removeAttribute('href');}
function invalidate(){revision++;downloaded=false;packageFile=null;$('share').disabled=true;$('delivery-status').textContent='Versión modificada: genera el ZIP antes de compartirlo o preparar el correo.';emailState();}
function branch(){refreshIdentity();const flight=$('resultado').value==='Encendió y salió de la base';setBlock('vuelo',flight);$('sensor').required=flight;const measured=flight&&$('sensor').value==='Sí';setBlock('medicion',measured);$('altura').required=measured;$('modelo_sensor').required=measured;setBlock('analisis',!$('ventana').value.startsWith('ALFA'));$('folio').textContent=folio();const w=currentWindow();$('window-info').textContent=w?`${w.nombre} · ${w.inicio.slice(0,10)} · ${w.inicio.slice(11,16)}-${w.fin.slice(11,16)} · Campo de soccer. ${Date.now()>Date.parse(w.fin)?'Ventana cerrada: puedes registrar un vuelo realizado.':'Registra únicamente intentos que ya ocurrieron.'}`:'';}
function saveDraft(){const data=Object.fromEntries(new FormData(form));try{localStorage.setItem(draftKey,JSON.stringify({data,id,created}));$('draft-status').textContent='Borrador guardado en este navegador · foto no incluida';}catch{$('draft-status').textContent='El navegador no permite guardar borradores. Descarga el ZIP.';}}
function newId(){return crypto.randomUUID?crypto.randomUUID():'registro-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function resetPhoto(){photoRevision++;photoBusy=false;$('download').disabled=packageBusy;photo=null;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;$('foto').value='';$('permission').checked=false;$('photo-area').hidden=true;}
if(!selectedWindow){
  $('window-picker').hidden=false;
  for(const w of windows){const a=document.createElement('a');a.className='button secondary';a.href='../ventanas/'+encodeURIComponent(w.nombre)+'.html';a.textContent=w.nombre;$('window-links').append(a);}
}
$('campus').value=settings.campus;
let restored=false;
try{const draft=JSON.parse(localStorage.getItem(draftKey)||localStorage.getItem('rockettec-bitacora-draft-v1'));if(selectedWindow&&draft?.data?.ventana===selectedWindow.nombre){for(const [key,value] of Object.entries(draft.data)){const el=form.elements.namedItem(key);if(el&&el.type!=='file'&&key!=='equipo'&&key!=='ventana')el.value=value;}refreshTeams(draft.data.equipo??'');id=draft.id;created=draft.created;restored=true;$('draft-status').textContent='Borrador recuperado · vuelve a seleccionar la foto si deseas incluirla';}}catch{}
if(!id)id=newId();if(!created)created=new Date().toISOString();
$('ventana').value=selectedWindow?.nombre||'';
$('ventana').defaultValue=$('ventana').value;
if(selectedWindow&&!restored)form.elements.fecha.value=selectedWindow.inicio.slice(0,10);
branch();emailState();
form.addEventListener('input',()=>{invalidate();branch();saveDraft();});
form.addEventListener('change',()=>{invalidate();branch();saveDraft();});
$('recipient-display').textContent=recipient();
$('copy-email').onclick=async()=>{try{await navigator.clipboard.writeText(recipient());$('share-status').textContent='Correo copiado. Pégalo en el campo Para de tu aplicación de correo.';}catch{$('share-status').textContent='Copia manualmente el destinatario: '+recipient();}};
$('share').onclick=async()=>{
  if(!packageFile||!downloaded)return;
  try{
    if(!navigator.share||!navigator.canShare?.({files:[packageFile]}))throw Error('Este navegador no permite compartir el ZIP. Usa la descarga y el correo preparado.');
    await navigator.share({files:[packageFile],title:'F1025B | '+folio(),text:`Para: ${recipient()}\nBitácora ${folio()} · Campus ${settings.campus}. Selecciona tu aplicación de correo y verifica el destinatario.`});
    $('share-status').textContent='Se cerró el menú de compartir. Verifica en tu aplicación que el ZIP esté adjunto y el correo enviado a '+recipient()+'. La página no confirma el envío.';
  }catch(e){$('share-status').textContent=e.name==='AbortError'?'Se canceló compartir. Tu ZIP sigue disponible.':e.message;}
};
$('clear').onclick=()=>{if(!confirm('¿Borrar el borrador local? Los ZIP ya descargados no se borran.'))return;form.reset();refreshTeams();resetPhoto();id=newId();created=new Date().toISOString();try{localStorage.removeItem(draftKey);}catch{}$('draft-status').textContent='Borrador borrado';invalidate();branch();};
$('remove-photo').onclick=()=>{resetPhoto();invalidate();};
$('foto').addEventListener('change',async()=>{
  const file=$('foto').files[0];resetPhoto();invalidate();error('');if(!file)return;
  const rev=photoRevision;photoBusy=true;$('download').disabled=true;
  try{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Selecciona JPG, PNG o WebP de hasta 12 MB.');
    const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
    if(!blob||blob.size>settings.maxFotoBytes)throw Error('La foto no pudo optimizarse. Prueba con una más pequeña.');
    const bytes=new Uint8Array(await blob.arrayBuffer());if(rev!==photoRevision)return;photo=bytes;photoUrl=URL.createObjectURL(blob);$('photo-preview').src=photoUrl;$('photo-area').hidden=false;
  }catch(e){if(rev===photoRevision)error(e.message);}finally{if(rev===photoRevision){photoBusy=false;$('download').disabled=packageBusy;}}
});
function download(bytes,name){const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
form.addEventListener('submit',async event=>{
  event.preventDefault();error('');if(!form.reportValidity()||photoBusy||packageBusy)return;
  packageBusy=true;$('download').disabled=true;const submittedRevision=revision;
  try{
    if(!selectedWindow||currentWindow()!==selectedWindow)throw Error('Abre la bitácora desde la página de la ventana de lanzamiento correspondiente.');
    const d=Object.fromEntries(new FormData(form));const actual=Date.parse(d.fecha+'T'+d.hora+':00-07:00');
    const team=catalog.equipo(d.grupo,d.equipo);if(!team)throw Error('Selecciona un equipo del grupo indicado.');d.nombre_equipo=team.nombre;
    if(!Number.isFinite(actual)||actual>Date.now()+60000)throw Error('La fecha y hora del intento deben corresponder a un lanzamiento ya realizado.');
    if(photo&&!$('permission').checked)throw Error('Confirma la autorización de las personas de la foto o quítala para continuar.');
    const w=currentWindow();if(actual<Date.parse(w.inicio)||actual>Date.parse(w.fin)){if(!confirm('La hora declarada está fuera del horario de esta ventana. ¿Confirmas que estos datos son correctos?'))return;}
    delete d.ventana;d.autorizacion_foto=photo?'Confirmada por quien elaboró la bitácora':'Sin fotografía';
    $('delivery-status').textContent='Preparando el ZIP con el logo de '+team.nombre+'…';
    const logo=await attachmentLogo(team);
    if(submittedRevision!==revision)throw Error('Cambiaste la bitácora mientras se preparaba el ZIP. Genera el paquete de nuevo.');
    const r={schema:'rocket-tec-bitacora/1',id,folio:folio(),campus:settings.campus,ventana:w.nombre,creada:created,actualizada:new Date().toISOString(),datos:d,foto:photo?'foto-grupal.jpg':null,logo:logo.name};
    const files=core.packageFiles(r,{logo:logo.bytes,photo});
    const bytes=core.zip(files);packageFile=new File([bytes],r.folio+'.zip',{type:'application/zip'});
    download(bytes,r.folio+'.zip');downloaded=true;saveDraft();$('delivery-status').textContent='ZIP generado y descarga solicitada. Ahora puedes compartirlo o adjuntarlo al correo preparado. La entrega aún no está confirmada.';emailState();
    let shareable=false;try{shareable=!!navigator.share&&!!navigator.canShare?.({files:[packageFile]});}catch{}
    $('share').disabled=!shareable;
    $('share-status').textContent=shareable?'Puedes compartir el ZIP directamente. Elige Outlook, Gmail o Mail y verifica el destinatario; el menú puede ofrecer otras aplicaciones.':'Este navegador no permite compartir este ZIP. Usa “Preparar correo” y adjunta el archivo descargado. La disponibilidad puede cambiar al probar desde HTTPS en un celular.';
  }catch(e){error(e.message);$('delivery-status').textContent='No se generó el paquete. Revisa los datos y vuelve a intentarlo.';$('error').scrollIntoView({behavior:'smooth'});}
  finally{packageBusy=false;$('download').disabled=photoBusy;}
});
window.addEventListener('beforeunload',event=>{if(!downloaded&&(photo||form.elements.equipo.value)){event.preventDefault();event.returnValue='';}});
