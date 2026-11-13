(function(){
  'use strict';
  const container=document.querySelector('.groups'),catalog=window.ROCKET_CATALOG;
  if(!container||!catalog)return;
  const popup=document.createElement('section');
  popup.id='group-logos';popup.className='group-popup';popup.hidden=true;
  popup.setAttribute('aria-label','Equipos del grupo');
  const heading=document.createElement('h2'),subtitle=document.createElement('p'),grid=document.createElement('div');
  heading.id='group-logos-title';popup.setAttribute('aria-labelledby',heading.id);
  subtitle.className='group-popup-subtitle';grid.className='group-popup-grid';
  popup.append(heading,subtitle,grid);document.body.append(popup);
  let active=null,hideTimer=null,hovered=null,lastPointer='mouse';
  function close(){
    if(active)active.setAttribute('aria-expanded','false');active=null;popup.classList.remove('is-open');
    clearTimeout(hideTimer);hideTimer=setTimeout(()=>{popup.hidden=true;},180);
  }
  function open(button){
    clearTimeout(hideTimer);
    if(active&&active!==button)active.setAttribute('aria-expanded','false');
    active=button;button.setAttribute('aria-expanded','true');
    const group=button.dataset.group,teams=catalog.grupos[group]||[];
    heading.textContent='Grupo '+group;subtitle.textContent=teams.length+' equipos · Rocket Tec Sinaloa 2026';
    grid.replaceChildren();grid.style.setProperty('--team-count',teams.length);
    for(const team of teams){
      const card=document.createElement('figure'),logo=document.createElement('img'),caption=document.createElement('figcaption'),number=document.createElement('span'),name=document.createElement('strong');
      logo.src=team.logo;logo.alt='Logo de '+team.nombre;logo.width=112;logo.height=112;logo.decoding='async';
      number.textContent='EQUIPO '+team.numero;name.textContent=team.nombre;
      caption.append(number,name);card.append(logo,caption);grid.append(card);
    }
    popup.hidden=false;
    const bounds=button.getBoundingClientRect(),width=Math.min(760,window.innerWidth-32);
    const left=Math.max(16,Math.min(bounds.left+bounds.width/2-width/2,window.innerWidth-width-16));
    popup.style.width=width+'px';popup.style.left=left+'px';popup.style.bottom=Math.max(16,window.innerHeight-bounds.top+12)+'px';
    popup.style.setProperty('--arrow-x',Math.max(18,Math.min(width-18,bounds.left+bounds.width/2-left))+'px');
    // Leer la geometría permite animar también la primera aparición.
    popup.getBoundingClientRect();popup.classList.add('is-open');
  }
  for(const label of [...container.querySelectorAll('b')]){
    const group=label.textContent.trim();if(!catalog.grupos[group])continue;
    const button=document.createElement('button');button.type='button';button.className='group-trigger';button.dataset.group=group;button.textContent=group;
    button.setAttribute('aria-label','Ver equipos del grupo '+group);button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',popup.id);
    label.replaceWith(button);
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;hovered=button;open(button);});
    button.addEventListener('pointerleave',event=>{if(event.pointerType==='touch')return;hovered=null;close();});
    button.addEventListener('pointerdown',event=>{lastPointer=event.pointerType;});
    button.addEventListener('focus',()=>{if(button.matches(':focus-visible')&&lastPointer!=='touch')open(button);});
    button.addEventListener('blur',close);
    button.addEventListener('click',()=>{if(hovered===button)return;if(active===button)close();else open(button);});
  }
  document.addEventListener('pointerdown',event=>{if(!container.contains(event.target)&&!popup.contains(event.target))close();});
  document.addEventListener('keydown',event=>{lastPointer='keyboard';if(event.key==='Escape')close();});
  window.addEventListener('resize',close);window.addEventListener('scroll',close,{passive:true});
})();
