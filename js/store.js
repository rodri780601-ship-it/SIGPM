/* =====================================================================
   SIGPM · Almacenamiento (navegador) y flujo del procedimiento
   La capa de datos está aislada aquí para reemplazarla por una API
   (p. ej. REST + PostGIS) sin tocar las vistas.
   ===================================================================== */
const STORE_KEY = 'sigpm.datos.v1';
const USER_KEY = 'sigpm.usuario.v1';
let DB = null;
let USUARIO = null;

const USUARIOS = [
  { id: 'st1', usuario: 'secretaria', clave: 'demo2026', nombre: 'Marcela Torres Vidal', rol: 'ST', oficina: 'Oficina Provincial Valdivia' },
  { id: 'ja1', usuario: 'jefe.analista', clave: 'demo2026', nombre: 'Jorge Pérez Alarcón', rol: 'JA', oficina: 'Oficina Provincial Valdivia' },
  { id: 'an1', usuario: 'analista1', clave: 'demo2026', nombre: 'Camila Henríquez Soto', rol: 'AN', oficina: 'Oficina Provincial Valdivia' },
  { id: 'an2', usuario: 'analista2', clave: 'demo2026', nombre: 'Rodrigo Mansilla Ríos', rol: 'AN', oficina: 'Oficina Provincial Valdivia' },
  { id: 'an3', usuario: 'analista3', clave: 'demo2026', nombre: 'Valentina Oyarzún Leal', rol: 'AN', oficina: 'Oficina Provincial Valdivia' },
  { id: 'ab1', usuario: 'abogado1', clave: 'demo2026', nombre: 'Andrés Contreras Lagos', rol: 'AB', oficina: 'Unidad Jurídica Regional Los Ríos' },
  { id: 'ab2', usuario: 'abogado2', clave: 'demo2026', nombre: 'Francisca Barrientos Mora', rol: 'AB', oficina: 'Unidad Jurídica Regional Los Ríos' },
  { id: 'jp1', usuario: 'jefe.provincial', clave: 'demo2026', nombre: 'Patricio Saavedra Núñez', rol: 'JP', oficina: 'Oficina Provincial Valdivia' },
  // Usuarios externos: propietarios (con sus predios) y consultores
  { id: 'pr1', usuario: 'propietario1', clave: 'demo2026', nombre: 'AGRÍCOLA Y FORESTAL LOS ULMOS LTDA.', rol: 'PR', oficina: 'Usuario externo', predios: ['P01', 'P09'],
    datos: { tipo: 'juridica', rut: fmtRut(77123456), domicilio: 'Av. Ramón Picarte 1200, Valdivia', comuna: 'Valdivia', email: 'gerencia@ejemplo.cl', telefono: '+56 63 200 0000', representante: { nombre: 'HERNÁN SOLÍS VERA', rut: fmtRut(12876543) } } },
  { id: 'pr2', usuario: 'propietario2', clave: 'demo2026', nombre: 'JUAN CARLOS VERA OYARZO', rol: 'PR', oficina: 'Usuario externo', predios: ['P02'],
    datos: { tipo: 'natural', rut: fmtRut(10456789), domicilio: 'Camino rural s/n', comuna: 'Corral', email: 'contacto@ejemplo.cl', telefono: '+56 9 0000 0000', representante: { nombre: '', rut: '' } } },
  { id: 'co1', usuario: 'consultor1', clave: 'demo2026', nombre: 'Ignacio Fuentes Paredes', rol: 'CO', oficina: 'Usuario externo', email: 'ifuentes@ejemplo.cl',
    profesional: { nombre: 'Ignacio Fuentes Paredes', rut: fmtRut(14523876), titulo: 'Ingeniero forestal', universidad: 'Universidad Austral de Chile', semestres: 11, postitulo: false } },
  { id: 'co2', usuario: 'consultor2', clave: 'demo2026', nombre: 'Daniela Riquelme Ulloa', rol: 'CO', oficina: 'Usuario externo', email: 'driquelme@ejemplo.cl',
    profesional: { nombre: 'Daniela Riquelme Ulloa', rut: fmtRut(15678234), titulo: 'Ingeniero forestal', universidad: 'Universidad de Concepción', semestres: 10, postitulo: false } },
];
const usuario = id => USUARIOS.find(u => u.id === id) || { nombre: '—', rol: '' };

