(function(root){
  'use strict';
  function sequence(catalog){
    const slides=[{src:'assets/rocket-tec-oficial.png',nombre:'Rocket Tec Sinaloa 2026',duration:60000,official:true}];
    for(const [grupo,teams] of Object.entries(catalog?.grupos||{}))for(const team of teams)slides.push({src:team.logo,nombre:team.nombre,grupo,equipo:team.numero,duration:3000,official:false});
    return slides;
  }
  function start(document){
    const stage=document.getElementById('logo-rotator');if(!stage)return;
    const images=[...stage.querySelectorAll('.logo-slide')],slides=sequence(root.ROCKET_CATALOG);
    if(images.length!==2||slides.length<2)return;
    const first=document.querySelector('.slogan-first'),second=document.querySelector('.slogan-second');
    const pause=document.getElementById('pause-logos');
    let index=0,active=0,timer=null,paused=false,remaining=slides[0].duration,deadline=0,epoch=0,started=false;
    const caption=slide=>{
      first.textContent=slide.official?'Ciencia que se construye.':slide.nombre;
      second.textContent=slide.official?'Ingeniería que despega.':'Grupo '+slide.grupo+' · Equipo '+slide.equipo;
      stage.dataset.kind=slide.official?'official':'team';
    };
    function schedule(){
      if(!started||paused||document.hidden)return;
      clearTimeout(timer);deadline=Date.now()+remaining;timer=setTimeout(advance,remaining);
    }
    async function advance(){
      timer=null;remaining=0;const token=++epoch,next=(index+1)%slides.length,slot=1-active,image=images[slot],slide=slides[next];
      image.src=slide.src;image.alt=slide.official?slide.nombre:slide.nombre+' · Grupo '+slide.grupo+' · Equipo '+slide.equipo;
      try{await image.decode();}catch{
        if(token!==epoch)return;index=next;remaining=250;schedule();return;
      }
      if(token!==epoch||paused||document.hidden)return;
      images[active].classList.remove('is-active');image.classList.add('is-active');
      images[active].setAttribute('aria-hidden','true');image.removeAttribute('aria-hidden');
      active=slot;index=next;caption(slide);remaining=slide.duration;schedule();
    }
    function suspend(){
      if(timer!==null){remaining=Math.max(0,deadline-Date.now());clearTimeout(timer);timer=null;}
      epoch++;
    }
    pause.hidden=false;
    pause.addEventListener('click',()=>{
      paused=!paused;if(paused)suspend();else schedule();
      pause.textContent=paused?'▷':'Ⅱ';pause.setAttribute('aria-pressed',String(paused));
      pause.setAttribute('aria-label',paused?'Reanudar presentación de logos':'Pausar presentación de logos');
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else schedule();});
    function begin(){
      if(started)return;started=true;stage.classList.add('logo-enter');caption(slides[0]);schedule();
      // Carga las imágenes durante el minuto inicial, sin cambiar las visibles.
      const preload=()=>{let queue=Promise.resolve();for(const slide of slides.slice(1))queue=queue.then(async()=>{const img=new Image();img.decoding='async';img.src=slide.src;try{await img.decode();}catch{}});};
      if(root.requestIdleCallback)root.requestIdleCallback(preload,{timeout:2000});else setTimeout(preload,1000);
    }
    if(images[0].complete&&images[0].naturalWidth>0)begin();else{images[0].addEventListener('load',begin,{once:true});images[0].addEventListener('error',begin,{once:true});}
  }
  const api={sequence,start};if(typeof module!=='undefined')module.exports=api;
  root.RocketLogos=api;if(root.document)start(root.document);
})(typeof window!=='undefined'?window:globalThis);
