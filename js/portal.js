/* =====================================================================
   SIGPM · Portal externo: propietarios y consultores
   Propietario: ve sus fichas prediales, emite tickets y revisa proyectos.
   Consultor: canjea el código del ticket, ve la ficha y elabora el plan.
   ===================================================================== */
const chipEtapa = pry => proyectoCongelado(pry) ? '<span class="chip bad">Congelado</span>' : `<span class="chip ${ETAPAS_PROYECTO[pry.etapa].color}">${esc(ETAPAS_PROYECTO[pry.etapa].nombre)}</span>`;
const chipTicket = t => { const e = estadoTicket(t); return `<span class="chip ${e.color}">${esc(e.nombre)}</span>`; };
const sinPermiso = (main, txt = 'No tiene acceso a esta información.') => { main.innerHTML = `<div class="empty">${esc(txt)} <a href="#bandeja">Volver a mi bandeja</a></div>`; };
const fechaLocal = iso => iso ? fmtFecha(isoDe(new Date(iso))) : '—'; // para marcas de tiempo en UTC
const vigenciaTicket = t => !t ? '—' : t.revocado ? `Revocado el ${fechaLocal(t.revocado)}` : fmtFecha(t.vence);
const cabeceraExterna = titulo => `<div class="eyebrow">${esc(ROLES[USUARIO.rol])}</div><h1>Mi bandeja</h1><p class="muted">${esc(titulo)}</p>`;

function tablaProyectos(list, columnaOtro, vacio) {
  const otro = pry => usuario(columnaOtro === 'Consultor' ? pry.consultorId : pry.propietarioId).nombre;
  return `<div class="tbl-wrap"><table class="grid clickable"><thead><tr><th>Proyecto</th><th>Predio</th><th>${esc(columnaOtro)}</th><th>Etapa</th><th>Vigencia del ticket</th><th>Solicitud CONAF</th></tr></thead><tbody>
    ${list.map(pry => { const p = predio(pry.predioId), t = ticketDeProyecto(pry); return `<tr data-href="#proyecto/${pry.id}"><td class="nowrap"><a href="#proyecto/${pry.id}"><b>${esc(pry.id)}</b></a></td>
      <td>${esc(p.nombre)}<div class="muted small">${esc(p.comuna)} · rol ${esc(p.rol)}</div></td><td>${esc(otro(pry))}</td><td>${chipEtapa(pry)}</td><td>${esc(vigenciaTicket(t))}</td><td>${esc(pry.solicitudId || '—')}</td></tr>`; }).join('')
    || `<tr><td colspan="6" class="empty-row">${esc(vacio)}</td></tr>`}</tbody></table></div>`;
}