function guardar() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }
  catch (e) { toast('No se pudo guardar en el navegador (almacenamiento lleno o bloqueado).', 'error'); }
}
function cargar() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { DB = JSON.parse(raw); return true; } } catch (e) { /* */ }
  return false;
}
function reiniciarDatos() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* */ } DB = generarSemilla(); guardar(); }
function iniciarSesion(u, c) {
  const x = USUARIOS.find(z => z.usuario === String(u || '').trim().toLowerCase() && z.clave === c);
  if (x) setUsuario(x.id);
  return x || null;
}
function cerrarSesion() { USUARIO = null; try { localStorage.removeItem(USER_KEY); } catch (e) { /* */ } }
function setUsuario(id) { USUARIO = usuario(id); try { localStorage.setItem(USER_KEY, id); } catch (e) { /* */ } }
function usuarioGuardado() { try { return localStorage.getItem(USER_KEY); } catch (e) { return null; } }

const solicitud = id => DB.solicitudes.find(s => s.id === id);
const predio = id => DB.predios.find(p => p.id === id);

function registrar(sol, accion, detalle = '') {
  sol.historial.push({ fecha: new Date().toISOString(), usuario: USUARIO.id, rol: USUARIO.rol, accion, detalle });
}

/* ---------- Plazos ---------- */
function plazo(sol) {
  if (!sol.fechaIngreso) return null;
  const fin = sol.resolucion ? sol.resolucion.fecha : hoyISO();
  let usados = habilesEntre(sol.fechaIngreso, fin);
  // Se descuenta el tiempo en que el expediente esperó la subsanación del interesado (art. 31 Ley 19.880)
  (sol.requerimientos || []).forEach(r => { usados -= habilesEntre(r.fecha, r.fechaRespuesta || (sol.estado === 'subsanacion' ? hoyISO() : r.fecha)); });
  usados = Math.max(0, usados);
  const vence = sumarHabiles(sol.fechaIngreso, NORMA.plazoResolucion + (sol.requerimientos || []).reduce((a, r) => a + habilesEntre(r.fecha, r.fechaRespuesta || r.fecha), 0));
  const quedan = NORMA.plazoResolucion - usados;
  const nivel = sol.resolucion ? 'ok' : quedan < 0 ? 'bad' : quedan <= 15 ? 'warn' : 'ok';
  return { usados, quedan, vence, nivel };
}

/* ---------- Permisos por rol ---------- */
function puedeEditar(sol, seccion) {
  if (sol.esProyecto) return seccion === 'ingreso' && puedeEditarProyecto(sol);
  const r = USUARIO.rol, e = sol.estado;
  if (seccion === 'ingreso') return r === 'ST' && (e === 'recepcion' || e === 'subsanacion');
  if (seccion === 'tecnico') return e === 'evaluacion' && sol.tecnico.estado !== 'enviado' && ((r === 'AN' && sol.asignacion && sol.asignacion.analista === USUARIO.id) || r === 'JA');
  if (seccion === 'tecnicoJA') return r === 'JA' && e === 'revision';
  if (seccion === 'juridico') return e === 'evaluacion' && sol.juridico.estado !== 'enviado' && r === 'AB' && sol.asignacion && sol.asignacion.abogado === USUARIO.id;
  if (seccion === 'revision') return r === 'JA' && e === 'revision';
  if (seccion === 'firma') return r === 'JP' && e === 'firma';
  if (seccion === 'notificar') return r === 'ST' && e === 'resuelta';
  if (seccion === 'asignar') return r === 'JA' && (e === 'asignacion' || e === 'evaluacion');
  return false;
}

/* Bandeja: solicitudes que requieren acción del usuario actual */
function pendientesDe(u) {
  return DB.solicitudes.filter(s => {
    switch (u.rol) {
      case 'ST': return ['recepcion', 'subsanacion', 'resuelta'].includes(s.estado);
      case 'JA': return ['asignacion', 'revision'].includes(s.estado);
      case 'AN': return s.estado === 'evaluacion' && s.asignacion && s.asignacion.analista === u.id && s.tecnico.estado !== 'enviado';
      case 'AB': return s.estado === 'evaluacion' && s.asignacion && s.asignacion.abogado === u.id && s.juridico.estado !== 'enviado';
      case 'JP': return s.estado === 'firma';
      default: return false;
    }
  });
}

