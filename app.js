'use strict';
/* ===== Datos y utilidades ===== */
const ESTADOS = ['Planeado', 'En diseño', 'En fabricación', 'En validación', 'Validado'];
const PROCESOS = ['Mecanizado', 'Soldadura', 'Ensamble', 'Pintura', 'RTM', 'Depósito', 'Varios'];
const TIPOS = ['Corte de chapa', 'Mecanizado', 'Plegado', 'Corte Serrucho', 'Comercial', 'Varios'];
const KEY = 'tablero-dispositivos-v1';

const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opts = (arr, sel) => arr.map(o => `<option${o === sel ? ' selected' : ''}>${esc(o)}</option>`).join('');
const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');

/* ===== Store: guardado en localStorage ===== */
const Store = {
  load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } },
  save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { alert('No se pudo guardar: el almacenamiento del navegador está lleno. Probá con una imagen más chica.'); }
  }
};

let devices = Store.load();
const filters = { q: '', proceso: 'Todos', estado: 'Todos' };
const find = id => devices.find(d => d.id === id);
const commit = () => { Store.save(devices); Board.render(); };

/* ===== Calc: avance según cantidades ===== */
const Calc = {
  avance(d) {
    let req = 0, ready = 0;
    d.piezas.forEach(p => { req += p.cantidad; ready += Math.min(p.lista, p.cantidad); });
    return { req, ready, pct: req ? ready / req * 100 : 0 };
  }
};
const bar = a => `<div class="bar"><i style="width:${a.pct}%"></i></div>`;

/* ===== Board: columnas, tarjetas, filtros y drag & drop ===== */
const Board = {
  dragId: null,
  visible(d) {
    if (filters.proceso !== 'Todos' && d.proceso !== filters.proceso) return false;
    if (filters.estado !== 'Todos' && d.estado !== filters.estado) return false;
    const q = filters.q.trim().toLowerCase();
    if (!q) return true;
    return [d.nombre, d.codigo, d.descripcion, ...d.piezas.flatMap(p => [p.codigo, p.descripcion])]
      .some(t => String(t || '').toLowerCase().includes(q));
  },
  card(d) {
    const a = Calc.avance(d);
    return `<article class="card" draggable="true" data-id="${d.id}">
      ${d.imagen ? `<img src="${d.imagen}" alt="">` : ''}
      <h3>${esc(d.nombre)}</h3>
      <p class="meta">Código: ${esc(d.codigo)} <span class="tag">${esc(d.proceso)}</span></p>
      ${d.descripcion ? `<p class="desc">${esc(d.descripcion)}</p>` : ''}
      ${a.req ? `<div class="prog"><span>Piezas ${a.ready}/${a.req}</span><b>${fmt(a.pct)}%</b></div>${bar(a)}`
              : '<div class="prog"><span>Sin piezas cargadas</span></div>'}
      <button class="edit" data-edit="${d.id}" title="Editar" aria-label="Editar">✎</button>
    </article>`;
  },
  render() {
    $('#board').innerHTML = ESTADOS.map((e, i) => {
      const list = devices.filter(d => d.estado === e && this.visible(d));
      return `<section class="col c${i}" data-estado="${e}">
        <header><h2>${e}</h2><span>${list.length} dispositivo${list.length === 1 ? '' : 's'}</span></header>
        <div class="cards">${list.map(this.card).join('') || '<p class="empty">Sin dispositivos</p>'}</div>
        <button class="add" data-add="${e}">+ Agregar tarjeta</button>
      </section>`;
    }).join('');
  },
  init() {
    const b = $('#board');
    b.addEventListener('click', ev => {
      const ed = ev.target.closest('[data-edit]'), ad = ev.target.closest('[data-add]'), c = ev.target.closest('.card');
      if (ed) Edit.open(ed.dataset.edit);
      else if (ad) Edit.open(null, ad.dataset.add);
      else if (c) Detail.open(c.dataset.id);
    });
    b.addEventListener('dragstart', ev => {
      const c = ev.target.closest('.card'); if (!c) return;
      this.dragId = c.dataset.id; ev.dataTransfer.setData('text/plain', this.dragId);
      ev.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging');
    });
    b.addEventListener('dragend', () => { this.dragId = null; this.render(); });
    b.addEventListener('dragover', ev => {
      const col = ev.target.closest('.col'); if (!col || !this.dragId) return;
      ev.preventDefault();
      document.querySelectorAll('.col.over').forEach(x => x !== col && x.classList.remove('over'));
      col.classList.add('over');
    });
    b.addEventListener('drop', ev => {
      const col = ev.target.closest('.col'); if (!col || !this.dragId) return;
      ev.preventDefault();
      const d = find(this.dragId);
      if (d && d.estado !== col.dataset.estado) {
        d.estado = col.dataset.estado;
        devices = devices.filter(x => x !== d).concat(d); // queda al final de la columna
      }
      this.dragId = null; commit();
    });
  }
};