/* ---------------- Bandeja del propietario ---------------- */
function vistaBandejaPropietario(main) {
  const predios = prediosDe(USUARIO);
  const orden = { revision: 0, elaboracion: 1, enviado: 2 };
  const proyectos = DB.proyectos.filter(x => x.propietarioId === USUARIO.id).sort((a, b) => orden[a.etapa] - orden[b.etapa] || b.creada.localeCompare(a.creada));
  const porRevisar = proyectos.filter(x => x.etapa === 'revision').length;
  const tickets = DB.tickets.filter(t => t.propietarioId === USUARIO.id).sort((a, b) => b.creado.localeCompare(a.creado));
  main.innerHTML = `<div class="page-head"><div>${cabeceraExterna('Fichas prediales, tickets de acceso y proyectos de plan de manejo')}</div></div>
    <section class="sec-box sec-pry"><h2>📝 Proyectos de plan de manejo</h2>
      ${porRevisar ? `<div class="alert warn">Tiene <b>${porRevisar}</b> proyecto(s) esperando su revisión.</div>` : ''}
      ${tablaProyectos(proyectos, 'Consultor', 'Aún no hay proyectos en sus predios.')}</section>
    <section class="sec-box sec-map mt"><h2>🌲 Mis predios</h2><div class="tbl-wrap"><table class="grid clickable"><thead><tr><th>Predio</th><th>Comuna</th><th>Rol</th><th class="num">Sup. SIG (ha)</th><th>Última solicitud</th><th>Tickets vigentes</th><th></th></tr></thead><tbody>
      ${predios.map(p => { const s = ultimaSolicitud(p.id); return `<tr data-href="#predio/${p.id}"><td><a href="#predio/${p.id}"><b>${esc(p.nombre)}</b></a></td><td>${esc(p.comuna)}</td><td>${esc(p.rol)}</td><td class="num">${fmt(p.supSIG)}</td>
        <td>${s ? `${esc(s.id)} ${chipEstado(s)}` : '<span class="muted">Sin solicitudes</span>'}</td><td class="num">${tickets.filter(t => t.predioId === p.id && ticketVigente(t)).length}</td>
        <td><button class="btn sm ghost" data-ticket="${p.id}">Crear ticket</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty-row">No tiene predios asociados a su cuenta.</td></tr>'}</tbody></table></div></section>
    <section class="sec-box sec-tk mt"><h2>🎫 Tickets emitidos</h2>${tablaTicketsPropietario(tickets)}</section>`;
  bindFilas(main);
  bindTickets(main);
}
function tablaTicketsPropietario(tickets, conPredio = true) {
  return `<div class="tbl-wrap"><table class="grid"><thead><tr><th>Código</th>${conPredio ? '<th>Predio</th>' : ''}<th>Consultor</th><th>Emitido</th><th>Vigente hasta</th><th>Estado</th><th></th></tr></thead><tbody>
    ${tickets.map(t => `<tr><td class="nowrap"><code class="tk-code">${esc(t.codigo)}</code></td>${conPredio ? `<td>${esc(predio(t.predioId).nombre)}</td>` : ''}<td>${esc(usuario(t.consultorId).nombre)}${t.nota ? `<div class="muted small">${esc(t.nota)}</div>` : ''}</td>
      <td>${fechaLocal(t.creado)}</td><td>${fmtFecha(t.vence)}${t.revocado ? `<div class="muted small">Revocado el ${fechaLocal(t.revocado)}</div>` : ''}</td><td>${chipTicket(t)}</td>
      <td>${ticketVigente(t) ? `<button class="btn sm ghost danger" data-revocar="${t.id}">Revocar</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="${conPredio ? 7 : 6}" class="empty-row">No ha emitido tickets.</td></tr>`}</tbody></table></div>`;
}
function bindTickets(el) {
  $$('[data-ticket]', el).forEach(b => b.addEventListener('click', () => dialogoTicket(b.dataset.ticket)));
  $$('[data-revocar]', el).forEach(b => b.addEventListener('click', () => dialogoRevocar(ticket(b.dataset.revocar))));
}
async function dialogoRevocar(t) {
  const co = usuario(t.consultorId), p = predio(t.predioId), pry = proyecto(t.proyectoId);
  const efectos = t.canjeado
    ? `<p>${esc(co.nombre)} dejará de ver la ficha de inmediato.${pry && pry.etapa === 'elaboracion' ? ` El proyecto ${esc(pry.id)} quedará congelado, sin perder lo avanzado, hasta que usted emita un nuevo ticket.` : ''}</p>`
    : `<p>El código ya no servirá para ${esc(co.nombre)}.</p>`;
  const ok = await modal({ titulo: 'Revocar ticket', html: `<p>¿Revocar el ticket <code class="tk-code">${esc(t.codigo)}</code> de <b>${esc(p.nombre)}</b>?</p>${efectos}<p class="muted small">Un ticket revocado no se puede reactivar; para volver a autorizar, debe crear uno nuevo.</p>`,
    botones: [{ txt: 'Cancelar' }, { txt: 'Revocar ticket', valor: true, cls: 'danger' }] });
  if (ok && revocarTicket(t)) { toast('Ticket revocado', 'ok'); rerender(); }
}
async function dialogoTicket(predioId) {
  const p = predio(predioId);
  if (!p || !puedeVerPredio(predioId) || USUARIO.rol !== 'PR') return;
  const min = sumarDias(hoyISO(), 1);
  const v = await modal({ titulo: 'Crear ticket de acceso', html: `<p>Autoriza a un consultor a ver la ficha predial de <b>${esc(p.nombre)}</b> y a elaborar un plan de manejo hasta la fecha que indique. Puede revocarlo en cualquier momento. Vencido o revocado, el proyecto queda congelado hasta que emita un nuevo ticket.</p>
      <div class="fgrid"><label class="span2">Consultor<select id="m-co">${USUARIOS.filter(u => u.rol === 'CO').map(u => `<option value="${u.id}">${esc(u.nombre)} · ${esc(u.email)}</option>`).join('')}</select></label>
      <label class="span2">Vigente hasta (inclusive)<input id="m-vence" type="date" min="${min}" value="${sumarDias(hoyISO(), 30)}"></label>
      <label class="span2">Mensaje para el consultor (opcional)<textarea id="m-nota" rows="2"></textarea></label></div>
      <p class="login-err" id="m-err" role="alert"></p>`,
    botones: [{ txt: 'Cancelar' }, { txt: 'Crear y enviar código',
      validar: bg => { const ok = $('#m-vence', bg).value >= min; $('#m-err', bg).textContent = ok ? '' : `La fecha debe ser posterior a hoy (desde ${fmtFecha(min)}).`; return ok; },
      valor: bg => ({ co: $('#m-co', bg).value, vence: $('#m-vence', bg).value, nota: $('#m-nota', bg).value.trim() }) }] });
  if (!v) return;
  const t = crearTicket(predioId, v.co, v.vence, v.nota);
  const co = usuario(v.co);
  const r = modal({ titulo: 'Ticket creado', html: `<p>Código para <b>${esc(co.nombre)}</b> (${esc(co.email)}):</p><p class="tk-grande"><code class="tk-code">${esc(t.codigo)}</code></p>
      <p>Vigente hasta el <b>${fmtFecha(t.vence)}</b> para la ficha de ${esc(p.nombre)}.</p>
      <p class="muted small">Maqueta: no se envía un correo real. El código aparece en la bandeja del consultor como correo simulado.</p>
      <div class="row-btns"><button type="button" class="btn sm ghost" id="m-copiar">Copiar código</button></div>` });
  const cp = $('#m-copiar');
  if (cp) cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(t.codigo); toast('Código copiado', 'ok'); } catch (e) { toast('No se pudo copiar; selecciónelo manualmente', 'warn'); } });
  await r;
  rerender();
}