/* ---------- Transiciones ---------- */
function nuevaSolicitudVacia() {
  const y = new Date().getFullYear();
  DB.seq.sol = (DB.seq.sol || 0) + 1;
  return { id: `PM-${y}-${String(DB.seq.sol).padStart(4, '0')}`, ...solicitudBase() };
}
/* Estructura común de una solicitud y de un proyecto de plan de manejo */
function solicitudBase() {
  return {
    estado: 'recepcion', tipoPlan: 'PMF', predioId: null, fechaIngreso: null,
    oficina: 'Oficina Provincial Valdivia', creada: new Date().toISOString(),
    interesado: { tipo: 'natural', calidad: 'propietario', nombre: '', rut: '', domicilio: '', comuna: '', email: '', telefono: '', representante: { nombre: '', rut: '' }, pequenoPropietario: false },
    profesional: { nombre: '', rut: '', titulo: 'Ingeniero forestal', universidad: '', semestres: 10, postitulo: false },
    documentos: {}, pmfbn: plantillaPMFBN(), cartografia: null, origenFormulario: 'interno',
    asignacion: null, tecnico: { estado: 'pendiente', checks: {}, rodales: {}, conclusion: '', informe: '', visita: { fecha: '', obs: '' } },
    juridico: { estado: 'pendiente', checks: {}, conclusion: '', informe: '' }, revisionJA: null, resolucion: null, notificacion: null,
    requerimientos: [], historial: [],
  };
}

function faltantesIngreso(sol) {
  const f = [];
  if (!sol.predioId) f.push('Predio (seleccione uno existente o cargue su límite)');
  if (!sol.interesado.nombre || !sol.interesado.rut) f.push('Individualización del interesado');
  if (sol.interesado.rut && !rutValido(sol.interesado.rut)) f.push('RUT del interesado inválido');
  if (!sol.profesional.nombre) f.push('Profesional que elaboró el plan');
  if (!sol.cartografia || !sol.cartografia.features.length) f.push('Cartografía del área a intervenir');
  if (!(sol.pmfbn.rodales || []).length) f.push('Rodales del formulario PMFBN');
  documentosRequeridos(sol).forEach(d => { if (!(sol.documentos[d.key] || {}).presentado) f.push(`Documento: ${d.nombre} (${d.art})`); });
  return f;
}

