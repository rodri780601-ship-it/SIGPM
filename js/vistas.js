/* =====================================================================
   SIGPM · Vistas generales: bandeja, mapa, ficha predial, registro, normativa
   ===================================================================== */
const chipEstado = s => { const e = ESTADOS[s.estado]; return `<span class="chip ${e.color}">${esc(e.nombre)}</span>`; };
function chipPlazo(s) {
  const p = plazo(s);
  if (!p) return '<span class="muted">—</span>';
  if (s.resolucion) return `<span class="chip ok" title="Resuelta en ${p.usados} días hábiles">${p.usados} d.h.</span>`;
  if (s.estado === 'desistida') return '<span class="muted">—</span>';
  return `<span class="chip ${p.nivel}" title="Vence el ${fmtFecha(p.vence)} (art. 8° Ley 20.283)">${p.quedan >= 0 ? `quedan ${p.quedan}` : `vencido hace ${-p.quedan}`} d.h.</span>`;
}
const supSol = s => round2(sum(s.pmfbn.rodales || [], 'superficie'));
const responsable = s => {
  if (s.estado === 'evaluacion' && s.asignacion) {
    const t = [];
    if (s.tecnico.estado !== 'enviado') t.push(usuario(s.asignacion.analista).nombre.split(' ')[0] + ' (técnico)');
    if (s.juridico.estado !== 'enviado') t.push(usuario(s.asignacion.abogado).nombre.split(' ')[0] + ' (jurídico)');
    return t.join(' · ') || '—';
  }
  const r = (ESTADOS[s.estado] || {}).rol; return r ? ROLES[r] : '—';
};

function filaSolicitud(s) {
  const p = predio(s.predioId) || {};
  return `<tr data-href="#exp/${s.id}"><td class="nowrap"><a href="#exp/${s.id}"><b>${esc(s.id)}</b></a></td><td>${esc(p.nombre || '(sin predio)')}<div class="muted small">${esc(p.comuna || '')} · rol ${esc(p.rol || '—')}</div></td>
    <td>${esc(s.interesado.nombre || '—')}</td><td>${esc(TIPOS_PLAN[s.tipoPlan].nombre.replace('Plan de manejo', 'PM'))}</td><td class="num">${fmt(supSol(s))}</td>
    <td>${fmtFecha(s.fechaIngreso)}</td><td>${chipEstado(s)}</td><td class="small">${esc(responsable(s))}</td><td>${chipPlazo(s)}</td></tr>`;
}
function tablaSolicitudes(list, vacio = 'No hay solicitudes.') {
  return `<div class="tbl-wrap"><table class="grid clickable"><thead><tr><th>N° solicitud</th><th>Predio</th><th>Interesado</th><th>Tipo</th><th class="num">Sup. (ha)</th><th>Ingreso</th><th>Estado</th><th>Responsable</th><th>Plazo legal</th></tr></thead>
    <tbody>${list.map(filaSolicitud).join('') || `<tr><td colspan="9" class="empty-row">${esc(vacio)}</td></tr>`}</tbody></table></div>`;
}
function bindFilas(el) { $$('tr[data-href]', el).forEach(tr => tr.addEventListener('click', e => { if (!e.target.closest('a,button')) location.hash = tr.dataset.href; })); }

