'use strict';
/* Modo carrusel: al tocar una columna se abre una vista horizontal de sus dispositivos.
   Usa las funciones de app.js (devices, Board, Detail, Edit, commit, find...). */
(() => {
  const car = document.getElementById('carousel');
  let cur = null, raf = 0;

  const slide = d => {
    const a = Calc.avance(d);
    return `<article class="cslide" data-id="${d.id}">
      ${d.imagen ? `<img src="${d.imagen}" alt="" data-c="open">` : '<div class="cnoimg">sin foto</div>'}
      <h3 class="mono">${esc(d.nombre)}</h3>
      <p class="cmeta">Código: ${esc(d.codigo)} <span class="badge">${esc(d.proceso)}</span></p>
      ${d.descripcion ? `<p class="cdesc">${esc(d.descripcion)}</p>` : ''}
      <div class="prog"><span>${a.req ? `${a.ready}/${a.req} piezas listas` : 'Sin piezas cargadas'}</span><span>${a.req ? fmt(a.pct) + '%' : ''}</span></div>${a.req ? bar(a) : ''}
      <div class="cact">
        <button class="primary" data-c="open">Ver detalle</button>
        ${d.ubicacion ? '<button data-c="copy">📁 Copiar ubicación</button>' : ''}
        <label class="cmove">Mover a <select data-c="move">${opts(ESTADOS, d.estado)}</select></label>
      </div></article>`;
  };

  function render() {
    const keep = car.querySelector('.ctrack')?.scrollLeft || 0;
    const list = devices.filter(x => x.estado === cur && Board.visible(x)), i = ESTADOS.indexOf(cur);
    const filt = filters.q || filters.proceso !== 'Todos' || filters.estado !== 'Todos';
    car.innerHTML = `<div class="chead">
        <h2 class="c${i}"><span class="dot"></span>${cur}</h2>
        <span class="col-count">${list.length} dispositivo${list.length === 1 ? '' : 's'}${filt ? ' · filtros activos' : ''}</span>
        <span class="cnum"></span>
        <button class="cclose" data-c="close">✕ Volver al tablero</button></div>
      <div class="cwrap c${i}">
        <button class="arrow l" data-c="prev" aria-label="Anterior">‹</button>
        <div class="ctrack">${list.map(slide).join('') || '<p class="cempty">No hay dispositivos en este estado.</p>'}</div>
        <button class="arrow r" data-c="next" aria-label="Siguiente">›</button></div>`;
    car.querySelector('.ctrack').scrollLeft = keep;
    mark();
  }

  function mark() {
    const t = car.querySelector('.ctrack'); if (!t) return;
    const mid = t.scrollLeft + t.clientWidth / 2; let best = null, bd = 1e9, idx = 0;
    [...t.children].forEach((s, k) => {
      s.classList.remove('active');
      const dd = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (dd < bd) { bd = dd; best = s; idx = k; }
    });
    if (best && best.classList.contains('cslide')) { best.classList.add('active'); car.querySelector('.cnum').textContent = `${idx + 1} / ${t.children.length}`; }
  }

  const step = dir => { const t = car.querySelector('.ctrack'), s = t?.querySelector('.cslide'); if (s) t.scrollBy({ left: dir * (s.offsetWidth + 28), behavior: 'smooth' }); };

  function open(estado) {
    cur = estado; render(); car.showModal();
    const t = car.querySelector('.ctrack'); t.scrollLeft = 0; mark();
  }

  /* abrir desde el tablero (clic en el encabezado de la columna) */
  document.getElementById('board').addEventListener('click', e => {
    const h = e.target.closest('.col > header');
    if (h) open(h.closest('.col').dataset.estado);
  });

  /* acciones dentro del carrusel */
  car.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'), sl = e.target.closest('.cslide');
    if (!b) {
      if (sl && !sl.classList.contains('active')) sl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      else if (!sl && !e.target.closest('.chead,.arrow')) car.close();
      return;
    }
    const act = b.dataset.c;
    if (act === 'close') car.close();
    else if (act === 'prev') step(-1);
    else if (act === 'next') step(1);
    else if (act === 'open' && sl) { if (sl.classList.contains('active')) Detail.open(sl.dataset.id); else sl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
    else if (act === 'copy' && sl) copyLoc(b, find(sl.dataset.id));
  });
  car.addEventListener('change', e => {
    const s = e.target.closest('[data-c="move"]'); if (!s) return;
    const sl = s.closest('.cslide'), d = find(sl.dataset.id);
    if (!d || ro() || s.value === d.estado) return;
    sl.classList.add('out');
    setTimeout(() => { d.estado = s.value; d.t = Date.now(); commit(d); }, 260);
  });

  /* rueda del mouse y teclado mueven el carrusel */
  car.addEventListener('wheel', e => {
    const t = e.target.closest('.ctrack');
    if (t && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { t.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
  car.addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  });
  car.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, true);
  car.addEventListener('close', () => { cur = null; });

  /* si el tablero se redibuja (cambios en vivo), el carrusel se actualiza */
  const orig = Board.render.bind(Board);
  Board.render = function () { orig(); if (cur && car.open) render(); };
})();