/* ---------------- Bandeja del consultor ---------------- */
function vistaBandejaConsultor(main) {
  const tickets = DB.tickets.filter(t => t.consultorId === USUARIO.id).sort((a, b) => b.creado.localeCompare(a.creado));
  const proyectos = DB.proyectos.filter(x => x.consultorId === USUARIO.id).sort((a, b) => b.creada.localeCompare(a.creada));
  const accion = t => {
    if (!ticketVigente(t)) return '<span class="muted small">Pida un nuevo ticket</span>';
    if (!t.canjeado) return `<button class="btn sm" data-usar="${esc(t.codigo)}">Usar código</button>`;
    return `<a class="btn sm ghost" href="#predio/${t.predioId}">Ver ficha predial</a>`;
  };
  main.innerHTML = `<div class="page-head"><div>${cabeceraExterna('Códigos de acceso y proyectos de plan de manejo')}</div></div>
    <section class="sec-box sec-tk"><h2>🔑 Ingresar código de acceso</h2>
      <p class="muted small">El propietario del predio emite un ticket con un código y un plazo. Con ese código accede a su ficha predial y puede crear el plan de manejo.</p>
      <form id="tk-form" class="tk-form" autocomplete="off"><input id="tk-cod" placeholder="TK-XXXX-XXXX" aria-label="Código del ticket" required><button class="btn" type="submit">Acceder</button></form>
      <p class="login-err" id="tk-err" role="alert"></p>
      <h3>Códigos recibidos <small class="muted">Correo simulado de la maqueta</small></h3>
      <div class="tbl-wrap"><table class="grid"><thead><tr><th>Código</th><th>Predio</th><th>Propietario</th><th>Vigente hasta</th><th>Estado</th><th></th></tr></thead><tbody>
      ${tickets.map(t => { const p = predio(t.predioId); return `<tr><td class="nowrap"><code class="tk-code">${esc(t.codigo)}</code></td><td>${esc(p.nombre)}<div class="muted small">${esc(p.comuna)} · rol ${esc(p.rol)}</div></td>
        <td>${esc(usuario(t.propietarioId).nombre)}${t.nota ? `<div class="muted small">${esc(t.nota)}</div>` : ''}</td><td>${fmtFecha(t.vence)}</td><td>${chipTicket(t)}</td><td>${accion(t)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty-row">Aún no ha recibido códigos.</td></tr>'}</tbody></table></div></section>
    <section class="sec-box sec-pry mt"><h2>📝 Mis proyectos de plan de manejo</h2>${tablaProyectos(proyectos, 'Propietario', 'Aún no tiene proyectos. Ingrese un código para comenzar.')}</section>`;
  bindFilas(main);
  const canjear = codigo => {
    const r = canjearTicket(codigo);
    if (r.error) { $('#tk-err').textContent = r.error; return; }
    const p = predio(r.ticket.predioId);
    if (r.proyecto) { toast(`Proyecto ${r.proyecto.id} vigente hasta ${fmtFecha(r.ticket.vence)}`, 'ok'); location.hash = `#proyecto/${r.proyecto.id}`; return; }
    toast(`Acceso autorizado a ${p.nombre} hasta ${fmtFecha(r.ticket.vence)}`, 'ok');
    location.hash = `#predio/${p.id}`;
  };
  $('#tk-form').addEventListener('submit', e => { e.preventDefault(); canjear($('#tk-cod').value); });
  $$('[data-usar]', main).forEach(b => b.addEventListener('click', () => canjear(b.dataset.usar)));
}

