'use strict';
const launch = (window.ROCKET_WINDOWS || []).find(item => item.nombre === document.body.dataset.window);
const state = document.getElementById('window-state');
if (launch) {
  const now = Date.now();
  state.textContent = now < Date.parse(launch.inicio) ? 'VENTANA PROGRAMADA' : now < Date.parse(launch.fin) ? 'VENTANA ABIERTA' : 'VENTANA FINALIZADA';
}
const statusLine = document.getElementById('weather-status');
const directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
const formatValue = (value, unit) => Number.isFinite(value) ? `${Math.round(value)}${unit}` : 'No disponible';
function weatherIcon(code) {
  const rain = code >= 51;
  const cloud = code > 1;
  return `<svg viewBox="0 0 64 64" role="img" aria-label="${rain?'Lluvia':cloud?'Nubosidad':'Despejado'}"><circle cx="26" cy="24" r="12" fill="#ffd877"/>${cloud?'<path d="M17 44a10 10 0 0 1 0-20 15 15 0 0 1 28 2 9 9 0 1 1 2 18Z" fill="#cee5ff"/>':''}${rain?'<path d="m24 50-3 6m14-6-3 6m14-6-3 6" stroke="#71baff" stroke-width="3" stroke-linecap="round"/>':''}</svg>`;
}
async function loadWeather() {
  if (!launch) { statusLine.textContent = 'Ventana no configurada.'; return; }
  const date = launch.inicio.slice(0,10);
  const localToday = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mazatlan'}).format(new Date());
  const days = (Date.parse(date+'T12:00:00Z')-Date.parse(localToday+'T12:00:00Z'))/86400000;
  if (days < -5) { statusLine.textContent = 'Ventana finalizada. El pronóstico de esta fecha ya no está disponible; el mapa inferior muestra condiciones actuales.'; return; }
  if (days > 15) { statusLine.textContent = 'El pronóstico se mostrará cuando la fecha entre en el horizonte de 16 días.'; return; }
  const params = new URLSearchParams({latitude:'24.8',longitude:'-107.4',hourly:'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',timezone:'America/Mazatlan',start_date:date,end_date:date});
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Weather unavailable');
    const data = await response.json();
    const h = data.hourly;
    const startHour = Number(launch.inicio.slice(11,13));
    const endHour = Number(launch.fin.slice(11,13));
    const cards = document.getElementById('weather-cards'); cards.replaceChildren();
    h.time.forEach((time,i) => {
      const hour = Number(time.slice(11,13)); if (hour < startHour || hour > endHour) return;
      const card = document.createElement('article'); card.className='hour-card';
      const direction = Number.isFinite(h.wind_direction_10m[i]) ? directions[Math.round(h.wind_direction_10m[i]/22.5)%16] : '—';
      card.innerHTML = `<h3>${String(hour).padStart(2,'0')}:00</h3>${weatherIcon(h.weather_code[i])}<p class="temperature">${formatValue(h.temperature_2m[i],' °C')}</p><p>Lluvia ${formatValue(h.precipitation_probability[i],' %')}</p><p>Viento ${formatValue(h.wind_speed_10m[i],' km/h')} · ${direction}</p><p>Ráfagas ${formatValue(h.wind_gusts_10m[i],' km/h')}</p>`;
      cards.append(card);
    });
    if (!cards.children.length) throw new Error('No hourly data');
    statusLine.textContent = 'Consulta actualizada: '+new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mazatlan',dateStyle:'short',timeStyle:'short'}).format(new Date())+' · Hora de Sinaloa';
  } catch { statusLine.textContent = 'No se pudo consultar el pronóstico. Recarga la página o consulta el mapa meteorológico inferior.'; }
}
loadWeather();
