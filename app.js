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
function updateLaunchCountdown(now = Date.now()) {
  const panel = document.querySelector('.launch-window');
  const status = document.getElementById('launch-status');
  const clock = document.getElementById('launch-clock');
  if (!panel || !status || !clock) return;
  const launch = launchWindows.find(item => item.end > now) || launchWindows[launchWindows.length-1];
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
  status.textContent = closed ? 'VENTANA FINALIZADA' : open ? 'VENTANA ABIERTA · CIERRE EN' : 'APERTURA EN';
  if (closed) { clock.textContent = launch.nombre + ' CERRADA'; return; }
  const seconds = Math.max(0, Math.ceil(((open ? launchEnd : launchStart) - now) / 1000));
  const values = [Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60];
  if (!clock.querySelector('.clock-unit')) {
    clock.innerHTML = '<span class="clock-prefix">T−</span>' + clockUnits.map(label => `<span class="clock-unit"><b>00</b><small>${label}</small></span>`).join('');
  }
  clock.querySelector('.clock-prefix').textContent = open ? 'FIN−' : 'T−';
  clock.querySelectorAll('.clock-unit b').forEach((digit,index) => { digit.textContent = String(values[index]).padStart(2,'0'); });
  clock.setAttribute('aria-label', `${values[0]} días, ${values[1]} horas, ${values[2]} minutos y ${values[3]} segundos`);
}
updateLaunchCountdown();
setInterval(updateLaunchCountdown, 1000);