/* ---------------- Bandeja ---------------- */
function vistaBandeja(main) {
  const pend = pendientesDe(USUARIO).sort((a, b) => ((plazo(a) || {}).quedan ?? 999) - ((plazo(b) || {}).quedan ?? 999));
  const activas = DB.solicitudes.filter(s => !['notificada', 'desistida'].includes(s.estado));
  const porVencer = activas.filter(s => { const p = plazo(s); return p && !s.resolucion && p.quedan <= 15; });
  const titulo = { ST: 'Recepción, subsanaciones y notificaciones', JA: 'Asignación y revisión de expedientes', AN: 'Evaluaciones técnicas asignadas', AB: 'Análisis jurídicos asignados', JP: 'Resoluciones para firma' }[USUARIO.rol];
  const kpi = (l, v, s, cls = '') => `<div class="kpi ${cls}"><div class="kpi-l">${esc(l)}</div><div class="kpi-v">${v}</div>${s ? `<div class="kpi-s">${s}</div>` : ''}</div>`;
  const conteo = Object.keys(ESTADOS).map(k => [k, DB.solicitudes.filter(s => s.estado === k).length]).filter(([, n]) => n);
  if (USUARIO.rol === 'ST') { vistaBandejaST(main, { pend, activas, porVencer, titulo }); return; }
  main.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${esc(ROLES[USUARIO.rol])} · ${esc(USUARIO.oficina)}</div><h1>Mi bandeja</h1><p class="muted">${esc(titulo)}</p></div></div>
    <div class="kpis">${kpi('Pendientes de mi acción', pend.length)}${kpi('Expedientes en trámite', activas.length)}
      ${kpi('Vencen en ≤ 15 días hábiles', porVencer.length, porVencer.length ? 'Revisar prioridad' : 'Sin urgencias', porVencer.length ? 'warn' : '')}
      ${kpi('Planes aprobados vigentes', DB.solicitudes.filter(s => s.resolucion && s.resolucion.tipo !== 'rechaza' && s.resolucion.vigenciaHasta >= hoyISO()).length)}</div>
    <h2>Pendientes de mi acción</h2>${tablaSolicitudes(pend, 'No tiene expedientes pendientes.')}
    <div class="split mt">
      <section><h2>Todas las solicitudes</h2>
        <div class="filters"><input id="f-q" placeholder="Buscar por N°, predio, rol o interesado" aria-label="Buscar solicitudes">
          <select id="f-est" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${Object.entries(ESTADOS).map(([k, e]) => `<option value="${k}">${esc(e.nombre)}</option>`).join('')}</select></div>
        <div id="todas"></div></section>
      <section><h2>Expedientes en el territorio</h2><div class="map-box"><div id="map-bandeja" class="map"></div></div>
        <div class="legend-row">${conteo.map(([k, n]) => `<span>${chipEstado({ estado: k })} ${n}</span>`).join('')}</div></section>
    </div>`;
  bindFilas(main);
  const render = () => {
    const q = norm($('#f-q').value), e = $('#f-est').value;
    const l = DB.solicitudes.filter(s => (!e || s.estado === e) && (!q || norm([s.id, s.interesado.nombre, (predio(s.predioId) || {}).nombre, (predio(s.predioId) || {}).rol].join(' ')).includes(q)))
      .sort((a, b) => (b.fechaIngreso || '9').localeCompare(a.fechaIngreso || '9'));
    $('#todas').innerHTML = tablaSolicitudes(l); bindFilas($('#todas'));
  };
  $('#f-q').addEventListener('input', render); $('#f-est').addEventListener('change', render); render();
  mapaGeneral($('#map-bandeja'), 'OpenStreetMap');
}

/* Bandeja de la secretaría técnica: indicadores clicables que despliegan su detalle */
function vistaBandejaST(main, { pend, activas, porVencer, titulo }) {
  const vigentes = DB.solicitudes.filter(s => s.resolucion);
  const porPlazo = l => l.slice().sort((a, b) => ((plazo(a) || {}).quedan ?? 999) - ((plazo(b) || {}).quedan ?? 999));
  const K = {
    pend: { l: 'Solicitudes pendientes de ingreso', list: porPlazo(DB.solicitudes.filter(s => ['recepcion', 'subsanacion'].includes(s.estado))), vacio: 'No hay solicitudes pendientes de ingreso.' },
    tramite: { l: 'Solicitudes en trámite', list: porPlazo(DB.solicitudes.filter(s => ['asignacion', 'evaluacion', 'revision', 'firma'].includes(s.estado))), vacio: 'No hay solicitudes en trámite.' },
    vigentes: { l: 'Solicitudes con resolución', list: vigentes, vacio: 'No hay solicitudes con resolución.' },
    vencen: { l: 'Solicitudes por vencer (≤ 15 días hábiles)', list: porPlazo(porVencer), vacio: 'Sin urgencias.', cls: porVencer.length ? 'warn' : '', sub: porVencer.length ? 'Revisar prioridad' : 'Sin urgencias' },
  };
  let sel = 'pend';
  main.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${esc(ROLES[USUARIO.rol])} · ${esc(USUARIO.oficina)}</div><h1>Mi bandeja</h1><p class="muted">${esc(titulo)}</p></div>
      <div class="row-btns wrap"><button class="btn ghost" id="btn-subir-sol" type="button">⬆ Subir solicitud (.json)</button><input type="file" id="file-subir-sol" accept=".json,application/json" hidden>
      <a class="btn" href="#nueva">+ Nueva solicitud</a></div></div>
    <div class="kpis" role="tablist">${Object.entries(K).map(([k, o]) => `<button type="button" role="tab" class="kpi kpi-btn ${o.cls || ''}" data-kpi="${k}" style="text-align:left;cursor:pointer;font:inherit">
      <div class="kpi-l">${esc(o.l)}</div><div class="kpi-v">${o.list.length}</div>${o.sub ? `<div class="kpi-s">${o.sub}</div>` : ''}</button>`).join('')}</div>
    <div id="kpi-detalle"></div>`;
  const pintar = () => {
    $$('[data-kpi]', main).forEach(b => { const on = b.dataset.kpi === sel; b.setAttribute('aria-selected', on); b.style.outline = on ? '2px solid currentColor' : ''; });
    $('#kpi-detalle').innerHTML = `<h2>${esc(K[sel].l)}</h2>${tablaSolicitudes(K[sel].list, K[sel].vacio)}`;
    bindFilas($('#kpi-detalle'));
  };
  $$('[data-kpi]', main).forEach(b => b.addEventListener('click', () => { sel = b.dataset.kpi; pintar(); }));
  const bSubir = $('#btn-subir-sol'), fSubir = $('#file-subir-sol');
  bSubir.addEventListener('click', () => fSubir.click());
  fSubir.addEventListener('change', async () => { const f = fSubir.files[0]; fSubir.value = ''; if (f) await subirSolicitudJSON(f); });
  pintar();
}

