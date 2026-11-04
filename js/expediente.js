/* =====================================================================
   SIGPM · Expediente de solicitud (flujo completo por rol)
   ===================================================================== */
const TABS = [
  ['resumen', 'Resumen'], ['ingreso', 'Ingreso y antecedentes'], ['formulario', 'Formulario PMFBN'], ['cartografia', 'Cartografía y análisis'],
  ['tecnico', 'Evaluación técnica'], ['juridico', 'Informe jurídico'], ['revision', 'Revisión jefatura'], ['resolucion', 'Resolución'], ['historial', 'Historial'],
];
const REVISION_ITEMS = [
  ['r1', 'La pauta técnica está completa y cada «no cumple» está fundado'],
  ['r2', 'Las decisiones por rodal son coherentes con el análisis espacial y la visita a terreno'],
  ['r3', 'Solo se objeta la superficie que no cumple, de forma fundada (art. 6° D.S. 93)'],
  ['r4', 'El informe jurídico permite resolver (requisitos legales cumplidos o rechazo fundado)'],
];

function vistaNueva(main, predioId) {
  if (USUARIO.rol !== 'ST') { main.innerHTML = '<div class="empty">Solo la secretaría técnica recepciona solicitudes. Cambie de usuario en la parte superior.</div>'; return; }
  const sol = nuevaSolicitudVacia();
  if (predioId && predio(predioId)) { sol.predioId = predioId; const p = predio(predioId); sol.pmfbn.predio = { nombre: p.nombre, rol: p.rol, comuna: p.comuna, superficieTotal: p.supSIG, precipitacion: p.precipitacion }; }
  registrar(sol, 'Solicitud creada en recepción');
  DB.solicitudes.push(sol); guardar();
  location.replace(`#exp/${sol.id}/ingreso`);
}

/* Crea una solicitud en recepción a partir de un archivo JSON del plan (secretaría técnica) */
async function subirSolicitudJSON(file) {
  if (USUARIO.rol !== 'ST') { toast('Solo la secretaría técnica puede subir solicitudes', 'warn'); return; }
  let json;
  try { json = JSON.parse(await file.text()); }
  catch (e) { toast('El archivo no es un JSON válido: ' + e.message, 'error'); return; }
  if (!json || typeof json !== 'object') { toast('El JSON no contiene una solicitud reconocible', 'error'); return; }
  const sol = nuevaSolicitudVacia();
  try {
    const roles = String(normalizarPMFBN(json).pmfbn.predio.rol || '').split(/[,;]/).map(s => norm(s.trim())).filter(Boolean);
    const p = DB.predios.find(q => roles.includes(norm(q.rol)));
    if (p) sol.predioId = p.id;
    aplicarImportacion(sol, json);
    if (p) { const pp = sol.pmfbn.predio; sol.pmfbn.predio = { ...pp, nombre: pp.nombre || p.nombre, rol: pp.rol || p.rol, comuna: pp.comuna || p.comuna, superficieTotal: pp.superficieTotal || p.supSIG, precipitacion: pp.precipitacion || p.precipitacion }; }
  } catch (e) {
    DB.seq.sol = Math.max(0, (DB.seq.sol || 1) - 1);
    toast('No se pudo leer la solicitud: ' + e.message, 'error'); return;
  }
  sol.origenFormulario = 'externo';
  registrar(sol, 'Solicitud creada en recepción desde archivo JSON', file.name);
  DB.solicitudes.push(sol); guardar();
  toast(`Solicitud ${sol.id} creada desde ${file.name}${sol.predioId ? '' : ' · seleccione el predio'}`, sol.predioId ? 'ok' : 'warn');
  location.hash = `#exp/${sol.id}/ingreso`;
}

