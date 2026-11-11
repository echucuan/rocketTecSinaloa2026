'use strict';
const rocketLogo = document.querySelector('.emblem img');
if (rocketLogo) {
  const animateLogo = () => rocketLogo.classList.add('logo-enter');
  if (rocketLogo.complete) animateLogo();
  else rocketLogo.addEventListener('load', animateLogo, {once:true});
}
const config = window.ROCKET_TEC || {};
if (typeof config.etiqueta === 'string') document.getElementById('message-label').textContent = config.etiqueta;
if (typeof config.mensaje === 'string') {
  const message = document.getElementById('message-text');
  message.textContent = config.mensaje;
  message.style.whiteSpace = 'pre-line';
}
const button = document.getElementById('fullscreen');
let controlsTimer;
function showControls() {
  document.body.classList.add('controls-visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => document.body.classList.remove('controls-visible'), 2600);
}
document.addEventListener('pointermove', showControls, {passive:true});
document.addEventListener('keydown', showControls);
button.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else throw new Error('Fullscreen unavailable');
  } catch {
    const notice = document.getElementById('notice');
    notice.textContent = 'Usa F11 en el navegador para activar la pantalla completa.';
    notice.hidden = false;
    setTimeout(() => { notice.hidden = true; }, 6000);
  }
});
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
  button.querySelector('span').textContent = label;
  button.setAttribute('aria-label', label);
  button.title = label;
});
showControls();