/* ===== Detail: ventana con detalle y checklist de piezas ===== */
const Detail = {
  id: null,
  open(id) { this.id = id; this.render(); $('#detail').showModal(); },
  render() {
    const d = find(this.id); if (!d) return;
    const a = Calc.avance(d);
    $('#detail').innerHTML = `<div class="box">
      <div class="dhead"><h2>${esc(d.nombre)}</h2><button data-act="close" aria-label="Cerrar">✕</button></div>
      ${d.imagen ? `<img class="dimg" src="${d.imagen}" alt="">` : ''}
      <div class="drow"><span>Código: <b>${esc(d.codigo)}</b></span><span class="tag">${esc(d.proceso)}</span>
        <label class="qty">Estado <select data-act="estado">${opts(ESTADOS, d.estado)}</select></label></div>
      ${d.descripcion ? `<p>${esc(d.descripcion)}</p>` : ''}
      <h3 class="sec">Piezas${a.req ? ` — ${a.ready} de ${a.req} listas (${fmt(a.pct)}%)` : ''}</h3>
      ${a.req ? bar(a) : ''}
      <ul class="pzs">${d.piezas.map(p => {
        const ok = p.lista >= p.cantidad;
        return `<li class="pz${ok ? ' ok' : ''}" data-p="${p.id}">
          <input type="checkbox" data-act="toggle" ${ok ? 'checked' : ''} aria-label="Pieza lista">
          <div class="pt"><b>${esc(p.codigo)}</b> — ${esc(p.descripcion)}<small>${esc(p.tipo)}</small></div>
          <label class="qty"><input type="number" min="0" max="${p.cantidad}" value="${p.lista}" data-act="lista" aria-label="Cantidad lista"> / <input type="number" min="1" value="${p.cantidad}" data-act="cant" aria-label="Cantidad requerida"></label>
          <span class="st">${ok ? '☑ Lista' : `☐ Pendiente (faltan ${p.cantidad - p.lista})`}</span>
          <button class="x" data-act="del" aria-label="Quitar pieza">✕</button></li>`;
      }).join('') || '<li class="empty">Todavía no hay piezas. Agregá la primera.</li>'}</ul>
      <form id="pzForm">
        <label>Código de pieza<input name="codigo" required></label>
        <label>Descripción<input name="descripcion"></label>
        <label>Cantidad<input name="cantidad" type="number" min="1" value="1" required></label>
        <label>Tipo<select name="tipo">${opts(TIPOS)}</select></label>
        <button class="primary">+ Agregar pieza</button>
      </form>
      <div class="actions"><button data-act="edit">Editar</button><button class="danger" data-act="delete">Eliminar</button></div>
    </div>`;
  },
  init() {
    const dlg = $('#detail');
    const pieza = el => { const li = el.closest('.pz'); return li && find(this.id).piezas.find(p => p.id === li.dataset.p); };
    const apply = () => { commit(); this.render(); };
    dlg.addEventListener('click', ev => {
      const act = ev.target.closest('[data-act]')?.dataset.act, d = find(this.id);
      if (act === 'close') dlg.close();
      else if (act === 'edit') { dlg.close(); Edit.open(this.id); }
      else if (act === 'del') { d.piezas = d.piezas.filter(p => p !== pieza(ev.target)); apply(); }
      else if (act === 'delete' && confirm(`¿Eliminar "${d.nombre}"? Esta acción no se puede deshacer.`)) {
        devices = devices.filter(x => x !== d); dlg.close(); commit();
      }
    });
    dlg.addEventListener('change', ev => {
      const act = ev.target.dataset.act, d = find(this.id), p = pieza(ev.target); if (!act) return;
      if (act === 'estado') d.estado = ev.target.value;
      if (act === 'toggle') p.lista = ev.target.checked ? p.cantidad : 0;
      if (act === 'cant') { p.cantidad = Math.max(1, parseInt(ev.target.value) || 1); p.lista = Math.min(p.lista, p.cantidad); }
      if (act === 'lista') p.lista = Math.min(p.cantidad, Math.max(0, parseInt(ev.target.value) || 0));
      apply();
    });
    dlg.addEventListener('submit', ev => {
      if (ev.target.id !== 'pzForm') return;
      ev.preventDefault();
      const f = ev.target;
      find(this.id).piezas.push({ id: uid(), codigo: f.codigo.value.trim(), descripcion: f.descripcion.value.trim(),
        cantidad: Math.max(1, parseInt(f.cantidad.value) || 1), lista: 0, tipo: f.tipo.value });
      apply();
    });
  }
};

