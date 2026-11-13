(function(root){
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const catalog=root.ROCKET_CATALOG||(typeof require==='function'?require('./catalogos.js'):null);
  function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
  function zip(files){
    const parts=[],directory=[];let offset=0;
    for(const [name,content] of Object.entries(files)){
      const filename=enc.encode(name),data=typeof content==='string'?enc.encode(content):content,crc=crc32(data);
      const h=new Uint8Array(30+filename.length),v=new DataView(h.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,filename.length,true);h.set(filename,30);
      const d=new Uint8Array(46+filename.length),w=new DataView(d.buffer);
      w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,0x21,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,filename.length,true);w.setUint32(42,offset,true);d.set(filename,46);
      parts.push(h,data);directory.push(d);offset+=h.length+data.length;
    }
    const size=directory.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
    e.setUint32(0,0x06054b50,true);e.setUint16(8,directory.length,true);e.setUint16(10,directory.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
    const output=new Uint8Array(offset+size+22);let p=0;for(const x of [...parts,...directory,end]){output.set(x,p);p+=x.length;}return output;
  }
  function unzip(bytes){
    if(bytes.length>8*1024*1024)throw Error('El paquete supera 8 MB.');
    const files={},v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let p=0;
    while(p+4<=bytes.length&&v.getUint32(p,true)===0x04034b50){
      if(p+30>bytes.length)throw Error('ZIP incompleto.');
      const flags=v.getUint16(p+6,true),method=v.getUint16(p+8,true),len=v.getUint32(p+18,true),n=v.getUint16(p+26,true),extra=v.getUint16(p+28,true),start=p+30+n+extra;
      if(method!==0||(flags&9)||start+len>bytes.length)throw Error('Abre el ZIP original generado por la bitácora, sin recomprimirlo.');
      const name=dec.decode(bytes.slice(p+30,p+30+n));
      if(!['bitacora.json','reporte.html','foto-grupal.jpg','logo-equipo.png','logo-equipo.jpg'].includes(name)||files[name])throw Error('Contenido del paquete no reconocido.');
      const data=bytes.slice(start,start+len);if(crc32(data)!==v.getUint32(p+14,true))throw Error('Archivo dañado.');
      files[name]=data;p=start+len;
    }
    if(!files['bitacora.json'])throw Error('No se encontró bitacora.json.');return files;
  }
  function validate(r){
    if(r?.schema!=='rocket-tec-bitacora/1'||!r.id||!r.datos||!r.ventana)throw Error('Formato de bitácora no compatible.');
    if(typeof r.id!=='string'||!/^[\w-]{8,80}$/.test(r.id)||typeof r.folio!=='string'||r.folio.length>120)throw Error('Identificación inválida.');
    if(!/^[A-Z0-9-]{1,30}$/.test(r.ventana)||typeof r.campus!=='string'||r.campus.length>100||typeof r.creada!=='string'||!Number.isFinite(Date.parse(r.creada)))throw Error('Metadatos inválidos.');
    if(typeof r.datos!=='object'||Array.isArray(r.datos)||Object.keys(r.datos).length>40)throw Error('Datos inválidos.');
    for(const [key,value] of Object.entries(r.datos)){if(typeof value!=='string'||value.length>3000||key.length>60)throw Error('Campo inválido.');}
    if(!['501','502','503','504'].includes(r.datos.grupo)||!/^\d{1,2}$/.test(r.datos.equipo))throw Error('Equipo inválido.');
    if(r.datos.intento!==undefined&&!/^\d{1,2}$/.test(r.datos.intento))throw Error('Número de intento inválido.');
    const team=catalog?.equipo(r.datos.grupo,r.datos.equipo);
    if(r.datos.motores_restantes!==undefined&&!/^[1-8]$/.test(r.datos.motores_restantes))throw Error('Motores restantes debe ser un valor del 1 al 8.');
    if(catalog&&!team)throw Error('El equipo no pertenece al catálogo de este grupo.');
    if(team&&r.datos.nombre_equipo&&r.datos.nombre_equipo!==team.nombre)throw Error('El nombre del equipo no coincide con el catálogo.');
    if(r.foto!==null&&r.foto!=='foto-grupal.jpg')throw Error('Referencia de foto inválida.');
    if(r.logo!=null&&!['logo-equipo.png','logo-equipo.jpg'].includes(r.logo))throw Error('Referencia de logo inválida.');return r;
  }
  const labels={grupo:'Grupo',equipo:'Equipo',intento:'Intento en esta ventana',fecha:'Fecha del lanzamiento',hora:'Hora del lanzamiento (Sinaloa)',version:'Versión del diseño',masa:'Masa lista para despegar (g)',motor:'Modelo del motor',motores:'Número de motores',prediccion:'Altura predicha (m)',resultado:'Encendido y salida de la base',trayectoria:'Trayectoria observada',paracaidas:'Despliegue del paracaídas',sensor:'Lectura válida del sensor',altura:'Altura máxima medida (m)',modelo_sensor:'Modelo del sensor',recuperacion:'Recuperación',observaciones:'Observaciones',explicacion:'Interpretación',mejora:'Cambio propuesto',autorizacion_foto:'Autorización de la fotografía'};
  labels.nombre_equipo='Nombre del equipo';
  labels.motores_restantes='Motores restantes después del lanzamiento';
  function rows(r){const team=catalog?.equipo(r.datos.grupo,r.datos.equipo);const data={...r.datos};if(team)data.nombre_equipo=team.nombre;return Object.entries(data).filter(([,v])=>v!=='').map(([key,value])=>`<dt>${escape(labels[key]||key)}</dt><dd>${escape(value)}</dd>`).join('');}
  function logoMime(name,bytes){
    if(!(bytes instanceof Uint8Array)||bytes.length>2*1024*1024)throw Error('El logo del equipo supera 2 MB o no es válido.');
    if(name==='logo-equipo.png'&&[137,80,78,71,13,10,26,10].every((byte,i)=>bytes[i]===byte))return 'image/png';
    if(name==='logo-equipo.jpg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
    throw Error('El formato del logo no corresponde al archivo.');
  }
  function report(r){validate(r);return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(r.folio)}</title><style>body{font:16px/1.6 Arial;max-width:850px;margin:40px auto;padding:24px;color:#142b45}h1{font-size:28px}dt{font-weight:bold;margin-top:15px}dd{margin:0;white-space:pre-wrap}img{max-width:100%;height:auto}.team-logo{width:140px;height:140px;object-fit:contain}small{color:#52677c}@media print{body{margin:0}img{max-height:350px}}</style>${r.logo?`<img class="team-logo" src="${escape(r.logo)}" alt="Logo de ${escape(catalog?.equipo(r.datos.grupo,r.datos.equipo)?.nombre||'equipo')}">`:''}<h1>Bitácora de lanzamiento</h1><p>${escape(r.folio)} · Campus ${escape(r.campus)}</p><small>ID: ${escape(r.id)}<br>Registro elaborado: ${escape(r.creada)} (UTC). Fecha declarada por el dispositivo; no es un sello de recepción.</small><dl>${rows(r)}</dl>${r.foto?'<h2>Foto grupal</h2><img src="foto-grupal.jpg" alt="Equipo con el cohete después del lanzamiento">':''}<p>Documento elaborado por el equipo. Requiere revisión del profesor antes de su publicación.</p></html>`;}
  function packageFiles(r,{logo,photo}={}){
    validate(r);const files={'bitacora.json':JSON.stringify(r,null,2),'reporte.html':report(r)};
    if(r.logo){logoMime(r.logo,logo);files[r.logo]=logo;}
    if(r.foto){if(!(photo instanceof Uint8Array)||photo.length>3*1024*1024||photo[0]!==255||photo[1]!==216)throw Error('No se encontró una fotografía válida.');files[r.foto]=photo;}
    return files;
  }
  const api={zip,unzip,validate,escape,rows,report,crc32,logoMime,packageFiles};root.BitacoraCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
