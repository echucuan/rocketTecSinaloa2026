'use strict';
const $=id=>document.getElementById(id),core=window.BitacoraCore;let photoUrl,logoUrl;
$('file').addEventListener('change',async()=>{
  $('error').hidden=true;$('record').hidden=true;$('photo').hidden=true;$('review-identity').hidden=true;if(photoUrl)URL.revokeObjectURL(photoUrl);if(logoUrl)URL.revokeObjectURL(logoUrl);
  const file=$('file').files[0];if(!file)return;
  try{
    if(file.size>8*1024*1024)throw Error('El archivo supera 8 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());let r,photo,files;
    if(file.name.toLowerCase().endsWith('.zip')){files=core.unzip(bytes);r=JSON.parse(new TextDecoder().decode(files['bitacora.json']));photo=files['foto-grupal.jpg'];}
    else if(file.name.toLowerCase().endsWith('.json'))r=JSON.parse(new TextDecoder().decode(bytes));
    else throw Error('Selecciona un ZIP original o un archivo JSON.');
    core.validate(r);$('folio').textContent=r.folio;$('meta').textContent=`Campus ${r.campus} · ${r.ventana} · ID ${r.id} · Elaboración ${r.creada} (UTC)`;
    $('fields').innerHTML=core.rows(r);
    const team=window.ROCKET_CATALOG.equipo(r.datos.grupo,r.datos.equipo);
    if(team){
      const logo=r.logo&&files?.[r.logo];
      if(logo){logoUrl=URL.createObjectURL(new Blob([logo],{type:core.logoMime(r.logo,logo)}));$('review-logo').src=logoUrl;}
      else $('review-logo').src='../'+team.logo;
      $('review-logo').alt='Logo de '+team.nombre;$('review-team').textContent=team.nombre;
      $('review-team-meta').textContent='Grupo '+r.datos.grupo+' · Equipo '+team.numero;$('review-identity').hidden=false;
    }
    $('photo-note').textContent=r.foto?'El equipo declaró que adjunta una foto. Verifica la autorización antes de hacerla pública.':'Entrega sin foto grupal.';
    if(photo){if(!r.foto||photo.length>3*1024*1024||photo[0]!==0xff||photo[1]!==0xd8)throw Error('Fotografía inválida.');photoUrl=URL.createObjectURL(new Blob([photo],{type:'image/jpeg'}));$('photo').src=photoUrl;$('photo').hidden=false;}
    else if(r.foto)$('photo-note').textContent='El registro menciona una foto, pero no está en el archivo seleccionado. Abre el ZIP completo o solicita la imagen.';
    $('record').hidden=false;
  }catch(e){$('error').textContent='No se pudo abrir: '+e.message;$('error').hidden=false;}
});