const COLOR_ESTADO = { neutral: '#868e96', warn: '#e67700', info: '#1c7ed6', accent: '#7048e8', ok: '#2b8a3e', bad: '#c92a2a' };
function ultimaSolicitud(pid) { return DB.solicitudes.filter(s => s.predioId === pid).sort((a, b) => (b.fechaIngreso || '9').localeCompare(a.fechaIngreso || '9'))[0]; }
function mapaGeneral(el, base) {
  const { map, ctrl } = nuevoMapa(el, base);
  const g = L.featureGroup().addTo(map);
  DB.predios.forEach(p => {
    const s = ultimaSolicitud(p.id);
    const col = s ? COLOR_ESTADO[ESTADOS[s.estado].color] : '#495057';
    L.geoJSON(p.geom, { style: { color: col, weight: 2.5, fillColor: col, fillOpacity: .25 } })
      .bindPopup(`<b>${esc(p.nombre)}</b><br>${esc(p.comuna)} · rol ${esc(p.rol)} · ${fmt(p.supSIG)} ha<br>${s ? `${esc(s.id)} · ${esc(ESTADOS[s.estado].nombre)}<br><a href="#exp/${s.id}">Abrir expediente</a> · ` : ''}<a href="#predio/${p.id}">Ficha predial</a>`)
      .bindTooltip(p.nombre).addTo(g);
    const c = turf.centroid(p.geom).geometry.coordinates;
    L.circleMarker([c[1], c[0]], { radius: 6, color: '#fff', weight: 2, fillColor: col, fillOpacity: 1 }).bindTooltip(p.nombre).on('click', () => { location.hash = `#predio/${p.id}`; }).addTo(g);
  });
  const ref = L.featureGroup([
    L.geoJSON(DB.ref.snaspe, { style: { color: '#2b8a3e', dashArray: '6 4', weight: 1.5, fillOpacity: .05 } }),
    L.geoJSON(DB.ref.humedales, { style: { color: '#0b7285', weight: 1.5, fillOpacity: .2 } }),
    L.geoJSON(DB.ref.glaciares, { style: { color: '#74c0fc', weight: 1.5, fillColor: '#e7f5ff', fillOpacity: .7 } }),
  ]).addTo(map);
  ctrl.addOverlay(g, 'Predios y solicitudes'); ctrl.addOverlay(ref, 'Capas de referencia');
  if (g.getLayers().length) map.fitBounds(g.getBounds(), { padding: [20, 20] }); else map.setView([-39.8, -72.8], 9);
  return map;
}