function ingresar(sol) {
  sol.fechaIngreso = sol.fechaIngreso || hoyISO();
  sol.estado = 'asignacion';
  registrar(sol, 'Solicitud ingresada', `Ingreso a la oficina; plazo legal de ${NORMA.plazoResolucion} días hábiles (art. 8° Ley 20.283)`);
  guardar();
}
function requerirAntecedentes(sol, detalle) {
  sol.fechaIngreso = sol.fechaIngreso || hoyISO();
  const fecha = hoyISO();
  sol.requerimientos.push({ fecha, plazo: sumarHabiles(fecha, NORMA.plazoSubsanar), detalle, fechaRespuesta: null });
  sol.estado = 'subsanacion';
  registrar(sol, 'Requerimiento de antecedentes (art. 31 Ley 19.880)', detalle);
  guardar();
}
function registrarSubsanacion(sol) {
  const r = sol.requerimientos[sol.requerimientos.length - 1];
  if (r) r.fechaRespuesta = hoyISO();
  sol.estado = 'recepcion';
  registrar(sol, 'Antecedentes subsanados', 'El interesado acompañó los antecedentes requeridos');
  guardar();
}
function tenerPorDesistida(sol) {
  sol.estado = 'desistida';
  registrar(sol, 'Se tiene por desistida', 'No se subsanó dentro del plazo del art. 31 Ley 19.880');
  guardar();
}
function asignar(sol, analista, abogado) {
  const prev = sol.asignacion;
  sol.asignacion = { analista, abogado, fecha: hoyISO(), por: USUARIO.id };
  if (sol.estado === 'asignacion') sol.estado = 'evaluacion';
  registrar(sol, prev ? 'Reasignación' : 'Asignación', `Analista: ${usuario(analista).nombre} · Abogado: ${usuario(abogado).nombre}`);
  guardar();
}
function enviarTecnico(sol) {
  sol.tecnico.estado = 'enviado'; sol.tecnico.fecha = hoyISO(); sol.tecnico.por = USUARIO.id;
  registrar(sol, 'Informe técnico enviado al jefe analista', sol.tecnico.conclusion ? `Conclusión: ${CONCLUSION_TEC[sol.tecnico.conclusion]}` : '');
  pasarARevisionSiCorresponde(sol); guardar();
}
function enviarJuridico(sol) {
  sol.juridico.estado = 'enviado'; sol.juridico.fecha = hoyISO(); sol.juridico.por = USUARIO.id;
  registrar(sol, 'Informe jurídico enviado al jefe analista', sol.juridico.conclusion ? `Conclusión: ${CONCLUSION_JUR[sol.juridico.conclusion]}` : '');
  pasarARevisionSiCorresponde(sol); guardar();
}
function pasarARevisionSiCorresponde(sol) {
  if (sol.tecnico.estado === 'enviado' && sol.juridico.estado === 'enviado') { sol.estado = 'revision'; registrar(sol, 'Expediente completo en revisión del jefe analista'); }
}
function devolver(sol, a, obs) {
  if (a === 'analista') { sol.tecnico.estado = 'devuelto'; sol.tecnico.devolucion = obs; }
  if (a === 'abogado') { sol.juridico.estado = 'devuelto'; sol.juridico.devolucion = obs; }
  sol.estado = 'evaluacion';
  registrar(sol, `Devuelto al ${a}`, obs);
  guardar();
}
function proponerResolucion(sol, propuesta) {
  sol.revisionJA = { ...propuesta, fecha: hoyISO(), por: USUARIO.id };
  sol.estado = 'firma';
  registrar(sol, 'Análisis técnico conforme · proyecto de resolución enviado al jefe provincial', `${RESUELVE[propuesta.tipo]} · ${fmt(propuesta.supAprobada)} ha aprobadas`);
  guardar();
}
function devolverAJA(sol, obs) {
  sol.estado = 'revision';
  registrar(sol, 'Devuelto al jefe analista por el jefe provincial', obs);
  guardar();
}
function firmarResolucion(sol) {
  const y = new Date().getFullYear();
  DB.seq.res = (DB.seq.res || 0) + 1;
  const p = sol.revisionJA;
  sol.resolucion = { numero: `${DB.seq.res}/${y}`, fecha: hoyISO(), tipo: p.tipo, supAprobada: p.supAprobada, supRechazada: p.supRechazada,
    rodalesAprobados: p.rodalesAprobados, rodalesObjetados: p.rodalesObjetados, firmadaPor: USUARIO.id, vigenciaHasta: p.vigenciaHasta };
  sol.estado = 'resuelta';
  registrar(sol, `Resolución N° ${sol.resolucion.numero} firmada`, RESUELVE[p.tipo]);
  guardar();
}
function notificar(sol, datos) {
  sol.notificacion = { ...datos, por: USUARIO.id };
  sol.estado = 'notificada';
  registrar(sol, 'Resolución notificada', `${datos.medio} N° ${datos.numero || '—'} del ${fmtFecha(datos.fecha)}`);
  guardar();
}

/* ---------- Usuarios externos: acceso a la información ---------- */
const esExterno = (u = USUARIO) => !!u && ['PR', 'CO'].includes(u.rol);
const prediosDe = u => DB.predios.filter(p => (u.predios || []).includes(p.id));
const propietarioDe = pid => USUARIOS.find(u => u.rol === 'PR' && u.predios.includes(pid)) || null;
const oficinaDePredio = p => `Oficina Provincial ${p.provincia}`;

function puedeVerPredio(pid) {
  if (USUARIO.rol === 'PR') return (USUARIO.predios || []).includes(pid);
  if (USUARIO.rol === 'CO') return !!ticketDeAcceso(USUARIO.id, pid);
  return true;
}
/* El propietario entra al expediente solo con resolución firmada, y únicamente a TABS_PROPIETARIO */
function puedeVerSolicitud(sol) {
  if (USUARIO.rol === 'PR') return (USUARIO.predios || []).includes(sol.predioId) && !!sol.resolucion;
  return USUARIO.rol !== 'CO';
}
function puedeVerProyecto(pry) {
  return pry.consultorId === USUARIO.id || pry.propietarioId === USUARIO.id;
}

