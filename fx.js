'use strict';
/* Efectos: brasas de fondo, chispas al mover/completar, inclinación de tarjetas. Independiente de app.js */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const board = document.getElementById('board'), det = document.getElementById('detail');
  const PALETA = ['#ffaf0f', '#6ea675', '#5678a3', '#d97a45', '#8a5fc2'];

  /* --- chispas / confeti --- */
  function burst(x, y, color, n, opt = {}) {
    if (reduce) return;
    const host = document.querySelector('dialog[open]') || document.body;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i'), c = opt.colors ? opt.colors[i % opt.colors.length] : color;
      const s = opt.confetti ? 6 + Math.random() * 6 : 3 + Math.random() * 4;
      el.className = 'spark';
      el.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${opt.confetti ? s * 1.6 : s}px;background:${c};border-radius:${opt.confetti ? '2px' : '50%'};box-shadow:${opt.confetti ? 'none' : '0 0 6px ' + c}`;
      host.appendChild(el);
      const a = Math.random() * Math.PI * 2, v = (opt.confetti ? 90 : 50) + Math.random() * (opt.confetti ? 160 : 90);
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - (opt.confetti ? 60 : 20), fall = (opt.confetti ? 140 : 40) + Math.random() * 60;
      el.animate([
        { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * .7}px),calc(-50% + ${dy}px)) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: .45 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy + fall}px)) rotate(${Math.random() * 720}deg) scale(.4)`, opacity: 0 }
      ], { duration: (opt.confetti ? 1100 : 650) + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => el.remove();
    }
  }

  /* --- soltar tarjeta en una columna --- */
  board.addEventListener('drop', e => {
    const col = e.target.closest('.col'); if (!col) return;
    const fin = col.classList.contains('c4');
    burst(e.clientX, e.clientY, getComputedStyle(col).getPropertyValue('--cc').trim(), fin ? 42 : 16, fin ? { confetti: true, colors: PALETA } : {});
  }, true);
  board.addEventListener('dragstart', () => document.body.classList.add('dragging'));
  board.addEventListener('dragend', () => document.body.classList.remove('dragging'));

  /* --- tarjetas nuevas o movidas: entrada y "aterrizaje" --- */
  const seen = new Map(); let first = true;
  new MutationObserver(() => {
    const cards = [...board.querySelectorAll('.card')]; if (!cards.length) return;
    cards.forEach((c, i) => {
      const id = c.dataset.id, st = c.closest('.col').dataset.estado;
      if (seen.get(id) !== st) { c.classList.add(first ? 'enter' : 'land'); c.style.setProperty('--i', i); }
      seen.set(id, st);
    });
    first = false;
  }).observe(board, { childList: true });

  /* --- inclinación y brillo siguiendo el mouse --- */
  board.addEventListener('mousemove', e => {
    const c = e.target.closest('.card'); if (!c || reduce || document.body.classList.contains('dragging')) return;
    const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    c.style.setProperty('--ry', ((px - .5) * 8).toFixed(2) + 'deg');
    c.style.setProperty('--rx', ((.5 - py) * 8).toFixed(2) + 'deg');
    c.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  });
  board.addEventListener('mouseout', e => {
    const c = e.target.closest('.card');
    if (c && !c.contains(e.relatedTarget)) ['--rx', '--ry', '--mx', '--my'].forEach(p => c.style.removeProperty(p));
  });

  /* --- piezas: chispas al completar y confeti al terminar todas --- */
  const allOk = () => { const r = det.querySelectorAll('.pz'); return r.length > 0 && [...r].every(x => x.classList.contains('ok')); };
  det.addEventListener('change', e => {
    const act = e.target.dataset.act; if (!['toggle', 'lista', 'cant'].includes(act)) return;
    const id = e.target.closest('.pz')?.dataset.p, r = e.target.getBoundingClientRect(), was = allOk();
    setTimeout(() => {
      const row = id && det.querySelector(`.pz[data-p="${id}"]`);
      if (row && row.classList.contains('ok') && act !== 'cant') { row.classList.add('pop'); burst(r.left + r.width / 2, r.top + r.height / 2, '#6ea675', 14); }
      if (!was && allOk()) { const b = det.getBoundingClientRect(); burst(b.left + b.width / 2, b.top + 90, '', 46, { confetti: true, colors: PALETA }); }
    }, 60);
  }, true);

  /* --- brasas de fondo (chispas de soldadura que suben despacio y se apartan del cursor) --- */
  if (reduce) return;
  const cv = document.createElement('canvas'); cv.id = 'embers'; document.body.prepend(cv);
  const ctx = cv.getContext('2d'); let W, H, mx = -999, my = -999;
  const sp = document.createElement('canvas'); sp.width = sp.height = 32;
  const g = sp.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,205,90,1)'); gr.addColorStop(.35, 'rgba(255,160,20,.5)'); gr.addColorStop(1, 'rgba(255,140,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  resize(); addEventListener('resize', resize);
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  const mk = init => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 20, s: 6 + Math.random() * 16, vy: .15 + Math.random() * .45, ph: Math.random() * 6.28, a: .2 + Math.random() * .4 });
  const ps = Array.from({ length: Math.round(Math.min(60, W * H / 30000)) }, () => mk(true));
  let t = 0, run = true;
  document.addEventListener('visibilitychange', () => { run = !document.hidden; if (run) loop(); });
  function loop() {
    if (!run) return;
    ctx.clearRect(0, 0, W, H); t += .01;
    for (const p of ps) {
      p.y -= p.vy; p.x += Math.sin(t * 1.5 + p.ph) * .25;
      const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
      if (d > 0 && d < 120) { const f = (120 - d) / 120 * 2.2; p.x += dx / d * f; p.y += dy / d * f; }
      if (p.y < -20) Object.assign(p, mk(false));
      ctx.globalAlpha = p.a; ctx.drawImage(sp, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    requestAnimationFrame(loop);
  }
  loop();
})();