/* ---------------- Mapa y fichas prediales ---------------- */
function vistaMapa(main) {
  main.innerHTML = `<div class="page-head"><div><div class="eyebrow">Base geoespacial</div><h1>Mapa y fichas prediales</h1>
      <p class="muted">Cada predio es el punto de entrada a sus solicitudes, planes aprobados y cartografía. El color indica el estado de la última solicitud.</p></div></div>
    <div class="map-page"><div class="map-box tall"><div id="map-general" class="map"></div></div>
      <aside class="pred-list"><input id="pq" placeholder="Buscar predio, rol o comuna" aria-label="Buscar predio"><div id="plist"></div></aside></div>`;
  const map = mapaGeneral($('#map-general'), 'Satélite (Esri)');
  const render = () => {
    const q = norm($('#pq').value);
    $('#plist').innerHTML = DB.predios.filter(p => !q || norm(`${p.nombre} ${p.rol} ${p.comuna}`).includes(q)).map(p => {
      const s = ultimaSolicitud(p.id);
      return `<div class="pred-item" data-id="${p.id}"><div><a href="#predio/${p.id}"><b>${esc(p.nombre)}</b></a><div class="muted small">${esc(p.comuna)} · rol ${esc(p.rol)} · ${fmt(p.supSIG)} ha</div></div>
        <div>${s ? chipEstado(s) : '<span class="muted small">Sin solicitudes</span>'}</div></div>`;
    }).join('');
    $$('.pred-item').forEach(d => d.addEventListener('mouseenter', () => { const p = predio(d.dataset.id); map.flyToBounds(L.geoJSON(p.geom).getBounds(), { maxZoom: 13, duration: .6 }); }));
  };
  $('#pq').addEventListener('input', render); render();
}

function vistaPredio(main, id) {
  const p = predio(id);
  if (!p) { main.innerHTML = '<div class="empty">Predio no encontrado.</div>'; return; }
  const sols = DB.solicitudes.filter(s => s.predioId === id).sort((a, b) => (b.fechaIngreso || '9').localeCompare(a.fechaIngreso || '9'));
  const vig = sols.filter(s => s.resolucion && s.resolucion.tipo !== 'rechaza' && s.resolucion.vigenciaHasta >= hoyISO());
  const c = turf.centroid(p.geom).geometry.coordinates, u = toUTM(c[0], c[1]);
  main.innerHTML = `<div class="page-head"><div><div class="eyebrow">Ficha predial</div><h1>${esc(p.nombre)}</h1>
      <p class="muted">${esc(p.comuna)} · Provincia de ${esc(p.provincia)} · Región de ${esc(p.region)} · Rol ${esc(p.rol)}</p></div>
      <div class="row-btns">${USUARIO.rol === 'ST' ? `<a class="btn" href="#nueva/${p.id}">+ Nueva solicitud para este predio</a>` : ''}<button class="btn ghost" id="exp-predio">Exportar cartografía</button></div></div>
    <div class="ficha-grid">
      <section>
        <table class="kv"><tr><th>Superficie SIG</th><td>${fmt(p.supSIG)} ha</td></tr><tr><th>Centroide</th><td>UTM ${u.huso}S · E ${fmt(u.E, 0)} · N ${fmt(u.N, 0)} (WGS 84)</td></tr>
          <tr><th>Inscripción de dominio</th><td>Fojas ${p.cbr.fojas} N° ${p.cbr.numero} del año ${p.cbr.anio}, CBR de ${esc(p.cbr.conservador)}</td></tr>
          <tr><th>Precipitación media</th><td>${fmt(p.precipitacion, 0)} mm/año</td></tr>
          <tr><th>Cursos de agua cartografiados</th><td>${p.cursos.features.length}</td></tr>
          <tr><th>Planes aprobados vigentes</th><td>${vig.length ? vig.map(s => `<a href="#exp/${s.id}">Res. ${esc(s.resolucion.numero)}</a> (${fmt(s.resolucion.supAprobada)} ha, hasta ${fmtFecha(s.resolucion.vigenciaHasta)})`).join('<br>') : 'Ninguno'}</td></tr></table>
        <h2>Solicitudes y planes del predio</h2>${tablaSolicitudes(sols, 'El predio no registra solicitudes.')}
      </section>
      <section><div class="map-box tall"><div id="map-predio" class="map"></div></div>
        <p class="muted small">Se muestran las áreas de todos los planes del predio. Las capas de referencia (áreas protegidas, humedales, glaciares y especies) son ficticias.</p></section>
    </div>`;
  bindFilas(main);
  const { map, ctrl } = nuevoMapa($('#map-predio'));
  dibujarPredio(map, ctrl, p, null);
  sols.forEach(s => {
    if (!s.cartografia) return;
    const col = COLOR_ESTADO[ESTADOS[s.estado].color];
    const l = L.geoJSON(s.cartografia, { style: { color: col, weight: 2, fillColor: col, fillOpacity: .3 }, onEachFeature: (f, ly) => ly.bindPopup(`<b>${esc(s.id)}</b> · rodal ${esc(f.properties.rodal)}<br>${esc(ESTADOS[s.estado].nombre)}<br><a href="#exp/${s.id}">Abrir expediente</a>`) }).addTo(map);
    ctrl.addOverlay(l, `${s.id} (${ESTADOS[s.estado].nombre})`);
  });
  $('#exp-predio').addEventListener('click', () => {
    const fc = turf.featureCollection([turf.feature(p.geom.geometry, { capa: 'predio', nombre: p.nombre, rol: p.rol }), ...p.cursos.features.map(f => turf.feature(f.geometry, { capa: 'curso_agua', ...f.properties }))]);
    descargar(`${p.nombre.replace(/[^A-Z0-9]+/gi, '_')}.geojson`, JSON.stringify(fc), 'application/geo+json');
  });
}

