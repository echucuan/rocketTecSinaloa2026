'use strict';
(function () {
  const gallery = document.getElementById('team-logo-gallery');
  if (!gallery) return;

  // El primer logo es Rocket Tec: solo rotan los otros cuatro.
  const images = [...gallery.querySelectorAll('img')].slice(1);
  const pauseButton = document.getElementById('gallery-pause');
  const official = { src: 'assets/rocket-tec-oficial.png', alt: 'Rocket Tec Sinaloa 2026' };
  const teams = Object.values(window.ROCKET_CATALOG?.grupos || {}).flat()
    .filter(team => typeof team.logo === 'string' && team.logo)
    .map(team => ({ src: team.logo, alt: team.nombre || 'Logo de equipo' }));
  const slides = teams.filter((team, index, all) =>
    team.src !== official.src && all.findIndex(other => other.src === team.src) === index);
  if (slides.length < 4) return;

  let previous = [];
  let paused = false;
  let timer;
  const pending = [0, 0, 0, 0];

  function randomSet(pool, count) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  function setLogo(img, slide, slot, immediately) {
    const token = ++pending[slot];
    if (img.getAttribute('src') === slide.src) {
      img.alt = slide.alt;
      return;
    }
    const preload = new Image();
    preload.src = slide.src;
    const show = () => {
      if (token !== pending[slot]) return;
      if (immediately || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        img.src = slide.src;
        img.alt = slide.alt;
      } else {
        img.classList.add('is-changing');
        setTimeout(() => {
          if (token !== pending[slot]) return;
          img.src = slide.src;
          img.alt = slide.alt;
          requestAnimationFrame(() => img.classList.remove('is-changing'));
        }, 280);
      }
    };
    if (preload.complete && preload.naturalWidth) show();
    else preload.onload = show;
  }

  function advance(immediately = false) {
    const fresh = slides.filter(slide => !previous.includes(slide.src));
    const selected = randomSet(fresh.length >= 4 ? fresh : slides, 4);
    previous = selected.map(slide => slide.src);
    selected.forEach((slide, index) => setLogo(images[index], slide, index, immediately));
  }

  function schedule() {
    clearInterval(timer);
    if (!paused && !document.hidden) timer = setInterval(() => advance(), 7000);
  }

  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? 'Reanudar logos' : 'Pausar logos';
    pauseButton.setAttribute('aria-label', pauseButton.textContent);
    pauseButton.setAttribute('aria-pressed', String(paused));
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  advance(true);
  schedule();
})();