function vistaExpediente(main, id, tab) {
  const sol = solicitud(id);
  if (!sol) { main.innerHTML = '<div class="empty">Expediente no encontrado.</div>'; return; }
  tab = TABS.some(t => t[0] === tab) ? tab : (sol.estado === 'recepcion' && USUARIO.rol === 'ST' ? 'ingreso' : 'resumen');
  const p = predio(sol.predioId);
  const pl = plazo(sol);
  const paso = ESTADOS[sol.estado].paso;
  main.innerHTML = `
    <div class="exp-head">
      <div><a href="#bandeja" class="back">← Bandeja</a><div class="eyebrow">${esc(TIPOS_PLAN[sol.tipoPlan].nombre)}</div>
        <h1>${esc(sol.id)} ${chipEstado(sol)}</h1>
        <p class="muted">${p ? `<a href="#predio/${p.id}">${esc(p.nombre)}</a> · rol ${esc(p.rol)} · ${esc(p.comuna)}` : 'Predio sin definir'} · ${esc(sol.interesado.nombre || 'Interesado sin individualizar')} · ${fmt(supSol(sol))} ha solicitadas</p></div>
      <div class="plazo-box ${pl ? pl.nivel : ''}">${pl ? (sol.resolucion ? `<b>Resuelta en ${pl.usados} días hábiles</b><span>Ingreso ${fmtFecha(sol.fechaIngreso)} · resolución ${fmtFecha(sol.resolucion.fecha)}</span>`
        : `<b>${pl.quedan >= 0 ? `Quedan ${pl.quedan} días hábiles` : `Plazo vencido hace ${-pl.quedan} días hábiles`}</b><span>Ingreso ${fmtFecha(sol.fechaIngreso)} · vence ${fmtFecha(pl.vence)}</span>${pl.quedan < 0 ? '<span class="small">Silencio positivo: se tiene por aprobado, salvo áreas del art. 17 (art. 8° Ley 20.283)</span>' : ''}`)
        : '<b>Sin ingreso formal</b><span>El plazo legal corre desde el ingreso</span>'}</div>
    </div>
    <ol class="stepper">${PASOS.map((n, i) => `<li class="${sol.estado === 'desistida' ? (i === 0 ? 'bad' : '') : i < paso ? 'done' : i === paso ? 'now' : ''}">${esc(n)}</li>`).join('')}</ol>
    <div class="actions" id="acciones"></div>
    <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<a role="tab" href="#exp/${sol.id}/${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${esc(l)}${badgeTab(sol, k)}</a>`).join('')}</nav>
    <div id="panel" class="panel"></div>`;
  renderAcciones(sol);
  const panel = $('#panel');
  ({ resumen: tabResumen, ingreso: tabIngreso, formulario: tabFormulario, cartografia: tabCartografia, tecnico: tabTecnico, juridico: tabJuridico,
    revision: tabRevision, resolucion: tabResolucion, historial: tabHistorial })[tab](panel, sol);
}
function rerender() { const y = window.scrollY; route(); window.scrollTo(0, y); }

function badgeTab(sol, k) {
  const dot = c => `<span class="tdot ${c}"></span>`;
  if (k === 'tecnico') return dot(sol.tecnico.estado === 'enviado' ? 'ok' : sol.tecnico.estado === 'devuelto' ? 'bad' : sol.asignacion ? 'warn' : '');
  if (k === 'juridico') return dot(sol.juridico.estado === 'enviado' ? 'ok' : sol.juridico.estado === 'devuelto' ? 'bad' : sol.asignacion ? 'warn' : '');
  if (k === 'resolucion' && sol.resolucion) return dot('ok');
  return '';
}

/* ---------- Barra de acciones ---------- */
function renderAcciones(sol) {
  const r = USUARIO.rol, e = sol.estado, a = [];
  const btn = (id, txt, cls = '') => { a.push(`<button class="btn ${cls}" id="${id}">${esc(txt)}</button>`); };
  if (r === 'ST' && e === 'recepcion') { btn('ac-req', 'Requerir antecedentes (art. 31)', 'ghost'); btn('ac-ing', 'Ingresar y enviar al jefe analista'); }
  if (r === 'ST' && e === 'subsanacion') { btn('ac-des', 'Tener por desistida', 'ghost danger'); btn('ac-sub', 'Registrar subsanación'); }
  if (r === 'JA' && (e === 'asignacion' || e === 'evaluacion')) btn('ac-asig', sol.asignacion ? 'Reasignar' : 'Asignar analista y abogado', e === 'evaluacion' ? 'ghost' : '');
  if (puedeEditar(sol, 'tecnico')) btn('ac-tec', 'Enviar informe técnico al jefe analista');
  if (puedeEditar(sol, 'juridico')) btn('ac-jur', 'Enviar informe jurídico al jefe analista');
  if (r === 'JA' && e === 'revision') { btn('ac-dan', 'Devolver al analista', 'ghost'); btn('ac-dab', 'Devolver al abogado', 'ghost'); btn('ac-prop', 'Conforme: enviar al jefe provincial'); }
  if (r === 'JP' && e === 'firma') { btn('ac-dja', 'Devolver al jefe analista', 'ghost'); btn('ac-firma', 'Firmar resolución'); }
  if (r === 'ST' && e === 'resuelta') btn('ac-not', 'Registrar notificación');
  const quien = ESTADOS[e].rol;
  const info = a.length ? '' : `<span class="muted">${['notificada', 'desistida'].includes(e) ? 'Procedimiento terminado.' : `Sin acciones para su rol en esta etapa. ${quien ? `Responsable: ${responsable(sol)}.` : ''}`}</span>`;
  $('#acciones').innerHTML = `<div class="who">Actuando como <b>${esc(USUARIO.nombre)}</b> · ${esc(ROLES[r])}</div><div class="row-btns wrap">${info}${a.join('')}</div>`;
  const on = (id, fn) => { const b = $('#' + id); if (b) b.addEventListener('click', fn); };

  on('ac-req', async () => {
    const f = faltantesIngreso(sol);
    const txt = await modal({ titulo: 'Requerimiento de antecedentes', ancho: 640, html: `<p>Se requerirá al interesado subsanar en <b>${NORMA.plazoSubsanar} días</b>, con apercibimiento de tenerlo por desistido (art. 31 Ley 19.880).</p>
      <label>Detalle del requerimiento<textarea id="m-txt" rows="6">${esc(f.length ? 'Acompañar: ' + f.join('; ') + '.' : '')}</textarea></label>`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Emitir requerimiento', valor: bg => $('#m-txt', bg).value.trim(), validar: bg => !!$('#m-txt', bg).value.trim() }] });
    if (txt) { requerirAntecedentes(sol, txt); toast('Requerimiento emitido; plazo de subsanación en curso', 'ok'); rerender(); }
  });
  on('ac-ing', async () => {
    const f = faltantesIngreso(sol);
    if (f.length) {
      const v = await modal({ titulo: 'La solicitud está incompleta', ancho: 640, html: `<p>Antes de ingresar falta:</p><ul class="list">${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="muted">Puede completar los datos o requerir al interesado (art. 31 Ley 19.880).</p>`,
        botones: [{ txt: 'Volver a completar' }, { txt: 'Requerir antecedentes', valor: 'req' }] });
      if (v === 'req') $('#ac-req').click();
      return;
    }
    ingresar(sol); toast(`Solicitud ${sol.id} ingresada y enviada al jefe analista`, 'ok'); rerender();
  });
  on('ac-sub', () => { registrarSubsanacion(sol); toast('Subsanación registrada; complete el ingreso', 'ok'); location.hash = `#exp/${sol.id}/ingreso`; });
  on('ac-des', async () => {
    const r0 = sol.requerimientos[sol.requerimientos.length - 1];
    const vencido = r0 && hoyISO() > r0.plazo;
    const ok = await modal({ titulo: 'Tener por desistida la solicitud', html: vencido ? `<p>El plazo para subsanar venció el ${fmtFecha(r0.plazo)}. Se dictará el acto que tiene por desistida la petición (art. 31 Ley 19.880).</p>`
      : `<p class="warn-txt">El plazo para subsanar vence el ${fmtFecha(r0 && r0.plazo)}. Aún no corresponde tener por desistida la solicitud.</p>`,
      botones: [{ txt: 'Cancelar' }, ...(vencido ? [{ txt: 'Confirmar desistimiento', valor: true, cls: 'danger' }] : [])] });
    if (ok) { tenerPorDesistida(sol); rerender(); }
  });
  on('ac-asig', async () => {
    const carga = id => DB.solicitudes.filter(s => s.estado === 'evaluacion' && s.asignacion && (s.asignacion.analista === id || s.asignacion.abogado === id)).length;
    const opt = (rol, sel) => USUARIOS.filter(u => u.rol === rol).map(u => `<option value="${u.id}" ${sel === u.id ? 'selected' : ''}>${esc(u.nombre)} · ${carga(u.id)} en evaluación</option>`).join('');
    const v = await modal({ titulo: 'Asignar expediente', html: `<div class="fgrid"><label class="span2">Analista (evaluación técnica)<select id="m-an">${opt('AN', sol.asignacion && sol.asignacion.analista)}</select></label>
      <label class="span2">Abogado de la Unidad Jurídica (requisitos legales)<select id="m-ab">${opt('AB', sol.asignacion && sol.asignacion.abogado)}</select></label></div>
      <p class="muted small">El jefe analista también puede completar la evaluación técnica desde la pestaña correspondiente.</p>`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Asignar', valor: bg => ({ an: $('#m-an', bg).value, ab: $('#m-ab', bg).value }) }] });
    if (v) { asignar(sol, v.an, v.ab); toast('Expediente asignado', 'ok'); rerender(); }
  });
  on('ac-tec', async () => {
    const pend = PAUTA_TECNICA.filter(c => !((sol.tecnico.checks || {})[c.id] || {}).estado).map(c => c.id);
    const err = [];
    if (pend.length) err.push(`Requisitos sin evaluar: ${pend.join(', ')}`);
    if (!sol.tecnico.conclusion) err.push('Conclusión del informe');
    if (!sol.tecnico.informe.trim()) err.push('Texto del informe técnico');
    if (err.length) { await modal({ titulo: 'Falta completar la evaluación técnica', html: `<ul class="list">${err.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` }); location.hash = `#exp/${sol.id}/tecnico`; return; }
    enviarTecnico(sol); toast('Informe técnico enviado al jefe analista', 'ok'); rerender();
  });
  on('ac-jur', async () => {
    const pend = PAUTA_JURIDICA.filter(c => !((sol.juridico.checks || {})[c.id] || {}).estado).map(c => c.id);
    const err = [];
    if (pend.length) err.push(`Requisitos sin evaluar: ${pend.join(', ')}`);
    if (!sol.juridico.conclusion) err.push('Conclusión del informe');
    if (!sol.juridico.informe.trim()) err.push('Texto del informe jurídico');
    if (err.length) { await modal({ titulo: 'Falta completar el informe jurídico', html: `<ul class="list">${err.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` }); location.hash = `#exp/${sol.id}/juridico`; return; }
    enviarJuridico(sol); toast('Informe jurídico enviado al jefe analista', 'ok'); rerender();
  });
  const devolverCon = async (a, titulo) => {
    const obs = await modal({ titulo, html: '<label>Observaciones para corregir<textarea id="m-obs" rows="5"></textarea></label>',
      botones: [{ txt: 'Cancelar' }, { txt: 'Devolver', valor: bg => $('#m-obs', bg).value.trim(), validar: bg => !!$('#m-obs', bg).value.trim() }] });
    if (obs) { devolver(sol, a, obs); toast(`Expediente devuelto al ${a}`, 'ok'); rerender(); }
  };
  on('ac-dan', () => devolverCon('analista', 'Devolver la evaluación al analista'));
  on('ac-dab', () => devolverCon('abogado', 'Devolver el informe al abogado'));
  on('ac-prop', async () => {
    const chk = sol.revisionCheck || {};
    const falta = REVISION_ITEMS.filter(([k]) => !chk[k]);
    if (falta.length) { await modal({ titulo: 'Complete la revisión del análisis técnico', html: `<p>Marque en «Revisión jefatura» los puntos verificados:</p><ul class="list">${falta.map(([, t]) => `<li>${esc(t)}</li>`).join('')}</ul>` }); location.hash = `#exp/${sol.id}/revision`; return; }
    const pr = propuestaDesde(sol);
    const ok = await modal({ titulo: 'Enviar proyecto de resolución', html: `<p><b>${esc(RESUELVE[pr.tipo])}</b></p><p>Superficie aprobada: <b>${fmt(pr.supAprobada)} ha</b>${pr.supRechazada ? ` · rechazada: <b>${fmt(pr.supRechazada)} ha</b> (rodales ${pr.rodalesObjetados.join(', ')})` : ''}</p>`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Enviar al jefe provincial', valor: true }] });
    if (ok) { proponerResolucion(sol, { ...pr, obs: sol.revisionObs || '' }); toast('Proyecto de resolución enviado al jefe provincial', 'ok'); rerender(); }
  });
  on('ac-dja', async () => {
    const obs = await modal({ titulo: 'Devolver al jefe analista', html: '<label>Observaciones<textarea id="m-obs" rows="5"></textarea></label>',
      botones: [{ txt: 'Cancelar' }, { txt: 'Devolver', valor: bg => $('#m-obs', bg).value.trim(), validar: bg => !!$('#m-obs', bg).value.trim() }] });
    if (obs) { devolverAJA(sol, obs); toast('Devuelto al jefe analista', 'ok'); rerender(); }
  });
  on('ac-firma', async () => {
    const ok = await modal({ titulo: 'Firmar resolución', ancho: 820, html: `<pre class="resol">${esc(textoResolucion(sol))}</pre><p class="muted small">Al firmar se asigna número, el plan aprobado se incorpora a la ficha predial y al registro público.</p>`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Firmar resolución', valor: true }] });
    if (ok) { firmarResolucion(sol); toast(`Resolución N° ${sol.resolucion.numero} firmada`, 'ok'); location.hash = `#exp/${sol.id}/resolucion`; }
  });
  on('ac-not', async () => {
    const lim = sumarHabiles(sol.resolucion.fecha, NORMA.plazoNotificarRechazo);
    const v = await modal({ titulo: 'Registrar notificación', html: `<p class="muted">Plazo para despachar la carta certificada: ${fmtFecha(lim)} (art. 6° D.S. 93).</p>
      <div class="fgrid"><label>Medio<select id="m-medio"><option>Carta certificada</option><option>Notificación personal</option><option>Correo electrónico (autorizado por el interesado)</option></select></label>
      <label>N° de envío / acta<input id="m-num"></label><label>Fecha<input id="m-fec" type="date" value="${hoyISO()}"></label></div>`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Registrar', valor: bg => ({ medio: $('#m-medio', bg).value, numero: $('#m-num', bg).value.trim(), fecha: $('#m-fec', bg).value }), validar: bg => !!$('#m-fec', bg).value }] });
    if (v) { notificar(sol, v); toast('Notificación registrada', 'ok'); rerender(); }
  });
}

/* ---------- Resumen ---------- */
function tabResumen(el, sol) {
  const p = predio(sol.predioId);
  const an = p && sol.cartografia ? analizarSolicitud(sol) : null;
  const trk = (t, e, por, conc) => `<div class="track ${e}"><b>${t}</b><span>${{ pendiente: 'Pendiente', en_curso: 'En curso', enviado: 'Enviado', devuelto: 'Devuelto para corrección' }[e] || e}</span>
    <span class="muted small">${por ? esc(usuario(por).nombre) : ''}</span>${conc ? `<span class="small">${esc(conc)}</span>` : ''}</div>`;
  el.innerHTML = `<div class="resumen-grid"><section>
    <div class="tracks">${trk('Evaluación técnica', sol.tecnico.estado, sol.asignacion && sol.asignacion.analista, CONCLUSION_TEC[sol.tecnico.conclusion])}
      ${trk('Análisis jurídico', sol.juridico.estado, sol.asignacion && sol.asignacion.abogado, CONCLUSION_JUR[sol.juridico.conclusion])}</div>
    <table class="kv"><tr><th>Interesado</th><td>${esc(sol.interesado.nombre || '—')} · RUT ${esc(sol.interesado.rut || '—')} ${sol.interesado.tipo === 'juridica' ? `· rep. ${esc(sol.interesado.representante.nombre)}` : ''}</td></tr>
      <tr><th>Profesional</th><td>${esc(sol.profesional.nombre || '—')} · ${esc(sol.profesional.titulo)}</td></tr>
      <tr><th>Formulario</th><td>${sol.origenFormulario === 'externo' ? 'Importado desde «Aplicación web de plan de manejo»' : 'Formulario interno'} · ${(sol.pmfbn.rodales || []).length} rodales · objetivo: ${esc(OBJETIVOS[sol.pmfbn.objetivo.general] || '—')}</td></tr>
      <tr><th>Asignación</th><td>${sol.asignacion ? `${esc(usuario(sol.asignacion.analista).nombre)} (analista) · ${esc(usuario(sol.asignacion.abogado).nombre)} (abogado) · ${fmtFecha(sol.asignacion.fecha)}` : 'Sin asignar'}</td></tr>
      ${sol.resolucion ? `<tr><th>Resolución</th><td><a href="#exp/${sol.id}/resolucion">N° ${esc(sol.resolucion.numero)}</a> de ${fmtFecha(sol.resolucion.fecha)} · ${esc(RESUELVE[sol.resolucion.tipo])} · ${fmt(sol.resolucion.supAprobada)} ha</td></tr>` : ''}
      ${sol.requerimientos.length ? `<tr><th>Requerimientos art. 31</th><td>${sol.requerimientos.map(r => `${fmtFecha(r.fecha)}: ${esc(r.detalle)} — ${r.fechaRespuesta ? `subsanado ${fmtFecha(r.fechaRespuesta)}` : `plazo ${fmtFecha(r.plazo)}`}`).join('<br>')}</td></tr>` : ''}</table>
    <h3>Alertas normativas del análisis espacial</h3>${an ? alertasHTML(an) : '<div class="empty">Sin cartografía para analizar.</div>'}
    </section><section><div class="map-box"><div id="map-res" class="map"></div></div></section></div>`;
  if (p) { const { map, ctrl } = nuevoMapa($('#map-res')); dibujarPredio(map, ctrl, p, sol, { analisis: an, decisiones: sol.tecnico.rodales }); }
  else $('#map-res').closest('.map-box').innerHTML = '<div class="empty">Defina el predio en «Ingreso y antecedentes».</div>';
}
function alertasHTML(an) {
  if (!an.alertas.length) return '<div class="alert ok">✔ Sin alertas: el área a intervenir no presenta conflictos con las capas y reglas verificadas.</div>';
  return `<ul class="alertas">${an.alertas.map(a => `<li class="${a.nivel}"><b>${a.check}</b> ${esc(a.txt)} <span class="muted small">${esc((PAUTA_TECNICA.find(c => c.id === a.check) || {}).art || '')}</span></li>`).join('')}</ul>`;
}

/* ---------- Ingreso ---------- */
function tabIngreso(el, sol) {
  const ed = puedeEditar(sol, 'ingreso'), dis = ed ? '' : 'disabled';
  const i = sol.interesado, pr = sol.profesional;
  const inp = (k, v, t = 'text', x = '') => `<input ${dis} data-ing="${k}" type="${t}" value="${esc(v ?? '')}" ${x}>`;
  const sel = (k, v, o) => `<select ${dis} data-ing="${k}">${Object.entries(o).map(([a, b]) => `<option value="${a}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  const titulos = [...new Set([...TITULOS_HABILITADOS.forestal, ...TITULOS_HABILITADOS.preservacion, 'Otro'])];
  const docs = documentosRequeridos(sol);
  const ref = sol.fechaIngreso || hoyISO();
  const vig = d => {
    const v = sol.documentos[d.key] || {};
    if (!d.vence || !v.presentado || !v.fecha) return '';
    if (d.vence === 'dominio') { const n = habilesEntre(v.fecha, ref); return n <= NORMA.vigenciaDominio ? `<span class="chip ok">${n} d.h.</span>` : `<span class="chip bad">${n} d.h. · vencido</span>`; }
    const n = corridosEntre(v.fecha, ref); return n <= NORMA.vigenciaPersoneria ? `<span class="chip ok">${n} días</span>` : `<span class="chip bad">${n} días · vencido</span>`;
  };
  el.innerHTML = `${ed ? '<p class="hint">Complete la individualización, adjunte los antecedentes y cargue la cartografía. Los cambios se guardan automáticamente.</p>' : ''}
    <div class="cols2">
    <section class="card"><h3>Solicitud</h3><div class="fgrid">
      <label class="span2">Tipo de plan ${sel('tipoPlan', sol.tipoPlan, Object.fromEntries(Object.entries(TIPOS_PLAN).map(([k, v]) => [k, v.nombre])))}</label>
      <label>Oficina ${inp('oficina', sol.oficina)}</label><label>Fecha de ingreso ${inp('fechaIngreso', sol.fechaIngreso || '', 'date', 'title="Se fija al ingresar"')}</label></div>
      <h3>Predio</h3>
      <div class="fgrid"><label class="span2">Predio de la ficha predial <select ${dis} id="ing-predio"><option value="">— Seleccione —</option>${DB.predios.map(p => `<option value="${p.id}" ${p.id === sol.predioId ? 'selected' : ''}>${esc(p.nombre)} · rol ${esc(p.rol)} · ${esc(p.comuna)}</option>`).join('')}</select></label></div>
      ${ed ? `<details class="newpred"><summary>El predio no existe: crear ficha predial desde su límite</summary>
        <div class="fgrid"><label>Nombre<input id="np-nom"></label><label>Rol de avalúo<input id="np-rol"></label><label>Comuna<input id="np-com" value="Valdivia"></label>
        <label>Precipitación (mm/año)<input id="np-pp" type="number" value="1800"></label>
        <label class="span2">Límite predial (.zip, .geojson, .kml)<input id="np-file" type="file" accept=".zip,.geojson,.json,.kml"></label>
        <label class="span2">Sistema de coordenadas ${selSRC('np-src')}</label></div>
        <div class="row-btns"><button class="btn sm" id="np-go">Crear ficha predial</button></div></details>` : ''}
    </section>
    <section class="card"><h3>Interesado <small class="muted">Art. 22 D.S. 93</small></h3><div class="fgrid">
      <label>Tipo ${sel('interesado.tipo', i.tipo, { natural: 'Persona natural', juridica: 'Persona jurídica' })}</label>
      <label>Calidad ${sel('interesado.calidad', i.calidad, { propietario: 'Propietario', poseedor: 'Poseedor en regularización', fiscal: 'Concesionario/arrendatario fiscal', concesionario: 'Titular de concesión o servidumbre' })}</label>
      <label class="span2">Nombre o razón social ${inp('interesado.nombre', i.nombre)}</label><label>RUT ${inp('interesado.rut', i.rut, 'text', 'placeholder="12.345.678-9"')}</label>
      <label>Teléfono ${inp('interesado.telefono', i.telefono)}</label><label class="span2">Domicilio (para notificación) ${inp('interesado.domicilio', i.domicilio)}</label>
      <label>Comuna ${inp('interesado.comuna', i.comuna)}</label><label>Correo ${inp('interesado.email', i.email, 'email')}</label>
      ${i.tipo === 'juridica' ? `<label>Representante legal ${inp('interesado.representante.nombre', i.representante.nombre)}</label><label>RUT representante ${inp('interesado.representante.rut', i.representante.rut)}</label>` : ''}
      <label class="chk span2"><input ${dis} type="checkbox" data-ing="interesado.pequenoPropietario" ${i.pequenoPropietario ? 'checked' : ''}> Pequeño propietario forestal (art. 2° N° 17 Ley 20.283)</label></div>
      ${i.rut && !rutValido(i.rut) ? '<p class="warn-txt small">El RUT ingresado no es válido.</p>' : ''}
      <h3>Profesional que elaboró el plan <small class="muted">Art. 7° Ley 20.283</small></h3><div class="fgrid">
      <label class="span2">Nombre ${inp('profesional.nombre', pr.nombre)}</label><label>RUT ${inp('profesional.rut', pr.rut)}</label>
      <label>Título <select ${dis} data-ing="profesional.titulo">${titulos.map(t => `<option ${t === pr.titulo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Universidad ${inp('profesional.universidad', pr.universidad)}</label><label>Semestres del plan de estudios ${inp('profesional.semestres', pr.semestres, 'number', 'min="1"')}</label>
      <label class="chk span2"><input ${dis} type="checkbox" data-ing="profesional.postitulo" ${pr.postitulo ? 'checked' : ''}> Acredita postítulo o postgrado en ciencias forestales</label></div>
      <p class="small ${evaluarProfesional(sol).estado === 'cumple' ? 'ok-txt' : 'warn-txt'}">${esc(evaluarProfesional(sol).det)}</p>
    </section></div>
    <section class="card"><h3>Antecedentes acompañados <small class="muted">Arts. 21, 22 y 23 D.S. 93</small></h3>
      <div class="tbl-wrap"><table class="grid"><thead><tr><th>Presentado</th><th>Documento</th><th>Fuente</th><th>Fecha de emisión</th><th>Vigencia al ingreso</th><th>Observación</th></tr></thead><tbody>
      ${docs.map(d => { const v = sol.documentos[d.key] || {}; return `<tr><td class="center"><input ${dis} type="checkbox" data-doc="${d.key}" data-f="presentado" ${v.presentado ? 'checked' : ''} aria-label="${esc(d.nombre)} presentado"></td>
        <td>${esc(d.nombre)}</td><td class="small muted">${esc(d.art)}</td><td><input ${dis} type="date" data-doc="${d.key}" data-f="fecha" value="${esc(v.fecha || '')}"></td><td>${vig(d)}</td>
        <td><input ${dis} data-doc="${d.key}" data-f="obs" value="${esc(v.obs || '')}"></td></tr>`; }).join('')}</tbody></table></div>
      ${sol.requerimientos.length ? `<h3>Requerimientos al interesado (art. 31 Ley 19.880)</h3><ul class="list">${sol.requerimientos.map(r => `<li>${fmtFecha(r.fecha)} · plazo ${fmtFecha(r.plazo)} · ${r.fechaRespuesta ? `<span class="chip ok">Subsanado ${fmtFecha(r.fechaRespuesta)}</span>` : (hoyISO() > r.plazo ? '<span class="chip bad">Plazo vencido</span>' : '<span class="chip warn">En plazo</span>')}<br>${esc(r.detalle)}</li>`).join('')}</ul>` : ''}
    </section>`;
  if (!ed) return;
  const redraw = new Set(['tipoPlan', 'interesado.tipo', 'interesado.calidad', 'interesado.pequenoPropietario', 'interesado.rut', 'profesional.titulo', 'profesional.semestres', 'profesional.postitulo']);
  $$('[data-ing]', el).forEach(x => x.addEventListener('change', () => {
    const v = x.type === 'checkbox' ? x.checked : x.type === 'number' ? +x.value : x.value;
    setPath(sol, x.dataset.ing, v);
    if (x.dataset.ing === 'interesado.nombre' || x.dataset.ing === 'interesado.rut') sol.pmfbn.interesado = { nombre: sol.interesado.nombre, rut: sol.interesado.rut };
    guardar(); if (redraw.has(x.dataset.ing)) rerender();
  }));
  $$('[data-doc]', el).forEach(x => x.addEventListener('change', () => {
    const d = sol.documentos[x.dataset.doc] = sol.documentos[x.dataset.doc] || {};
    d[x.dataset.f] = x.type === 'checkbox' ? x.checked : x.value; guardar(); if (x.dataset.f !== 'obs') rerender();
  }));
  $('#ing-predio').addEventListener('change', e => {
    sol.predioId = e.target.value || null;
    const p = predio(sol.predioId);
    if (p) sol.pmfbn.predio = { ...sol.pmfbn.predio, nombre: p.nombre, rol: p.rol, comuna: p.comuna, superficieTotal: p.supSIG, precipitacion: p.precipitacion };
    guardar(); rerender();
  });
  $('#np-go').addEventListener('click', async () => {
    const f = $('#np-file').files[0], nom = $('#np-nom').value.trim(), rol = $('#np-rol').value.trim();
    if (!f || !nom || !rol) { toast('Indique nombre, rol y archivo del límite predial', 'warn'); return; }
    try {
      const { fc } = await cargarCapa(f, $('#np-src').value, 'poligono');
      let g = fc.features[0]; for (let k = 1; k < fc.features.length; k++) g = turf.union(g, fc.features[k]) || g;
      const id = 'P' + String(DB.predios.length + 1).padStart(2, '0') + uid().slice(0, 3);
      const np = { id, nombre: nom.toUpperCase(), rol, region: 'Los Ríos', provincia: 'Valdivia', comuna: $('#np-com').value.trim(), geom: turf.feature(g.geometry, {}), supSIG: haDe(g),
        precipitacion: +$('#np-pp').value || 0, cursos: turf.featureCollection([]), celdas: [], cbr: { fojas: '—', numero: '—', anio: '—', conservador: '—' } };
      DB.predios.push(np); sol.predioId = id;
      sol.pmfbn.predio = { nombre: np.nombre, rol, comuna: np.comuna, superficieTotal: np.supSIG, precipitacion: np.precipitacion };
      registrar(sol, 'Ficha predial creada', `${np.nombre}, ${fmt(np.supSIG)} ha SIG`); guardar();
      toast(`Ficha predial creada: ${fmt(np.supSIG)} ha`, 'ok'); rerender();
    } catch (e) { toast(e.message, 'error'); }
  });
}
const selSRC = id => `<select id="${id}"><option value="auto">Detectar (.prj / CRS / geográficas)</option>${Object.entries(SRC).map(([k, v]) => `<option value="${k}">${k} — ${esc(v.nombre)}</option>`).join('')}</select>`;

/* ---------- Formulario PMFBN ---------- */
function tabFormulario(el, sol) {
  const ed = puedeEditar(sol, 'ingreso');
  const f = sol.pmfbn;
  const faltan = CONTENIDOS_ART14.filter(([, , fn]) => !fn(f, sol));
  el.innerHTML = `<div class="art14">${CONTENIDOS_ART14.map(([l, t, fn]) => `<span class="chip ${fn(f, sol) ? 'ok' : 'bad'}" title="${esc(t)}">${l}) ${fn(f, sol) ? '✔' : '✖'}</span>`).join('')}
    <span class="muted small">${faltan.length ? `Contenidos del art. 14 D.S. 93 pendientes: ${faltan.length}` : 'Contiene todos los contenidos del art. 14 D.S. 93'}</span></div>
    <div id="pmf"></div>`;
  $('#pmf').innerHTML = renderPMFBN(sol, ed);
  const ver = $('#pm-ver'); if (ver) ver.addEventListener('click', () => abrirFormularioExterno(sol, () => {}, true));
  const dl = $('#pm-dl'); if (dl) dl.addEventListener('click', () => descargar(`PMFBN_${sol.id}.json`, JSON.stringify(sol.pmfbnProyecto), 'application/json'));
  if (ed) bindPMFBN($('#pmf'), sol, full => { guardar(); if (full) rerender(); else { const ff = CONTENIDOS_ART14.map(([l, t, fn]) => `<span class="chip ${fn(sol.pmfbn, sol) ? 'ok' : 'bad'}" title="${esc(t)}">${l}) ${fn(sol.pmfbn, sol) ? '✔' : '✖'}</span>`).join(''); $('.art14', el).innerHTML = ff; } });
}

/* ---------- Cartografía y análisis ---------- */
function tabCartografia(el, sol) {
  const p = predio(sol.predioId);
  if (!p) { el.innerHTML = '<div class="empty">Primero seleccione o cree el predio en «Ingreso y antecedentes».</div>'; return; }
  const ed = puedeEditar(sol, 'ingreso');
  const an = sol.cartografia ? analizarSolicitud(sol) : null;
  const rows = an ? Object.values(an.porRodal) : [];
  const rodMap = Object.fromEntries((sol.pmfbn.rodales || []).map(r => [r.numero, r]));
  el.innerHTML = `<div class="carto">
    <div class="map-box tall"><div id="map-exp" class="map"></div></div>
    <aside class="carto-side">
      ${ed ? `<section class="card"><h3>Área a intervenir (rodales)</h3>
        <p class="muted small">Polígonos con un campo de número de rodal. Formatos: .zip (shapefile), .geojson o .kml.</p>
        <label>Archivo<input type="file" id="ca-file" accept=".zip,.geojson,.json,.kml"></label><label>Sistema de coordenadas ${selSRC('ca-src')}</label>
        <div class="row-btns wrap"><button class="btn sm" id="ca-go">Cargar área</button>${p.celdas && p.celdas.length ? '<button class="btn sm ghost" id="ca-demo">Usar rodales de ejemplo del predio</button>' : ''}</div></section>
        <section class="card"><h3>Cursos de agua del predio</h3><p class="muted small">Se agregan a la ficha predial. Defina la sección del cauce (D.S. 82 art. 1° p).</p>
        <label>Archivo de líneas<input type="file" id="cu-file" accept=".zip,.geojson,.json,.kml"></label>
        <div class="fgrid"><label>Sección<select id="cu-sec"><option value="entre02y05">0,2–0,5 m²</option><option value="mayor05">> 0,5 m²</option><option value="menor02">< 0,2 m²</option></select></label>
        <label>Régimen<select id="cu-per"><option value="1">Permanente</option><option value="0">No permanente</option></select></label></div>
        <label>Sistema de coordenadas ${selSRC('cu-src')}</label><div class="row-btns"><button class="btn sm ghost" id="cu-go">Agregar cursos</button></div></section>` : ''}
      ${an ? `<section class="card"><h3>Análisis normativo automático</h3>
        <div class="mini-kpis"><div><b>${fmt(an.supDecl)}</b><span>ha declaradas</span></div><div><b>${fmt(an.supSIG)}</b><span>ha SIG</span></div><div><b class="${an.supObjetable ? 'bad-txt' : ''}">${fmt(an.supObjetable)}</b><span>ha con prohibición</span></div></div>
        ${alertasHTML(an)}</section>` : '<div class="empty">Cargue la cartografía del área a intervenir para ejecutar el análisis.</div>'}
      ${an ? `<div class="row-btns"><button class="btn sm ghost" id="ca-geo">Descargar GeoJSON</button><button class="btn sm ghost" id="ca-kml">Descargar KML</button></div>` : ''}
    </aside></div>
    ${an ? `<h3>Detalle por rodal</h3><div class="tbl-wrap"><table class="grid"><thead><tr><th>Rodal</th><th>Tipo forestal</th><th class="num">Sup. decl. (ha)</th><th class="num">Sup. SIG (ha)</th><th class="num">Pend. (%)</th>
      <th class="num">Cobertura propuesta / mínima</th><th class="num">Exclusión (ha)</th><th class="num">Manejo limitado (ha)</th><th class="num">≤ 200 m de agua (ha)</th><th>Otras restricciones</th></tr></thead><tbody>
      ${rows.map(r => { const rd = rodMap[r.numero] || {}; const otras = [r.glaciar > .01 && `Glaciar ${fmt(r.glaciar)} ha`, r.preserv > .01 && `Área protegida ${fmt(r.preserv)} ha`, r.humedal > .01 && `Humedal ${fmt(r.humedal)} ha`, r.faja > .01 && `Faja humedal ${fmt(r.faja)} ha`, ...(r.especies || [])].filter(Boolean);
        return `<tr><td><b>${esc(r.numero)}</b></td><td>${esc((TIPOS_FORESTALES[rd.tipoForestal] || {}).nombre || '—')}</td><td class="num">${fmt(rd.superficie)}</td><td class="num">${fmt(r.supSIG)}</td><td class="num">${rd.pendiente ?? '—'}</td>
        <td class="num"><span class="${r.okCob ? 'ok-txt' : 'bad-txt'}">${r.cobProp}% / ${r.cobMin}%</span></td><td class="num">${fmt(r.exc)}</td><td class="num">${fmt(r.man)}</td><td class="num">${fmt(r.c200)}</td>
        <td class="small">${otras.length ? esc(otras.join(' · ')) : '<span class="muted">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : ''}`;
  const { map, ctrl } = nuevoMapa($('#map-exp'));
  dibujarPredio(map, ctrl, p, sol, { analisis: an, decisiones: sol.tecnico.rodales });
  const after = msg => { guardar(); toast(msg, 'ok'); rerender(); };
  if (ed) {
    $('#ca-go').addEventListener('click', async () => {
      const f = $('#ca-file').files[0]; if (!f) { toast('Seleccione un archivo', 'warn'); return; }
      try {
        const { fc, src } = await cargarCapa(f, $('#ca-src').value, 'poligono');
        sol.cartografia = soloPoligonosRodal(fc);
        sincronizarRodales(sol);
        registrar(sol, 'Cartografía del área a intervenir cargada', `${f.name} · ${sol.cartografia.features.length} polígonos · ${src}`);
        after(`Cartografía cargada: ${sol.cartografia.features.length} rodales`);
      } catch (e) { toast(e.message, 'error'); }
    });
    const demo = $('#ca-demo'); if (demo) demo.addEventListener('click', () => {
      const pick = p.celdas.filter((c, i) => i % 2 === 0).slice(0, 4);
      sol.cartografia = turf.featureCollection(pick.map(c => turf.feature(c.geometry, { rodal: c.properties.rodal })));
      sincronizarRodales(sol, p);
      registrar(sol, 'Cartografía del área a intervenir cargada', 'Rodales de ejemplo de la ficha predial');
      after('Se cargaron rodales de ejemplo y se crearon en el formulario');
    });
    $('#cu-go').addEventListener('click', async () => {
      const f = $('#cu-file').files[0]; if (!f) { toast('Seleccione un archivo', 'warn'); return; }
      try {
        const { fc } = await cargarCapa(f, $('#cu-src').value, 'linea');
        fc.features.forEach(x => p.cursos.features.push(turf.feature(x.geometry, { nombre: x.properties.nombre || x.properties.name || 'Curso de agua', seccion: $('#cu-sec').value, permanente: $('#cu-per').value === '1' })));
        after(`${fc.features.length} curso(s) de agua agregados a la ficha predial`);
      } catch (e) { toast(e.message, 'error'); }
    });
  }
  if (an) {
    $('#ca-geo').addEventListener('click', () => descargar(`${sol.id}_area_intervenir.geojson`, JSON.stringify(sol.cartografia), 'application/geo+json'));
    $('#ca-kml').addEventListener('click', () => descargar(`${sol.id}_area_intervenir.kml`, toKML(sol.cartografia.features, sol.id), 'application/vnd.google-earth.kml+xml'));
  }
}
function sincronizarRodales(sol, p) {
  sol.cartografia.features.forEach(ft => {
    const n = ft.properties.rodal;
    let r = sol.pmfbn.rodales.find(x => String(x.numero) === String(n));
    if (!r) {
      r = rodalVacio(n);
      const celda = p && p.celdas.find(c => c.properties.rodal === n);
      if (celda) { r.tipoForestal = celda.properties.tipo; r.especies = ESPECIES_TF[celda.properties.tipo] || ''; }
      sol.pmfbn.rodales.push(r);
    }
    r.superficie = haDe(ft);
  });
  sol.pmfbn.rodales.sort((a, b) => a.numero - b.numero);
}

/* ---------- Evaluación técnica ---------- */
function selEstado(name, val, dis) {
  return `<select ${dis} data-est="${name}" aria-label="Resultado ${name}"><option value="">—</option>${Object.entries(ESTADO_CHECK).map(([k, v]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
}
function tabTecnico(el, sol) {
  const ed = puedeEditar(sol, 'tecnico') || puedeEditar(sol, 'tecnicoJA');
  const dis = ed ? '' : 'disabled';
  if (!sol.asignacion) { el.innerHTML = '<div class="empty">El expediente aún no ha sido asignado a un analista.</div>'; return; }
  const p = predio(sol.predioId);
  const an = p && sol.cartografia ? analizarSolicitud(sol) : { auto: {}, porRodal: {}, alertas: [], objetables: {}, supDecl: 0, supSIG: 0 };
  const t = sol.tecnico; t.checks = t.checks || {}; t.rodales = t.rodales || {}; t.visita = t.visita || { fecha: '', obs: '' }; t.informe = t.informe || '';
  if (ed && t.estado === 'pendiente') { t.estado = 'en_curso'; guardar(); }
  const s = supAprobadaDe(sol);
  el.innerHTML = `${t.devolucion && t.estado === 'devuelto' ? `<div class="alert warn"><b>Devuelto por el jefe analista:</b> ${esc(t.devolucion)}</div>` : ''}
    <p class="hint">Responsable: ${esc(usuario(sol.asignacion.analista).nombre)} (analista). El jefe analista también puede completar esta evaluación. ${t.estado === 'enviado' ? `Enviado el ${fmtFecha(t.fecha)} por ${esc(usuario(t.por).nombre)}.` : ''}</p>
    <section class="card"><h3>Visita a terreno</h3><div class="fgrid g4"><label>Fecha<input ${dis} type="date" data-tec="visita.fecha" value="${esc(t.visita.fecha)}"></label>
      <label class="span3">Observaciones<input ${dis} data-tec="visita.obs" value="${esc(t.visita.obs)}"></label></div></section>
    <section class="card"><div class="sec-head"><h3>Pauta técnica</h3>${ed ? '<button class="btn sm ghost" id="tec-auto">Aplicar resultados automáticos</button>' : ''}</div>
      <div class="tbl-wrap"><table class="grid pauta"><thead><tr><th>Código</th><th>Requisito</th><th>Resultado automático</th><th>Evaluación</th><th>Observación</th></tr></thead><tbody>
      ${PAUTA_TECNICA.map(c => { const a = an.auto[c.id]; const v = t.checks[c.id] || {}; return `<tr><td><b>${c.id}</b></td><td>${esc(c.txt)}<div class="muted small">${esc(c.art)}</div></td>
        <td class="small">${a ? `<span class="chip ${a.estado === 'cumple' ? 'ok' : a.estado === 'na' ? '' : a.estado === 'observacion' ? 'warn' : 'bad'}">${ESTADO_CHECK[a.estado]}</span> ${esc(a.det)}` : '<span class="muted">Verificación del analista</span>'}</td>
        <td>${selEstado(c.id, v.estado, dis)}</td><td><input ${dis} data-obs="${c.id}" value="${esc(v.obs || '')}" aria-label="Observación ${c.id}"></td></tr>`; }).join('')}</tbody></table></div></section>
    <section class="card"><div class="sec-head"><h3>Decisión por rodal</h3>${ed ? '<button class="btn sm ghost" id="tec-sug">Sugerir según análisis</button>' : ''}</div>
      <div class="tbl-wrap"><table class="grid"><thead><tr><th>Rodal</th><th>Tipo forestal</th><th>Método</th><th class="num">Sup. (ha)</th><th>Decisión</th><th>Fundamento de la objeción</th></tr></thead><tbody>
      ${(sol.pmfbn.rodales || []).map(r => { const d = t.rodales[r.numero] || {}; return `<tr class="${d.decision === 'objetar' ? 'row-bad' : ''}"><td><b>${esc(r.numero)}</b></td><td>${esc((TIPOS_FORESTALES[r.tipoForestal] || {}).nombre)}</td><td>${esc((METODOS[r.metodo] || {}).nombre || '—')}</td><td class="num">${fmt(r.superficie)}</td>
        <td><select ${dis} data-rod="${esc(r.numero)}" aria-label="Decisión rodal ${esc(r.numero)}"><option value="aprobar" ${d.decision !== 'objetar' ? 'selected' : ''}>Aprobar</option><option value="objetar" ${d.decision === 'objetar' ? 'selected' : ''}>Objetar</option></select></td>
        <td><input ${dis} data-mot="${esc(r.numero)}" value="${esc(d.motivo || '')}" aria-label="Fundamento rodal ${esc(r.numero)}"></td></tr>`; }).join('')}</tbody>
      <tfoot><tr><td colspan="3">Superficie que se propone aprobar</td><td class="num">${fmt(s.supAprobada)}</td><td colspan="2">Objetada: ${fmt(s.supRechazada)} ha</td></tr></tfoot></table></div></section>
    <section class="card"><h3>Conclusión e informe técnico</h3><div class="fgrid"><label class="span2">Conclusión<select ${dis} data-tec="conclusion"><option value="">— Seleccione —</option>${Object.entries(CONCLUSION_TEC).map(([k, v]) => `<option value="${k}" ${k === t.conclusion ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <label>Informe técnico<textarea ${dis} data-tec="informe" rows="12">${esc(t.informe)}</textarea></label>
      ${ed ? '<div class="row-btns"><button class="btn sm ghost" id="tec-borr">Generar borrador del informe</button></div>' : ''}</section>`;
  if (!ed) return;
  const save = (r = false) => { guardar(); if (r) rerender(); };
  $$('[data-tec]', el).forEach(x => x.addEventListener('change', () => { setPath(t, x.dataset.tec, x.value); save(); }));
  $$('[data-est]', el).forEach(x => x.addEventListener('change', () => { t.checks[x.dataset.est] = { ...(t.checks[x.dataset.est] || {}), estado: x.value }; save(); }));
  $$('[data-obs]', el).forEach(x => x.addEventListener('change', () => { t.checks[x.dataset.obs] = { ...(t.checks[x.dataset.obs] || {}), obs: x.value }; save(); }));
  $$('[data-rod]', el).forEach(x => x.addEventListener('change', () => { t.rodales[x.dataset.rod] = { ...(t.rodales[x.dataset.rod] || {}), decision: x.value }; if (x.value === 'objetar' && !t.rodales[x.dataset.rod].motivo) t.rodales[x.dataset.rod].motivo = motivoObjecion(an, x.dataset.rod); save(true); }));
  $$('[data-mot]', el).forEach(x => x.addEventListener('change', () => { t.rodales[x.dataset.mot] = { ...(t.rodales[x.dataset.mot] || { decision: 'aprobar' }), motivo: x.value }; save(); }));
  $('#tec-auto').addEventListener('click', () => { Object.entries(an.auto).forEach(([k, v]) => { t.checks[k] = { estado: v.estado, obs: (t.checks[k] || {}).obs || v.det }; }); registrar(sol, 'Pauta técnica: resultados automáticos aplicados'); save(true); toast('Resultados automáticos aplicados; complete los demás requisitos', 'ok'); });
  $('#tec-sug').addEventListener('click', () => { t.rodales = sugerirDecisiones(sol, an); const o = Object.values(t.rodales).filter(d => d.decision === 'objetar').length; if (!t.conclusion) t.conclusion = o ? (o === sol.pmfbn.rodales.length ? 'rechazar' : 'parcial') : 'aprobar'; save(true); toast(o ? `${o} rodal(es) sugeridos para objetar` : 'Sin rodales que objetar', 'ok'); });
  $('#tec-borr').addEventListener('click', () => { t.informe = borradorInformeTecnico(sol, an); save(true); });
}

/* ---------- Informe jurídico ---------- */
function tabJuridico(el, sol) {
  if (!sol.asignacion) { el.innerHTML = '<div class="empty">El expediente aún no ha sido asignado a un abogado.</div>'; return; }
  const ed = puedeEditar(sol, 'juridico'), dis = ed ? '' : 'disabled';
  const j = sol.juridico; j.checks = j.checks || {}; j.informe = j.informe || '';
  if (ed && j.estado === 'pendiente') { j.estado = 'en_curso'; guardar(); }
  const a = autoJuridico(sol);
  el.innerHTML = `${j.devolucion && j.estado === 'devuelto' ? `<div class="alert warn"><b>Devuelto por el jefe analista:</b> ${esc(j.devolucion)}</div>` : ''}
    <p class="hint">Responsable: ${esc(usuario(sol.asignacion.abogado).nombre)} · ${esc(usuario(sol.asignacion.abogado).oficina)}. ${j.estado === 'enviado' ? `Enviado el ${fmtFecha(j.fecha)}.` : ''}</p>
    <section class="card"><div class="sec-head"><h3>Requisitos legales</h3>${ed ? '<button class="btn sm ghost" id="jur-auto">Aplicar verificación automática</button>' : ''}</div>
      <div class="tbl-wrap"><table class="grid pauta"><thead><tr><th>Código</th><th>Requisito</th><th>Antecedente</th><th>Verificación automática</th><th>Evaluación</th><th>Observación</th></tr></thead><tbody>
      ${PAUTA_JURIDICA.map(c => { const au = a[c.id]; const v = j.checks[c.id] || {}; const doc = c.doc ? (sol.documentos[c.doc] || {}) : null;
        return `<tr><td><b>${c.id}</b></td><td>${esc(c.txt)}<div class="muted small">${esc(c.art)}</div></td>
        <td class="small">${doc ? (doc.presentado ? `<span class="chip ok">Acompañado</span> ${fmtFecha(doc.fecha)}` : '<span class="chip bad">No acompañado</span>') : '<span class="muted">—</span>'}</td>
        <td class="small">${au ? `<span class="chip ${au.estado === 'cumple' ? 'ok' : au.estado === 'na' ? '' : au.estado === 'observacion' ? 'warn' : 'bad'}">${ESTADO_CHECK[au.estado]}</span> ${esc(au.det)}` : '<span class="muted">Revisión del abogado</span>'}</td>
        <td>${selEstado(c.id, v.estado, dis)}</td><td><input ${dis} data-obs="${c.id}" value="${esc(v.obs || '')}" aria-label="Observación ${c.id}"></td></tr>`; }).join('')}</tbody></table></div></section>
    <section class="card"><h3>Conclusión e informe jurídico</h3><div class="fgrid"><label class="span2">Conclusión<select ${dis} data-jur="conclusion"><option value="">— Seleccione —</option>${Object.entries(CONCLUSION_JUR).map(([k, v]) => `<option value="${k}" ${k === j.conclusion ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <label>Informe jurídico<textarea ${dis} data-jur="informe" rows="9">${esc(j.informe)}</textarea></label>
      ${ed ? '<div class="row-btns"><button class="btn sm ghost" id="jur-borr">Generar borrador del informe</button></div>' : ''}</section>`;
  if (!ed) return;
  const save = (r = false) => { guardar(); if (r) rerender(); };
  $$('[data-jur]', el).forEach(x => x.addEventListener('change', () => { j[x.dataset.jur] = x.value; save(); }));
  $$('[data-est]', el).forEach(x => x.addEventListener('change', () => { j.checks[x.dataset.est] = { ...(j.checks[x.dataset.est] || {}), estado: x.value }; save(); }));
  $$('[data-obs]', el).forEach(x => x.addEventListener('change', () => { j.checks[x.dataset.obs] = { ...(j.checks[x.dataset.obs] || {}), obs: x.value }; save(); }));
  $('#jur-auto').addEventListener('click', () => { Object.entries(a).forEach(([k, v]) => { j.checks[k] = { estado: v.estado, obs: (j.checks[k] || {}).obs || v.det }; }); save(true); toast('Verificación automática aplicada; revise los demás requisitos', 'ok'); });
  $('#jur-borr').addEventListener('click', () => { j.informe = borradorInformeJuridico(sol); save(true); });
}

/* ---------- Revisión del jefe analista ---------- */
function tabRevision(el, sol) {
  const ed = puedeEditar(sol, 'revision');
  const pr = sol.revisionJA || propuestaDesde(sol);
  const chk = sol.revisionCheck = sol.revisionCheck || {};
  const ncT = PAUTA_TECNICA.filter(c => ((sol.tecnico.checks || {})[c.id] || {}).estado === 'no_cumple');
  const ncJ = PAUTA_JURIDICA.filter(c => ((sol.juridico.checks || {})[c.id] || {}).estado === 'no_cumple');
  el.innerHTML = `${!['revision', 'firma', 'resuelta', 'notificada'].includes(sol.estado) ? '<p class="hint">La revisión se habilita cuando el jefe analista recibe ambos informes.</p>' : ''}
    <div class="cols2">
      <section class="card"><h3>Informe técnico ${sol.tecnico.estado === 'enviado' ? '<span class="chip ok">Recibido</span>' : '<span class="chip warn">Pendiente</span>'}</h3>
        <p><b>${esc(CONCLUSION_TEC[sol.tecnico.conclusion] || '—')}</b> · ${esc(usuario(sol.tecnico.por).nombre)} ${sol.tecnico.fecha ? '· ' + fmtFecha(sol.tecnico.fecha) : ''}</p>
        ${ncT.length ? `<p class="small">No cumple: ${ncT.map(c => `<b>${c.id}</b> ${esc(c.txt)}`).join('; ')}</p>` : ''}<pre class="informe">${esc(sol.tecnico.informe || '—')}</pre>
        <a href="#exp/${sol.id}/tecnico">Ver pauta técnica completa →</a></section>
      <section class="card"><h3>Informe jurídico ${sol.juridico.estado === 'enviado' ? '<span class="chip ok">Recibido</span>' : '<span class="chip warn">Pendiente</span>'}</h3>
        <p><b>${esc(CONCLUSION_JUR[sol.juridico.conclusion] || '—')}</b> · ${esc(usuario(sol.juridico.por).nombre)} ${sol.juridico.fecha ? '· ' + fmtFecha(sol.juridico.fecha) : ''}</p>
        ${ncJ.length ? `<p class="small">No cumple: ${ncJ.map(c => `<b>${c.id}</b> ${esc(c.txt)}`).join('; ')}</p>` : ''}<pre class="informe">${esc(sol.juridico.informe || '—')}</pre>
        <a href="#exp/${sol.id}/juridico">Ver pauta jurídica completa →</a></section></div>
    <section class="card"><h3>Revisión del análisis técnico</h3>
      ${REVISION_ITEMS.map(([k, tx]) => `<label class="chk"><input type="checkbox" data-rv="${k}" ${chk[k] || sol.revisionJA ? 'checked' : ''} ${ed ? '' : 'disabled'}> ${esc(tx)}</label>`).join('')}
      <label class="mt">Observaciones del jefe analista<textarea ${ed ? '' : 'disabled'} id="rv-obs" rows="3">${esc(sol.revisionObs || (sol.revisionJA || {}).obs || '')}</textarea></label>
      ${ed ? '<p class="hint">El jefe analista puede corregir la evaluación técnica directamente en su pestaña antes de enviarla a firma.</p>' : ''}</section>
    <section class="card"><h3>Proyecto de resolución ${sol.revisionJA ? `<span class="chip accent">Enviado el ${fmtFecha(sol.revisionJA.fecha)}</span>` : '<span class="chip">Propuesta calculada</span>'}</h3>
      <div class="mini-kpis"><div><b>${esc(RESUELVE[pr.tipo])}</b><span>Tipo de resolución</span></div><div><b>${fmt(pr.supAprobada)}</b><span>ha aprobadas (rodales ${(pr.rodalesAprobados || []).join(', ') || '—'})</span></div>
      <div><b>${fmt(pr.supRechazada)}</b><span>ha rechazadas ${(pr.rodalesObjetados || []).length ? `(rodales ${pr.rodalesObjetados.join(', ')})` : ''}</span></div></div></section>`;
  if (!ed) return;
  $$('[data-rv]', el).forEach(x => x.addEventListener('change', () => { chk[x.dataset.rv] = x.checked; guardar(); }));
  $('#rv-obs').addEventListener('change', e => { sol.revisionObs = e.target.value; guardar(); });
}

/* ---------- Resolución ---------- */
function tabResolucion(el, sol) {
  if (!sol.revisionJA && !sol.resolucion) { el.innerHTML = '<div class="empty">El proyecto de resolución se genera cuando el jefe analista envía el expediente al jefe provincial.</div>'; return; }
  const r = sol.resolucion;
  el.innerHTML = `<div class="resol-wrap"><div>${r ? `<div class="alert ok">Resolución <b>N° ${esc(r.numero)}</b> firmada el ${fmtFecha(r.fecha)} por ${esc(usuario(r.firmadaPor).nombre)}.</div>` : '<div class="alert warn">Borrador pendiente de firma del jefe provincial.</div>'}
    <pre class="resol">${esc(textoResolucion(sol))}</pre></div>
    <aside class="card"><h3>Antecedentes</h3><table class="kv"><tr><th>Tipo</th><td>${esc(RESUELVE[(r || sol.revisionJA).tipo])}</td></tr><tr><th>Sup. aprobada</th><td>${fmt((r || sol.revisionJA).supAprobada)} ha</td></tr>
      <tr><th>Vigencia</th><td>${fmtFecha((r || sol.revisionJA).vigenciaHasta)}</td></tr>
      ${r ? `<tr><th>Despacho carta certificada</th><td>Hasta ${fmtFecha(sumarHabiles(r.fecha, NORMA.plazoNotificarRechazo))}</td></tr>` : ''}
      ${sol.notificacion ? `<tr><th>Notificación</th><td>${esc(sol.notificacion.medio)} ${esc(sol.notificacion.numero || '')} · ${fmtFecha(sol.notificacion.fecha)}</td></tr>
        ${r.tipo !== 'aprueba' ? `<tr><th>Plazo de reclamo judicial</th><td>${NORMA.plazoReclamo} días desde ${fmtFecha(sol.notificacion.fecha)}</td></tr>` : ''}` : ''}</table>
      ${r ? '<div class="row-btns wrap"><button class="btn sm" id="rs-txt">Descargar resolución</button><button class="btn sm ghost" id="rs-geo">Cartografía aprobada (GeoJSON)</button></div>' : ''}</aside></div>`;
  if (r) {
    $('#rs-txt').addEventListener('click', () => descargar(`Resolucion_${r.numero.replace('/', '-')}_${sol.id}.txt`, textoResolucion(sol), 'text/plain'));
    $('#rs-geo').addEventListener('click', () => {
      const fc = turf.featureCollection((sol.cartografia ? sol.cartografia.features : []).map(f => turf.feature(f.geometry, { ...f.properties, solicitud: sol.id, resolucion: r.numero, estado: (r.rodalesAprobados || []).map(String).includes(String(f.properties.rodal)) ? 'aprobado' : 'rechazado' })));
      descargar(`${sol.id}_cartografia_resolucion.geojson`, JSON.stringify(fc), 'application/geo+json');
    });
  }
}

/* ---------- Historial ---------- */
function tabHistorial(el, sol) {
  const h = sol.historial.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  el.innerHTML = `<ol class="timeline">${h.map(x => `<li><span class="tl-d">${fmtFechaHora(x.fecha)}</span> <b>${esc(x.accion)}</b> <span class="muted small">${esc(usuario(x.usuario).nombre)} · ${esc(ROLES[x.rol] || x.rol)}</span>${x.detalle ? `<div class="small">${esc(x.detalle)}</div>` : ''}</li>`).join('')}</ol>`;
}