/* ---------------- Registro público (art. 29 D.S. 93) ---------------- */
function vistaRegistro(main) {
  const aprob = DB.solicitudes.filter(s => s.resolucion && s.resolucion.tipo !== 'rechaza');
  main.innerHTML = `<div class="page-head"><div><div class="eyebrow">Art. 9° Ley 20.283 · art. 29 D.S. 93</div><h1>Registro público de planes de manejo</h1>
    <p class="muted">Planes aprobados con los campos mínimos que exige el reglamento.</p></div><button class="btn ghost" id="reg-csv">Descargar CSV</button></div>
    <div class="tbl-wrap"><table class="grid"><thead><tr><th>Región</th><th>Provincia</th><th>Comuna</th><th>Tipo de plan</th><th>Predio</th><th>Rol</th><th>Inscripción de dominio</th><th>Propietario</th>
    <th class="num">Sup. afecta (ha)</th><th>Tipo forestal</th><th>Vigencia</th><th>Resolución</th></tr></thead><tbody>
    ${aprob.map(s => { const p = predio(s.predioId); const tfs = [...new Set((s.pmfbn.rodales || []).filter(r => (s.resolucion.rodalesAprobados || []).includes(r.numero)).map(r => TIPOS_FORESTALES[r.tipoForestal].nombre))];
      return `<tr><td>${esc(p.region)}</td><td>${esc(p.provincia)}</td><td>${esc(p.comuna)}</td><td>${esc(TIPOS_PLAN[s.tipoPlan].nombre)}</td><td><a href="#predio/${p.id}">${esc(p.nombre)}</a></td><td>${esc(p.rol)}</td>
      <td>Fs. ${p.cbr.fojas} N° ${p.cbr.numero} ${p.cbr.anio}</td><td>${esc(s.interesado.nombre)}</td><td class="num">${fmt(s.resolucion.supAprobada)}</td><td>${esc(tfs.join(', '))}</td>
      <td>${fmtFecha(s.resolucion.vigenciaHasta)}</td><td><a href="#exp/${s.id}/resolucion">N° ${esc(s.resolucion.numero)}</a> de ${fmtFecha(s.resolucion.fecha)}</td></tr>`; }).join('') || '<tr><td colspan="12" class="empty-row">Sin planes aprobados.</td></tr>'}
    </tbody></table></div>`;
  $('#reg-csv').addEventListener('click', () => {
    const rows = aprob.map(s => { const p = predio(s.predioId); return [p.region, p.provincia, p.comuna, TIPOS_PLAN[s.tipoPlan].nombre, p.nombre, p.rol, `Fs ${p.cbr.fojas} N ${p.cbr.numero} ${p.cbr.anio}`, s.interesado.nombre, String(s.resolucion.supAprobada).replace('.', ','), s.resolucion.vigenciaHasta, s.resolucion.numero]; });
    const head = ['region', 'provincia', 'comuna', 'tipo_plan', 'predio', 'rol', 'inscripcion', 'propietario', 'sup_ha', 'vigencia', 'resolucion'];
    descargar('registro_publico_planes.csv', '﻿' + [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv');
  });
}

/* ---------------- Normativa aplicada ---------------- */
function vistaNormativa(main) {
  const t = (h, rows) => `<div class="tbl-wrap"><table class="grid"><thead><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  main.innerHTML = `<div class="page-head"><div><div class="eyebrow">Fuente: Normativa Forestal, CONAF, ed. enero 2026</div><h1>Normativa aplicada por el sistema</h1>
    <p class="muted">Reglas que el sistema verifica o pide verificar. La resolución final siempre es del jefe provincial.</p></div></div>
    <h2>Plazos del procedimiento</h2>${t(['Trámite', 'Plazo', 'Fuente'], [
      ['Pronunciamiento sobre el plan de manejo', `${NORMA.plazoResolucion} días hábiles desde el ingreso; vencido, se tiene por aprobado salvo áreas del art. 17`, 'Art. 8° Ley 20.283; art. 6° D.S. 93'],
      ['Subsanar antecedentes incompletos', `${NORMA.plazoSubsanar} días; si no, se tiene por desistida`, 'Art. 31 Ley 19.880'],
      ['Modificación de plan aprobado', `${NORMA.plazoModificacion} días hábiles`, 'Art. 12 Ley 20.283; art. 7° D.S. 93'],
      ['Envío de resolución denegatoria por carta certificada', `${NORMA.plazoNotificarRechazo} días hábiles`, 'Art. 6° D.S. 93'],
      ['Reclamo judicial del rechazo', `${NORMA.plazoReclamo} días desde la carta certificada`, 'Art. 5° D.L. 701; art. 8° Ley 20.283'],
      ['Vigencia del certificado de dominio', `${NORMA.vigenciaDominio} días hábiles`, 'Art. 22 d) D.S. 93'],
      ['Vigencia de personería de persona jurídica', `${NORMA.vigenciaPersoneria} días corridos`, 'Art. 23 b) D.S. 93'],
    ].map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`))}
    <h2>Pauta técnica</h2>${t(['Código', 'Requisito', 'Fuente', 'Verificación'], PAUTA_TECNICA.map(c => `<tr><td><b>${c.id}</b></td><td>${esc(c.txt)}</td><td>${esc(c.art)}</td><td>${c.auto ? '<span class="chip info">Automática + analista</span>' : '<span class="chip">Analista</span>'}</td></tr>`))}
    <h2>Pauta jurídica</h2>${t(['Código', 'Requisito', 'Fuente', 'Verificación'], PAUTA_JURIDICA.map(c => `<tr><td><b>${c.id}</b></td><td>${esc(c.txt)}</td><td>${esc(c.art)}</td><td>${c.auto ? '<span class="chip info">Automática + abogado</span>' : '<span class="chip">Abogado</span>'}</td></tr>`))}
    <h2>Zonas de protección de cursos de agua (D.S. 82)</h2>${t(['Sección de cauce', 'Zona de exclusión', 'Zona de manejo limitado'], [
      ['< 0,2 m²', 'No aplica', 'No aplica'], ['0,2 a 0,5 m²', '5 m a cada lado', 'No aplica'],
      ['> 0,5 m² / manantiales y cuerpos de agua', '10 m', '10 m (pendiente 30–45 %) · 20 m (> 45 %)']].map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`))}
    <p class="muted small">En la zona de exclusión solo se admite raleo o corta de selección/protección dejando 50 % de cobertura y madereo con cable o huinche (art. 3°). Desde La Araucanía al sur se aplica solo a cursos permanentes (art. 5°).</p>
    <h2>Cobertura mínima remanente (D.S. 82 arts. 7° y 8°)</h2>${t(['Situación', 'Mínimo'], [
      ['Esclerófilo y palma chilena, pendiente < 45 %', '20 %'], ['Esclerófilo y palma chilena, pendiente ≥ 45 %', '40 % (60 % en suelos graníticos)'],
      ['Otros tipos, pendiente < 45 %', '30 %'], ['Otros tipos, pendiente ≥ 45 %', '40 %'], ['Pendiente > 60 % o precipitación > 1.500 mm (salvo Aysén y Magallanes)', '60 %']].map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`))}`;
}