/* ===== Edit: crear y editar dispositivo ===== */
const shrink = file => new Promise(res => {
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 520 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = im.width * k; c.height = im.height * k;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', .8));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
});

const Edit = {
  id: null, img: '',
  open(id, estado) {
    const d = id ? find(id) : null, f = $('#editForm');
    this.id = id; this.img = d?.imagen || '';
    f.nombre.value = d?.nombre || ''; f.codigo.value = d?.codigo || ''; f.descripcion.value = d?.descripcion || '';
    f.proceso.innerHTML = opts(PROCESOS, d?.proceso);
    f.estado.innerHTML = opts(ESTADOS, d?.estado || estado || ESTADOS[0]);
    $('#imgFile').value = '';
    $('#editTitle').textContent = d ? 'Editar dispositivo' : 'Nuevo dispositivo';
    this.preview(); $('#edit').showModal();
  },
  preview() {
    $('#imgPrev').innerHTML = this.img ? `<img src="${this.img}" alt=""><button type="button" id="imgDel">Quitar imagen</button>` : '';
  },
  init() {
    $('#imgFile').addEventListener('change', async e => {
      if (e.target.files[0]) { this.img = await shrink(e.target.files[0]); this.preview(); }
    });
    $('#imgPrev').addEventListener('click', e => { if (e.target.id === 'imgDel') { this.img = ''; $('#imgFile').value = ''; this.preview(); } });
    $('#cancelEdit').addEventListener('click', () => $('#edit').close());
    $('#editForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const data = { nombre: f.nombre.value.trim(), codigo: f.codigo.value.trim(), proceso: f.proceso.value,
        estado: f.estado.value, descripcion: f.descripcion.value.trim(), imagen: this.img };
      if (this.id) Object.assign(find(this.id), data);
      else devices.push({ id: uid(), piezas: [], ...data });
      $('#edit').close(); commit();
    });
  }
};

/* ===== Arranque: buscador, filtros y botones ===== */
function initFilters() {
  const chips = $('#chips');
  chips.innerHTML = ['Todos', ...PROCESOS].map(p => `<button data-p="${p}"${p === 'Todos' ? ' class="on"' : ''}>${p}</button>`).join('');
  chips.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    filters.proceso = b.dataset.p;
    chips.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    Board.render();
  });
  $('#fEstado').innerHTML = '<option>Todos</option>' + opts(ESTADOS);
  $('#fEstado').addEventListener('change', e => { filters.estado = e.target.value; Board.render(); });
  $('#q').addEventListener('input', e => { filters.q = e.target.value; Board.render(); });
  $('#nuevo').addEventListener('click', () => Edit.open(null));
}

initFilters(); Board.init(); Detail.init(); Edit.init(); Board.render();