/* ---------------- Agregados a la ficha predial ---------------- */
function fichaBotonesExternos(p) {
  if (USUARIO.rol === 'PR') return `<button class="btn" data-ticket="${p.id}">🎫 Crear ticket para esta ficha</button>`;
  if (USUARIO.rol !== 'CO') return '';
  const t = ticketDeAcceso(USUARIO.id, p.id);
  if (t.proyectoId) return `<a class="btn" href="#proyecto/${t.proyectoId}">Abrir mi proyecto</a>`;
  return `<button class="btn" id="fi-crear" data-t="${t.id}">+ Crear plan de manejo con estos datos</button>`;
}
function fichaAvisoConsultor(p) {
  if (USUARIO.rol !== 'CO') return '';
  const t = ticketDeAcceso(USUARIO.id, p.id);
  return `<div class="alert warn">Acceso autorizado por ${esc(usuario(t.propietarioId).nombre)} hasta el <b>${fmtFecha(t.vence)}</b> (quedan ${corridosEntre(hoyISO(), t.vence)} días).</div>`;
}
/* El consultor ve el estado de los planes del predio, pero no entra a los expedientes */
function fichaSolicitudesConsultor(sols) {
  return `<div class="tbl-wrap"><table class="grid"><thead><tr><th>N° solicitud</th><th>Tipo</th><th class="num">Sup. (ha)</th><th>Ingreso</th><th>Estado</th><th>Resolución</th></tr></thead><tbody>
    ${sols.map(s => `<tr><td class="nowrap"><b>${esc(s.id)}</b></td><td>${esc(TIPOS_PLAN[s.tipoPlan].nombre)}</td><td class="num">${fmt(supSol(s))}</td><td>${fmtFecha(s.fechaIngreso)}</td><td>${chipEstado(s)}</td>
      <td>${s.resolucion ? `N° ${esc(s.resolucion.numero)} · ${esc(RESUELVE[s.resolucion.tipo])}` : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-row">El predio no registra solicitudes.</td></tr>'}</tbody></table></div>`;
}
function fichaSeccionesPropietario(p) {
  if (USUARIO.rol !== 'PR') return '';
  const tickets = DB.tickets.filter(t => t.predioId === p.id).sort((a, b) => b.creado.localeCompare(a.creado));
  const proyectos = DB.proyectos.filter(x => x.predioId === p.id).sort((a, b) => b.creada.localeCompare(a.creada));
  return `<h2>Proyectos en este predio</h2>${tablaProyectos(proyectos, 'Consultor', 'No hay proyectos en este predio.')}
    <h2>Tickets de esta ficha</h2>${tablaTicketsPropietario(tickets, false)}`;
}

/* Las dos vistas del historial para el propietario: planes resueltos y solicitudes en curso */
const VISTAS_PROPIETARIO = {
  firmados: { l: 'Planes con resolución firmada', filtro: s => !!s.resolucion, render: l => tablaPlanesFirmados(l) },
  encurso: { l: 'Solicitudes en evaluación', filtro: s => !s.resolucion, render: l => l.map(tarjetaSolicitudEnCurso).join('') || '<div class="empty">No tiene solicitudes en evaluación en este predio.</div>' },
};
function fichaVistasPropietario(sols) {
  const n = k => sols.filter(VISTAS_PROPIETARIO[k].filtro).length;
  return `<h2 class="mt">Historial de la ficha predial</h2>
    <div class="kpis" role="tablist">${Object.entries(VISTAS_PROPIETARIO).map(([k, o]) => `<button type="button" role="tab" class="kpi kpi-btn" data-kpi="${k}" style="text-align:left;cursor:pointer;font:inherit"><div class="kpi-l">${esc(o.l)}</div><div class="kpi-v">${n(k)}</div></button>`).join('')}</div>
    <div id="kpi-detalle" class="sec-box sec-det mt"></div>`;
}
function bindVistasPropietario(main, sols) {
  const det = $('#kpi-detalle', main);
  if (!det) return;
  const pintar = k => {
    $$('[data-kpi]', main).forEach(b => b.setAttribute('aria-selected', b.dataset.kpi === k));
    det.dataset.k = k;
    const o = VISTAS_PROPIETARIO[k];
    det.innerHTML = `<h2>${esc(o.l)}</h2>${o.render(sols.filter(o.filtro))}`;
    bindFilas(det);
  };
  $$('[data-kpi]', main).forEach(b => b.addEventListener('click', () => pintar(b.dataset.kpi)));
  pintar(sols.some(VISTAS_PROPIETARIO.encurso.filtro) ? 'encurso' : 'firmados');
}
function tablaPlanesFirmados(list) {
  const orden = list.slice().sort((a, b) => b.resolucion.fecha.localeCompare(a.resolucion.fecha));
  return `<div class="tbl-wrap"><table class="grid clickable"><thead><tr><th>N° solicitud</th><th>Resolución</th><th>Fecha</th><th>Resultado</th><th class="num">Sup. aprobada (ha)</th><th>Vigente hasta</th><th>Tipo de plan</th></tr></thead><tbody>
    ${orden.map(s => { const r = s.resolucion; return `<tr data-href="#exp/${s.id}/resolucion"><td class="nowrap"><b>${esc(s.id)}</b></td><td class="nowrap"><a href="#exp/${s.id}/resolucion">N° ${esc(r.numero)}</a></td><td>${fmtFecha(r.fecha)}</td><td>${esc(RESUELVE[r.tipo])}</td>
      <td class="num">${fmt(r.supAprobada)}</td><td>${r.tipo === 'rechaza' ? '—' : fmtFecha(r.vigenciaHasta)}</td><td>${esc(TIPOS_PLAN[s.tipoPlan].nombre)}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty-row">El predio no registra planes con resolución firmada.</td></tr>'}</tbody></table></div>`;
}
/* Fecha en que la solicitud entró a cada etapa de PASOS, solo con hitos del procedimiento */
function fechasEtapas(s) {
  const t = s.tecnico || {}, j = s.juridico || {};
  return [fechaLocal(s.creada), fmtFecha(s.fechaIngreso), fmtFecha(s.asignacion && s.asignacion.fecha), fmtFecha([t.fecha, j.fecha].filter(Boolean).sort().pop()), fmtFecha(s.revisionJA && s.revisionJA.fecha), '—'];
}
/* Solo la etapa, las fechas y lo que el interesado debe responder: sin enlaces, informes ni responsables */
function tarjetaSolicitudEnCurso(s) {
  const e = ESTADOS[s.estado], desistida = s.estado === 'desistida', fechas = fechasEtapas(s);
  const req = (s.requerimientos || []).filter(r => !r.fechaRespuesta).pop();
  return `<article class="card sol-curso"><div class="sol-curso-h"><div><b>${esc(s.id)}</b> ${chipEstado(s)}<div class="muted small">${esc(TIPOS_PLAN[s.tipoPlan].nombre)} · ${fmt(supSol(s))} ha solicitadas · ${s.fechaIngreso ? `ingreso ${fmtFecha(s.fechaIngreso)}` : 'aún sin ingreso formal'}</div></div>
      <div class="small">Plazo legal: ${chipPlazo(s)}</div></div>
    <ol class="stepper">${PASOS.map((nombre, i) => `<li class="${desistida ? (i === 0 ? 'bad' : '') : i < e.paso ? 'done' : i === e.paso ? 'now' : ''}" ${!desistida && i === e.paso ? 'aria-current="step"' : ''}>${esc(nombre)}${!desistida && i <= e.paso ? `<small>${esc(fechas[i])}</small>` : ''}</li>`).join('')}</ol>
    ${req ? `<div class="alert warn"><b>Se requieren antecedentes antes del ${fmtFecha(req.plazo)}:</b> ${esc(req.detalle)}</div>` : ''}</article>`;
}
function bindFichaExterna(main, sols) {
  bindTickets(main);
  bindVistasPropietario(main, sols);
  const b = $('#fi-crear', main);
  if (b) b.addEventListener('click', () => {
    const pry = crearProyecto(ticket(b.dataset.t));
    if (!pry) { toast('El ticket ya no permite crear un proyecto', 'warn'); rerender(); return; }
    toast(`Proyecto ${pry.id} creado con los datos de la ficha predial`, 'ok');
    location.hash = `#proyecto/${pry.id}/formulario`;
  });
}

/* ---------------- Proyecto de plan de manejo ---------------- */
const TABS_PROYECTO = [['formulario', 'Formulario PMFBN'], ['cartografia', 'Cartografía y análisis'], ['historial', 'Historial']];
function vistaProyecto(main, id, tab) {
  const pry = proyecto(id);
  if (!pry || !puedeVerProyecto(pry)) { sinPermiso(main, 'Proyecto no disponible.'); return; }
  tab = TABS_PROYECTO.some(t => t[0] === tab) ? tab : 'formulario';
  const p = predio(pry.predioId), t = ticketDeProyecto(pry), esCO = USUARIO.rol === 'CO';
  const otro = usuario(esCO ? pry.propietarioId : pry.consultorId);
  const congelado = proyectoCongelado(pry);
  const motivo = t && t.revocado ? `El propietario revocó el ticket el ${fechaLocal(t.revocado)}` : `El ticket venció el ${fmtFecha(t && t.vence)}`;
  const vigente = ticketVigente(t);
  main.innerHTML = `<div class="exp-head"><div><a href="#bandeja" class="back">← Bandeja</a><div class="eyebrow">Proyecto de plan de manejo</div>
      <h1>${esc(pry.id)} ${chipEtapa(pry)}</h1>
      <p class="muted">${puedeVerPredio(p.id) ? `<a href="#predio/${p.id}">${esc(p.nombre)}</a>` : esc(p.nombre)} · rol ${esc(p.rol)} · ${esc(p.comuna)} · ${esc(esCO ? 'Propietario' : 'Consultor')}: ${esc(otro.nombre)}</p></div>
      <div class="plazo-box ${congelado ? 'bad' : ''}"><b>${vigente ? `Ticket vigente hasta ${fmtFecha(t.vence)}` : t && t.revocado ? 'Ticket revocado' : 'Ticket vencido'}</b><span>${vigente ? `Código ${esc(t.codigo)}` : esc(motivo)}</span></div></div>
    ${congelado ? `<div class="alert bad"><b>Proyecto congelado.</b> ${esc(motivo)} y no se puede modificar. ${esCO ? `Solicite un nuevo ticket a ${esc(otro.nombre)} e ingrese el código en <a href="#bandeja">Mi bandeja</a>.` : `Para reactivarlo, emita un nuevo ticket a ${esc(otro.nombre)} desde la <a href="#predio/${p.id}">ficha predial</a>.`}</div>` : ''}
    ${pry.observacion && pry.etapa === 'elaboracion' ? `<div class="alert warn"><b>Observaciones del propietario:</b> ${esc(pry.observacion)}</div>` : ''}
    ${pry.etapa === 'enviado' ? `<div class="alert ok">Enviado a ${esc(pry.oficina)} como solicitud <b>${esc(pry.solicitudId)}</b>.${USUARIO.rol === 'PR' ? ` Puede seguir su estado en la <a href="#predio/${p.id}">ficha predial</a>.` : ''}</div>` : ''}
    <div class="actions" id="acciones"></div>
    <nav class="tabs" role="tablist">${TABS_PROYECTO.map(([k, l]) => `<a role="tab" href="#proyecto/${pry.id}/${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${esc(l)}</a>`).join('')}</nav>
    <div id="panel" class="panel"></div>`;
  accionesProyecto(pry);
  ({ formulario: tabFormulario, cartografia: tabCartografia, historial: tabHistorial })[tab]($('#panel'), pry);
}
function accionesProyecto(pry) {
  const a = [];
  if (puedeEditarProyecto(pry)) a.push('<button class="btn" id="py-env">Finalizar: enviar al propietario</button>');
  if (pry.propietarioId === USUARIO.id && pry.etapa === 'revision') a.push('<button class="btn ghost" id="py-dev">Devolver al consultor</button>', '<button class="btn" id="py-conaf">Conforme: enviar a CONAF</button>');
  const espera = pry.etapa === 'enviado' ? 'Proyecto terminado.' : proyectoCongelado(pry) ? 'Sin acciones mientras el proyecto esté congelado.'
    : pry.etapa === 'revision' ? 'Esperando la revisión del propietario.' : 'El consultor está elaborando el plan.';
  $('#acciones').innerHTML = `<div class="who">Actuando como <b>${esc(USUARIO.nombre)}</b> · ${esc(ROLES[USUARIO.rol])}</div><div class="row-btns wrap">${a.join('') || `<span class="muted">${esc(espera)}</span>`}</div>`;
  const on = (id, fn) => { const b = $('#' + id); if (b) b.addEventListener('click', fn); };
  on('py-env', async () => {
    const f = faltantesProyecto(pry);
    if (f.length) { await modal({ titulo: 'Falta completar el proyecto', ancho: 640, html: `<p>Antes de enviarlo al propietario falta:</p><ul class="list">${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` }); return; }
    const ok = await modal({ titulo: 'Enviar al propietario', html: `<p>El proyecto pasará a revisión de <b>${esc(usuario(pry.propietarioId).nombre)}</b> y no podrá modificarlo, salvo que se lo devuelva.</p>`, botones: [{ txt: 'Cancelar' }, { txt: 'Enviar al propietario', valor: true }] });
    if (ok && enviarAlPropietario(pry)) { toast('Proyecto enviado al propietario', 'ok'); rerender(); }
  });
  on('py-dev', async () => {
    const sinTicket = !ticketVigente(ticketDeProyecto(pry));
    const obs = await modal({ titulo: 'Devolver al consultor', html: `<label>Observaciones para corregir<textarea id="m-obs" rows="5"></textarea></label>${sinTicket ? '<p class="warn-txt small">El ticket ya no está vigente: el proyecto volverá congelado hasta que emita uno nuevo.</p>' : ''}`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Devolver', valor: bg => $('#m-obs', bg).value.trim(), validar: bg => !!$('#m-obs', bg).value.trim() }] });
    if (obs && devolverAlConsultor(pry, obs)) { toast('Proyecto devuelto al consultor', 'ok'); rerender(); }
  });
  on('py-conaf', async () => {
    const ok = await modal({ titulo: 'Enviar a CONAF', html: `<p>El plan se enviará a <b>${esc(pry.oficina)}</b> y quedará en la bandeja de la secretaría técnica para su ingreso. Después de esto, el proyecto ya no se puede modificar.</p>
        <p class="muted small">El plazo legal corre desde que la secretaría técnica lo ingresa, no desde este envío.</p>`, botones: [{ txt: 'Cancelar' }, { txt: 'Enviar a CONAF', valor: true }] });
    if (!ok) return;
    const sol = enviarAConaf(pry);
    if (sol) { toast(`Enviado a ${sol.oficina} como solicitud ${sol.id}`, 'ok'); rerender(); }
  });
}
