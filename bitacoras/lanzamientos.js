'use strict';
const $=id=>document.getElementById(id);
const windows=window.ROCKET_WINDOWS||[];
const records=window.ROCKET_FLIGHTS||[];
for(const launch of windows){
  const option=document.createElement('option');option.value=launch.nombre;option.textContent=launch.nombre;$('window').append(option);
}
function readFilters(){
  const params=new URLSearchParams(window.location.search);
  const selected=params.get('ventana')||'';
  $('window').value=windows.some(item=>item.nombre===selected)?selected:'';
  const group=params.get('grupo')||'';
  $('group').value=['501','502','503','504'].includes(group)?group:'';
}
function text(tag,content,className){
  const node=document.createElement(tag);node.textContent=content;if(className)node.className=className;return node;
}
function render(){
  const selected=$('window').value,group=$('group').value;
  const filtered=records.filter(record=>(!selected||record.ventana===selected)&&(!group||record.grupo===group));
  filtered.sort((a,b)=>(b.fecha+'T'+b.hora).localeCompare(a.fecha+'T'+a.hora));
  $('title').textContent=selected?'Lanzamientos / '+selected:'Todos los lanzamientos';
  document.title=(selected||'Lanzamientos')+' · Bitácoras · Rocket Tec';
  $('back').href=selected?'../ventanas/'+encodeURIComponent(selected)+'.html':'../index.html';
  $('back').textContent=selected?'← Volver a '+selected:'← Volver a la pantalla principal';
  $('register').href=selected?'index.html?ventana='+encodeURIComponent(selected):'index.html';
  const examples=filtered.filter(record=>record.prueba).length,flights=filtered.length-examples;
  $('count').textContent=flights+' lanzamiento'+(flights===1?'':'s')+' publicado'+(flights===1?'':'s')+(examples?' · '+examples+' bitácora'+(examples===1?'':'s')+' de prueba':'');
  $('empty').hidden=filtered.length>0;
  $('empty-note').textContent='Las bitácoras'+(selected?' de '+selected:'')+(group?' del grupo '+group:'')+' aparecerán aquí después de que el profesor las revise y las incorpore al sitio.';
  $('all-windows').hidden=!selected&&!group;
  $('records').replaceChildren();
  for(const record of filtered){
    // El catálogo contiene rutas locales del sitio, nunca URLs de entregas externas.
    if(!/^publicadas\/[A-Z0-9-]+\/index\.html$/.test(record.pagina))continue;
    const card=document.createElement('article');card.className='flight';
    const top=document.createElement('div');top.className='flight-top';
    top.append(text('span',record.ventana,'eyebrow'),text('span',record.prueba?'REGISTRO DE PRUEBA':'BITÁCORA PUBLICADA','badge'));
    const title=text('h2',record.nombre);
    const team=text('p','Grupo '+record.grupo+' · Equipo '+record.equipo,'team');
    const date=new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Mazatlan'}).format(new Date(record.fecha+'T12:00:00-07:00'));
    const when=text('p',date+' · '+record.hora+' h · Sinaloa');
    const result=text('p',record.resultado+'. '+record.trayectoria+'.');
    const link=document.createElement('a');link.className='button';link.href=record.pagina;link.textContent='Consultar bitácora →';link.setAttribute('aria-label','Consultar bitácora de '+record.nombre+' en '+record.ventana);
    card.append(top,title,team,when,result);
    if(record.prueba)card.append(text('p','Datos de ejemplo para probar el sitio. No acredita un lanzamiento real.','example-note'));
    card.append(link);$('records').append(card);
  }
}
$('filters').addEventListener('submit',event=>event.preventDefault());
for(const id of ['window','group'])$(id).addEventListener('change',()=>{
  const params=new URLSearchParams();if($('window').value)params.set('ventana',$('window').value);if($('group').value)params.set('grupo',$('group').value);
  const search=params.toString();window.history.replaceState(null,'',window.location.pathname+(search?'?'+search:''));render();
});
window.addEventListener('popstate',()=>{readFilters();render();});
readFilters();render();
