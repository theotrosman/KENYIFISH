// === FAST INIT para móviles + autoplay sin botón de play ===
(function () {
  const video = document.getElementById('bgVideo');
  if (!video) return;

  // -------- Preferencias del navegador/usuario
  const canWebM = !!video.canPlayType && video.canPlayType('video/webm; codecs="vp9,vorbis"');
  const conn = navigator.connection || navigator.webkitConnection || {};
  const saveData = !!conn.saveData;
  const smallScreen = Math.min(screen.width, screen.height) <= 480;

  // -------- Elegimos aleatoriamente un fondo (1..5)
  const order = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
  let idx = 0;

  // -------- Config del <video> para evitar overlays/controles
  video.controls = false;
  video.removeAttribute('controls');
  video.muted = true;               // requerido para autoplay en iOS/Chrome
  video.setAttribute('muted', '');
  video.playsInline = true;         // no abrir fullscreen en iOS
  video.setAttribute('playsinline', '');
  video.loop = true;
  video.setAttribute('loop', '');
  video.setAttribute('disablepictureinpicture', '');
  video.setAttribute('controlsList', 'nodownload nofullscreen noplaybackrate');

  // Si el usuario pidió menos movimiento, no cargamos video
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    video.parentElement && video.parentElement.classList.add('no-video');
    return;
  }

  // -------- Elección de fuente (más liviana en móvil/ahorro de datos)
  function pickSrc(n) {
    // si tenés variantes móviles (fondoindexN-mobile.*) descomentá:
    // const base = (saveData || smallScreen) ? `fondoindex${n}-mobile` : `fondoindex${n}`;
    const base = `fondoindex${n}`;
    const first = canWebM ? `${base}.webm` : `${base}.mp4`;
    const second = canWebM ? `${base}.mp4` : `${base}.webm`;
    return [first, second];
  }

  function setSources(n) {
    video.innerHTML = '';
    const [src1, src2] = pickSrc(n);

    // Hint de preload del elegido
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = src1;
    document.head.appendChild(link);

    const s1 = document.createElement('source');
    s1.src = src1;
    s1.type = src1.endsWith('.webm') ? 'video/webm' : 'video/mp4';

    const s2 = document.createElement('source');
    s2.src = src2;
    s2.type = src2.endsWith('.webm') ? 'video/webm' : 'video/mp4';

    video.appendChild(s1);
    video.appendChild(s2);
    video.load();
  }

  function tryNext() {
    if (idx >= order.length) return;
    setSources(order[idx++]);
    safePlay();
  }

  // -------- Intentos de autoplay + fallbacks
  function safePlay() {
    video.play().then(() => {
      // ok: nos aseguramos que no aparezcan controles
      video.controls = false;
    }).catch(() => {
      // Si falla (iOS/Android exige gesto), armamos listeners 1 vez:
      const kick = () => {
        video.play().finally(() => {
          cleanup();
          video.controls = false;
        });
      };
      const cleanup = () => {
        ['touchstart','pointerdown','mousedown','keydown','click','visibilitychange']
          .forEach(ev => document.removeEventListener(ev, kick, { passive: true }));
      };
      ['touchstart','pointerdown','mousedown','keydown','click','visibilitychange']
        .forEach(ev => document.addEventListener(ev, kick, { passive: true }));
    });
  }

  // si el archivo falla, probamos otro
  video.addEventListener('error', tryNext);
  // a veces iOS necesita otro intento al estar visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) safePlay();
  });

  tryNext();

  // === PERF EXTRAS ===

  // 1) Lazy de imágenes genéricas (si no usás ya loading="lazy")
  requestIdleCallback?.(() => {
    document.querySelectorAll('img:not([loading])').forEach(img => img.loading = 'lazy');
  });

  // 2) Evitar reflows pesados en secciones fuera de vista
  // (asegurate de tener .reveal en las secciones)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  // 3) Si el usuario activa Ahorro de datos, reducimos filtros del video
  if (saveData) {
    video.style.filter = 'contrast(1)'; // menos post-proceso
  }
})();