/* ---------- Tickets: autorización del propietario al consultor ---------- */
const ticket = id => DB.tickets.find(t => t.id === id);
const ticketVigente = t => !!t && !t.revocado && hoyISO() <= t.vence;
/* Tickets ya canjeados y vigentes de un consultor para un predio, del plazo más largo al más corto */
const ticketsDeAcceso = (consultorId, pid) => DB.tickets.filter(t => t.consultorId === consultorId && t.predioId === pid && t.canjeado && ticketVigente(t)).sort((a, b) => b.vence.localeCompare(a.vence));
/* El que autoriza a ver la ficha: se prefiere el que aún puede abrir un proyecto */
function ticketDeAcceso(consultorId, pid) {
  const l = ticketsDeAcceso(consultorId, pid);
  return l.find(t => !t.proyectoId) || l[0] || null;
}
const ticketDeProyecto = pry => ticketsDeAcceso(pry.consultorId, pry.predioId)[0] || ticket(pry.ticketId) || null;
const estadoTicket = t => t.revocado ? { nombre: 'Revocado', color: 'bad' } : !ticketVigente(t) ? { nombre: 'Vencido', color: 'bad' } : t.canjeado ? { nombre: 'En uso', color: 'ok' } : { nombre: 'Por usar', color: 'info' };

function generarCodigoTicket() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (I, O, 0, 1)
  let c;
  do {
    const b = Array.from(crypto.getRandomValues(new Uint8Array(8)), x => A[x % A.length]).join('');
    c = `TK-${b.slice(0, 4)}-${b.slice(4)}`;
  } while (DB.tickets.some(t => t.codigo === c));
  return c;
}
function crearTicket(predioId, consultorId, vence, nota = '') {
  DB.seq.tk = (DB.seq.tk || 0) + 1;
  const t = { id: `T${DB.seq.tk}`, codigo: generarCodigoTicket(), predioId, propietarioId: USUARIO.id, consultorId, vence, nota, creado: new Date().toISOString(), canjeado: null, proyectoId: null };
  DB.tickets.push(t);
  guardar();
  return t;
}
/* El consultor ingresa el código. Si tiene un proyecto abierto en ese predio, el ticket nuevo lo reactiva. */
function canjearTicket(codigo) {
  const c = String(codigo || '').trim().toUpperCase();
  const t = DB.tickets.find(x => x.codigo === c);
  if (!t) return { error: 'El código no existe. Revise que esté bien escrito.' };
  if (t.consultorId !== USUARIO.id) return { error: 'Este código fue emitido para otro consultor.' };
  if (t.revocado) return { error: 'El propietario revocó este código. Solicítele un nuevo ticket.' };
  if (!ticketVigente(t)) return { error: `Este código venció el ${fmtFecha(t.vence)}. Solicite un nuevo ticket al propietario.` };
  if (t.canjeado) return { error: 'Este código ya fue utilizado.', ticket: t };
  const pry = DB.proyectos.find(x => x.consultorId === USUARIO.id && x.predioId === t.predioId && x.etapa !== 'enviado');
  const estabaCongelado = !!pry && proyectoCongelado(pry);
  t.canjeado = new Date().toISOString();
  if (pry) {
    pry.ticketId = t.id; t.proyectoId = pry.id;
    registrar(pry, estabaCongelado ? 'Proyecto reactivado con un nuevo ticket' : 'Plazo ampliado con un nuevo ticket', `Vigente hasta ${fmtFecha(t.vence)}`);
  }
  guardar();
  return { ticket: t, proyecto: pry || null };
}
/* El propietario retira la autorización: efecto inmediato sobre la ficha y el proyecto del consultor */
function revocarTicket(t) {
  if (t.propietarioId !== USUARIO.id || !ticketVigente(t)) return false;
  t.revocado = new Date().toISOString();
  const pry = proyecto(t.proyectoId);
  if (pry && pry.etapa !== 'enviado') registrar(pry, 'Ticket revocado por el propietario', `${t.codigo}${proyectoCongelado(pry) ? ' · proyecto congelado' : ''}`);
  guardar();
  return true;
}

/* ---------- Proyectos de plan de manejo (previos al ingreso a CONAF) ---------- */
const ETAPAS_PROYECTO = {
  elaboracion: { nombre: 'En elaboración', color: 'info' },
  revision: { nombre: 'En revisión del propietario', color: 'accent' },
  enviado: { nombre: 'Enviado a CONAF', color: 'ok' },
};
const proyecto = id => DB.proyectos.find(p => p.id === id);
/* Congelado: en elaboración y sin ticket vigente (vencido o revocado). Se reactiva solo con un ticket nuevo. */
const proyectoCongelado = pry => pry.etapa === 'elaboracion' && !ticketsDeAcceso(pry.consultorId, pry.predioId).length;
const puedeEditarProyecto = pry => pry.consultorId === USUARIO.id && pry.etapa === 'elaboracion' && !proyectoCongelado(pry);

