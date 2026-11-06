/* =====================================================================
   SIGPM · Utilidades (DOM, formato, días hábiles, archivos)
   ===================================================================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => (n == null || n === '' || isNaN(n)) ? '—' : Number(n).toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const sum = (arr, f) => arr.reduce((a, x) => a + (+(typeof f === 'function' ? f(x) : x[f]) || 0), 0);
const round2 = x => Math.round(x * 100) / 100;
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Fechas (siempre en hora local, formato ISO YYYY-MM-DD) ---------- */
const pad = n => String(n).padStart(2, '0');
const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fechaDe = iso => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const hoyISO = () => isoDe(new Date());
const fmtFecha = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
const fmtFechaHora = iso => { if (!iso) return '—'; const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function esHabil(d) { const w = d.getDay(); return w !== 0 && w !== 6 && !FERIADOS.has(isoDe(d)); }
/* Suma n días hábiles, contando desde el día siguiente (art. 25 Ley 19.880) */
function sumarHabiles(iso, n) {
  const d = fechaDe(iso); let c = 0;
  while (c < n) { d.setDate(d.getDate() + 1); if (esHabil(d)) c++; }
  return isoDe(d);
}
/* Días hábiles transcurridos entre a (exclusive) y b (inclusive) */
function habilesEntre(a, b) {
  const d = fechaDe(a), fin = fechaDe(b); let c = 0;
  if (fin <= d) return 0;
  while (d < fin) { d.setDate(d.getDate() + 1); if (esHabil(d)) c++; }
  return c;
}
function restarHabiles(iso, n) {
  const d = fechaDe(iso); let c = 0;
  while (c < n) { d.setDate(d.getDate() - 1); if (esHabil(d)) c++; }
  return isoDe(d);
}
const corridosEntre = (a, b) => Math.round((fechaDe(b) - fechaDe(a)) / 864e5);
const sumarDias = (iso, n) => { const d = fechaDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };

/* ---------- RUT ---------- */
function rutDV(num) { let s = 0, m = 2; for (let n = num; n > 0; n = Math.floor(n / 10)) { s += (n % 10) * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); }
function fmtRut(num) { return Number(num).toLocaleString('es-CL').replace(/,/g, '.') + '-' + rutDV(num); }
function rutValido(rut) {
  const m = String(rut || '').replace(/[.\s]/g, '').toUpperCase().match(/^(\d{6,9})-?([\dK])$/);
  return !!m && rutDV(+m[1]) === m[2];
}

/* ---------- Avisos ---------- */
function toast(msg, kind = 'info') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.setAttribute('role', 'status'); t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 4200);
  setTimeout(() => t.remove(), 4800);
}

/* Diálogo modal propio (sin alert/confirm del navegador) */
function modal({ titulo, html, botones = [{ txt: 'Cerrar' }], ancho }) {
  return new Promise(resolve => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdl-t" style="${ancho ? 'max-width:' + ancho + 'px' : ''}">
      <h2 id="mdl-t">${esc(titulo)}</h2><div class="modal-body">${html || ''}</div>
      <div class="modal-actions">${botones.map((b, i) => `<button class="btn ${b.cls || (i === botones.length - 1 ? '' : 'ghost')}" data-i="${i}">${esc(b.txt)}</button>`).join('')}</div></div>`;
    document.body.appendChild(bg);
    const close = v => { bg.remove(); resolve(v); };
    $$('[data-i]', bg).forEach(b => b.addEventListener('click', () => {
      const btn = botones[+b.dataset.i];
      if (btn.validar && !btn.validar(bg)) return;
      close(btn.valor !== undefined ? (typeof btn.valor === 'function' ? btn.valor(bg) : btn.valor) : null);
    }));
    bg.addEventListener('keydown', e => { if (e.key === 'Escape') close(null); });
    const f = $('input,textarea,select,button', bg); if (f) f.focus();
  });
}

function descargar(nombre, texto, mime = 'application/octet-stream') {
  const blob = new Blob([texto], { type: mime });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function toKML(features, name) {
  const ring = r => r.map(c => `${c[0]},${c[1]},0`).join(' ');
  const poly = c => `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(c[0])}</coordinates></LinearRing></outerBoundaryIs>${c.slice(1).map(h => `<innerBoundaryIs><LinearRing><coordinates>${ring(h)}</coordinates></LinearRing></innerBoundaryIs>`).join('')}</Polygon>`;
  const geom = g => g.type === 'Polygon' ? poly(g.coordinates) : g.type === 'MultiPolygon' ? `<MultiGeometry>${g.coordinates.map(poly).join('')}</MultiGeometry>`
    : g.type === 'LineString' ? `<LineString><coordinates>${ring(g.coordinates)}</coordinates></LineString>` : g.type === 'Point' ? `<Point><coordinates>${g.coordinates.join(',')},0</coordinates></Point>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>\n` +
    features.map(f => `<Placemark><name>${esc((f.properties || {}).nombre || (f.properties || {}).rodal || '')}</name><ExtendedData>${Object.entries(f.properties || {}).map(([k, v]) => `<Data name="${esc(k)}"><value>${esc(v)}</value></Data>`).join('')}</ExtendedData>${geom(f.geometry)}</Placemark>`).join('\n') +
    '\n</Document></kml>';
}