// ALFA-1: horario de Sinaloa (UTC-7), independiente del huso del dispositivo.
const launchWindows = (window.ROCKET_WINDOWS || []).map(item => ({...item, start:Date.parse(item.inicio), end:Date.parse(item.fin)})).filter(item => Number.isFinite(item.start) && item.end > item.start).sort((a,b) => a.start-b.start);
const clockUnits = ['DÍAS','HORAS','MIN','SEG'];
function nearestWindow(now = Date.now()) {
  const index = launchWindows.findIndex(item => item.end > now && !['cancelada','exitosa'].includes(item.estado));
  return index < 0 ? Math.max(0,launchWindows.length-1) : index;
}
let selectedWindow = nearestWindow();
let manualUntil = 0;
function moveWindow(direction) {
  selectedWindow = Math.max(0,Math.min(launchWindows.length-1,selectedWindow+direction));
  manualUntil = Date.now()+60000;
  updateLaunchCountdown();
}
document.getElementById('launch-prev').addEventListener('click',()=>moveWindow(-1));
document.getElementById('launch-next').addEventListener('click',()=>moveWindow(1));
const carousel = document.querySelector('.launch-carousel');
carousel.addEventListener('keydown',event=>{
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveWindow(event.key === 'ArrowLeft' ? -1 : 1); }
});
let touchStart;
carousel.addEventListener('touchstart',event=>{touchStart=event.touches[0].clientX;},{passive:true});
carousel.addEventListener('touchend',event=>{
  if(touchStart === undefined) return;
  const delta=event.changedTouches[0].clientX-touchStart;
  if(Math.abs(delta)>45) moveWindow(delta<0?1:-1);
  touchStart=undefined;
},{passive:true});
function updateLaunchCountdown(now = Date.now()) {
  const panel = document.querySelector('.launch-window');
  const status = document.getElementById('launch-status');
  const clock = document.getElementById('launch-clock');
  if (!panel || !status || !clock) return;
  if(now >= manualUntil) selectedWindow=nearestWindow(now);
  const launch = launchWindows[selectedWindow];
  document.getElementById('launch-position').textContent = launch ? `${selectedWindow+1} / ${launchWindows.length} · ${launch.nombre}` : 'SIN VENTANAS';
  document.getElementById('launch-prev').disabled = selectedWindow===0;
  document.getElementById('launch-next').disabled = selectedWindow>=launchWindows.length-1;
  if (!launch) { status.textContent = 'EN ESPERA DE PROGRAMACIÓN'; clock.replaceChildren(); return; }
  const launchStart = launch.start;
  const launchEnd = launch.end;
  const qrLink = document.getElementById('launch-qr');
  if (qrLink) {
    qrLink.hidden = launch.nombre !== 'ALFA-1' && !launch.qr;
    qrLink.href = launch.pagina || 'https://echucuan.github.io/rocketTecSinaloa2026/ventanas/ALFA-1.html';
    qrLink.setAttribute('aria-label','Consultar ventana '+launch.nombre);
    qrLink.querySelector('img').src = launch.qr || 'assets/qr-ALFA-1.png';
    qrLink.querySelector('img').alt = 'QR de la página de '+launch.nombre;
  }
  panel.querySelector('.launch-name strong').textContent = launch.nombre;
  panel.setAttribute('aria-label', 'Ventana de lanzamiento ' + launch.nombre);
  const dateFormat = new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mazatlan',day:'numeric',month:'short'});
  const timeFormat = new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mazatlan',hour:'numeric',minute:'2-digit'});
  panel.querySelector('.launch-schedule').textContent = `${dateFormat.format(launchStart)} · ${timeFormat.format(launchStart)} – ${timeFormat.format(launchEnd)} · Sinaloa`;
  const open = now >= launchStart && now < launchEnd;
  const closed = now >= launchEnd;
  panel.classList.toggle('is-open', open);
  panel.classList.toggle('is-closed', closed);
  if (launch.estado === 'cancelada' || launch.estado === 'exitosa') {
    const success = launch.estado === 'exitosa';
    status.textContent = success ? '✓ VENTANA EXITOSA' : '⊘ VENTANA CANCELADA';
    clock.textContent = launch.nombre;
    clock.setAttribute('aria-label',status.textContent);
    panel.classList.add('is-closed');
    document.getElementById('mission-time-note').textContent = launch.motivo || 'Resultado registrado de esta ventana.';
    return;
  }
  const note = document.getElementById('mission-time-note');
  const atZero = open && now - launchStart < 1000;
  status.textContent = closed ? 'VENTANA FINALIZADA' : atZero ? 'T = 0 · APERTURA DE VENTANA' : open ? 'VENTANA ABIERTA · TIEMPO TRANSCURRIDO' : 'APERTURA EN';
  if (note) {
    if (closed) note.textContent = 'T de referencia: apertura de la ventana.';
    else if (open) {
      const left = Math.max(0,Math.ceil((launchEnd-now)/1000));
      const remaining = [Math.floor(left/3600),Math.floor(left%3600/60),left%60].map(n=>String(n).padStart(2,'0')).join(':');
      note.textContent = (atZero ? 'T = 0: la ventana abre ahora.' : 'T+: tiempo desde la apertura.') + ' Cierre en ' + remaining;
    } else note.textContent = 'T−: tiempo para abrir · T = 0: apertura · T+: tiempo desde la apertura';
  }
  if (closed) { clock.textContent = launch.nombre + ' CERRADA'; clock.setAttribute('aria-label',launch.nombre+' cerrada'); return; }
  const seconds = Math.max(0, open ? Math.floor((now-launchStart)/1000) : Math.ceil((launchStart-now)/1000));
  const values = [Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60];
  if (!clock.querySelector('.clock-unit')) {
    clock.innerHTML = '<span class="clock-prefix">T−</span>' + clockUnits.map(label => `<span class="clock-unit"><b>00</b><small>${label}</small></span>`).join('');
  }
  clock.querySelector('.clock-prefix').textContent = atZero ? 'T=0' : open ? 'T+' : 'T−';
  clock.querySelectorAll('.clock-unit b').forEach((digit,index) => { digit.textContent = String(values[index]).padStart(2,'0'); });
  clock.setAttribute('aria-label', `${values[0]} días, ${values[1]} horas, ${values[2]} minutos y ${values[3]} segundos`);
}
updateLaunchCountdown();
setInterval(updateLaunchCountdown, 1000);