/* Arma un proyecto copiando los datos de la ficha predial, del propietario y del consultor */
function armarProyecto(t) {
  const p = predio(t.predioId), pr = usuario(t.propietarioId), co = usuario(t.consultorId);
  DB.seq.pry = (DB.seq.pry || 0) + 1;
  const pry = { id: `PRY-${new Date().getFullYear()}-${String(DB.seq.pry).padStart(4, '0')}`, ...solicitudBase(), esProyecto: true, etapa: 'elaboracion',
    ticketId: t.id, propietarioId: pr.id, consultorId: co.id, predioId: p.id, oficina: oficinaDePredio(p), observacion: '', solicitudId: null };
  Object.assign(pry.interesado, pr.datos, { nombre: pr.nombre, comuna: pr.datos.comuna, representante: { ...pr.datos.representante } });
  Object.assign(pry.profesional, co.profesional);
  pry.pmfbn.interesado = { nombre: pr.nombre, rut: pr.datos.rut };
  pry.pmfbn.predio = { nombre: p.nombre, rol: p.rol, comuna: p.comuna, superficieTotal: p.supSIG, precipitacion: p.precipitacion };
  t.proyectoId = pry.id;
  return pry;
}
function crearProyecto(t) {
  if (t.consultorId !== USUARIO.id || !t.canjeado || !ticketVigente(t) || t.proyectoId) return null;
  const pry = armarProyecto(t);
  registrar(pry, 'Proyecto creado con los datos de la ficha predial', `Ticket ${t.codigo}, vigente hasta ${fmtFecha(t.vence)}`);
  DB.proyectos.push(pry);
  guardar();
  return pry;
}
function faltantesProyecto(pry) {
  const f = [];
  if (!pry.cartografia || !pry.cartografia.features.length) f.push('Cartografía del área a intervenir');
  CONTENIDOS_ART14.forEach(([l, t, fn]) => { if (l !== 'i' && !fn(pry.pmfbn, pry)) f.push(`${l}) ${t} (art. 14 D.S. 93)`); });
  return f;
}
function enviarAlPropietario(pry) {
  if (!puedeEditarProyecto(pry)) return false;
  pry.etapa = 'revision'; pry.observacion = '';
  registrar(pry, 'Proyecto enviado al propietario para su revisión');
  guardar();
  return true;
}
function devolverAlConsultor(pry, obs) {
  if (pry.propietarioId !== USUARIO.id || pry.etapa !== 'revision') return false;
  pry.etapa = 'elaboracion'; pry.observacion = obs;
  registrar(pry, 'Proyecto devuelto al consultor con observaciones', obs);
  guardar();
  return true;
}
/* El propietario conforme: nace la solicitud, en recepción de la secretaría técnica de la oficina del predio */
function enviarAConaf(pry) {
  if (pry.propietarioId !== USUARIO.id || pry.etapa !== 'revision') return null;
  const copia = JSON.parse(JSON.stringify(pry));
  const sol = nuevaSolicitudVacia();
  ['tipoPlan', 'predioId', 'oficina', 'interesado', 'profesional', 'pmfbn', 'cartografia', 'origenFormulario', 'pmfbnProyecto', 'pmfbnRevision'].forEach(k => { if (copia[k] !== undefined) sol[k] = copia[k]; });
  sol.origenProyecto = { proyectoId: pry.id, consultorId: pry.consultorId, propietarioId: pry.propietarioId };
  sol.historial = copia.historial;
  const p = predio(sol.predioId);
  if (p && copia.cursosPropuestos && !(p.cursos.features || []).length) p.cursos = copia.cursosPropuestos;
  registrar(sol, 'Plan enviado por el propietario para su ingreso a CONAF', `Proyecto ${pry.id} · ${sol.oficina}`);
  DB.solicitudes.push(sol);
  pry.etapa = 'enviado'; pry.solicitudId = sol.id;
  registrar(pry, 'Proyecto enviado a CONAF por el propietario', `Solicitud ${sol.id} · ${sol.oficina}`);
  guardar();
  return sol;
}

const CONCLUSION_TEC = { aprobar: 'Aprobar totalmente', parcial: 'Aprobar parcialmente (rechazar superficie objetada)', rechazar: 'Rechazar' };
const CONCLUSION_JUR = { favorable: 'Cumple requisitos legales', observaciones: 'Cumple con observaciones', desfavorable: 'No cumple requisitos legales' };
const RESUELVE = { aprueba: 'Aprueba el plan de manejo', parcial: 'Aprueba parcialmente y rechaza la superficie objetada', rechaza: 'Rechaza el plan de manejo' };
