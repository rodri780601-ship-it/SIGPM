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
  return {
    id: `PM-${y}-${String(DB.seq.sol).padStart(4, '0')}`, estado: 'recepcion', tipoPlan: 'PMF', predioId: null, fechaIngreso: null,
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

const CONCLUSION_TEC = { aprobar: 'Aprobar totalmente', parcial: 'Aprobar parcialmente (rechazar superficie objetada)', rechazar: 'Rechazar' };
const CONCLUSION_JUR = { favorable: 'Cumple requisitos legales', observaciones: 'Cumple con observaciones', desfavorable: 'No cumple requisitos legales' };
const RESUELVE = { aprueba: 'Aprueba el plan de manejo', parcial: 'Aprueba parcialmente y rechaza la superficie objetada', rechaza: 'Rechaza el plan de manejo' };
