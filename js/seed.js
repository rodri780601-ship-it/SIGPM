/* =====================================================================
   SIGPM · Datos de demostración (FICTICIOS)
   Ningún predio, persona, RUT, resolución ni capa de referencia
   corresponde a la realidad. Las geometrías se generan con semilla fija.
   ===================================================================== */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function poligonoIrregular(rnd, lat, lng, ha) {
  const r = Math.sqrt(ha * 1e4 / Math.PI), nV = 14, rad = [];
  for (let i = 0; i < nV; i++) rad.push(0.75 + rnd() * 0.45);
  const sm = rad.map((v, i) => (rad[(i + nV - 1) % nV] + 2 * v + rad[(i + 1) % nV]) / 4);
  const st = 0.8 + rnd() * 0.4, rot = rnd() * Math.PI, mLat = 111320, mLng = 111320 * Math.cos(lat * Math.PI / 180);
  const ring = [];
  for (let i = 0; i < nV; i++) {
    const a = i / nV * 2 * Math.PI, x = Math.cos(a) * r * sm[i] * st, y = Math.sin(a) * r * sm[i] / st;
    ring.push([+(lng + (x * Math.cos(rot) - y * Math.sin(rot)) / mLng).toFixed(6), +(lat + (x * Math.sin(rot) + y * Math.cos(rot)) / mLat).toFixed(6)]);
  }
  ring.push(ring[0]);
  let p = turf.polygon([ring]);
  p = turf.transformScale(p, Math.sqrt(ha * 1e4 / turf.area(p)), { origin: [lng, lat] });
  p.geometry.coordinates[0] = p.geometry.coordinates[0].map(c => [+c[0].toFixed(6), +c[1].toFixed(6)]);
  return p;
}
function celdas(rnd, poly, n) {
  const bb = turf.bbox(poly), pts = [];
  let g = 0;
  while (pts.length < n && g++ < 4000) { const p = [bb[0] + rnd() * (bb[2] - bb[0]), bb[1] + rnd() * (bb[3] - bb[1])]; if (turf.booleanPointInPolygon(p, poly)) pts.push(turf.point(p)); }
  const v = turf.voronoi(turf.featureCollection(pts), { bbox: [bb[0] - .01, bb[1] - .01, bb[2] + .01, bb[3] + .01] });
  const out = [];
  v.features.forEach((c, i) => { if (!c) return; const it = turf.intersect(c, poly); if (it && turf.area(it) > 20000) out.push({ g: it, s: pts[i].geometry.coordinates }); });
  out.sort((a, b) => (b.s[1] - a.s[1]) || (a.s[0] - b.s[0]));
  return out.map(o => { o.g.geometry.coordinates = JSON.parse(JSON.stringify(o.g.geometry.coordinates), (k, x) => typeof x === 'number' ? +x.toFixed(6) : x); return o.g; });
}
function cursoQueCruza(rnd, poly, props) {
  const bb = turf.bbox(poly), y0 = bb[1] + (0.25 + rnd() * 0.5) * (bb[3] - bb[1]), pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const x = bb[0] - .004 + i / n * (bb[2] - bb[0] + .008);
    pts.push([+x.toFixed(6), +(y0 + (rnd() - .5) * (bb[3] - bb[1]) * 0.25 + (i / n - .5) * (bb[3] - bb[1]) * (rnd() - .5) * .6).toFixed(6)]);
  }
  return turf.lineString(pts, props);
}
function puntoDesplazado(poly, distKm, bearing) {
  const c = turf.centroid(poly), far = turf.destination(c, 50, bearing);
  const line = turf.lineString([c.geometry.coordinates, far.geometry.coordinates]);
  const inter = turf.lineIntersect(line, turf.polygonToLine(poly));
  const edge = inter.features.length ? inter.features[0] : c;
  return turf.destination(edge, distKm, bearing);
}

const PREDIOS_SEED = [
  { id: 'P01', nombre: 'FUNDO LOS ULMOS', rol: '231-45', comuna: 'Valdivia', c: [-39.920, -73.100], ha: 520, n: 9, pp: 2100, tipos: ['SV', 'RRC', 'SV', 'CRT'] },
  { id: 'P02', nombre: 'HIJUELA CUESTA ALERCE', rol: '412-18', comuna: 'Corral', c: [-39.985, -73.300], ha: 380, n: 7, pp: 2400, tipos: ['SV', 'ALE', 'SV'] },
  { id: 'P03', nombre: 'PREDIO SANTA ELVIRA', rol: '57-210', comuna: 'Mariquina', c: [-39.550, -72.950], ha: 300, n: 6, pp: 1800, tipos: ['RRC', 'RRC', 'SV'] },
  { id: 'P04', nombre: 'FUNDO CHOSHUENCO ALTO', rol: '118-7', comuna: 'Panguipulli', c: [-39.870, -72.060], ha: 1200, n: 10, pp: 2600, tipos: ['CRT', 'LEN', 'CRT', 'RRC'] },
  { id: 'P05', nombre: 'FUNDO LLANCAHUE', rol: '96-130', comuna: 'Los Lagos', c: [-39.830, -72.550], ha: 650, n: 8, pp: 1900, tipos: ['RRC', 'CRT', 'SV'] },
  { id: 'P06', nombre: 'LOTE 4 PICHIRROPULLI', rol: '305-22', comuna: 'Paillaco', c: [-40.030, -72.850], ha: 260, n: 5, pp: 1700, tipos: ['RRC', 'SV'] },
  { id: 'P07', nombre: 'FUNDO EL MAITÉN', rol: '78-301', comuna: 'Máfil', c: [-39.670, -72.930], ha: 410, n: 7, pp: 1750, tipos: ['RRC', 'RRC', 'SV'] },
  { id: 'P08', nombre: 'PARCELA 12 MALALHUE', rol: '144-12', comuna: 'Lanco', c: [-39.450, -72.700], ha: 90, n: 4, pp: 1650, tipos: ['RRC'] },
  { id: 'P09', nombre: 'FUNDO LOS ULMOS BAJO', rol: '231-46', comuna: 'Valdivia', c: [-39.965, -73.020], ha: 240, n: 5, pp: 2050, tipos: ['RRC', 'SV'] },
];
const NOMBRES_ESTERO = ['Los Ulmos', 'El Alerce', 'Santa Elvira', 'Choshuenco', 'Llancahue', 'Pichirropulli', 'El Maitén', 'Malalhue', 'Los Ulmos Bajo'];
const ESPECIES_TF = {
  RRC: 'Nothofagus obliqua, N. alpina, N. dombeyi', CRT: 'N. dombeyi, N. alpina, Laureliopsis philippiana', SV: 'Eucryphia cordifolia, Drimys winteri, Aextoxicon punctatum',
  LEN: 'Nothofagus pumilio', ALE: 'Fitzroya cupressoides, Nothofagus nitida', ROH: 'N. glauca, N. obliqua', ESC: 'Quillaja saponaria, Lithraea caustica',
};

function predioSemilla(c, k) {
  const rnd = mulberry32(1000 + k * 97);
  const geom = poligonoIrregular(rnd, c.c[0], c.c[1], c.ha);
  const cursos = turf.featureCollection([
    cursoQueCruza(rnd, geom, { nombre: 'Estero ' + NOMBRES_ESTERO[k], seccion: k % 3 === 0 ? 'mayor05' : 'entre02y05', permanente: true }),
  ]);
  if (k % 2 === 0) cursos.features.push(cursoQueCruza(rnd, turf.transformRotate(geom, 90), { nombre: 'Quebrada sin nombre', seccion: 'menor02', permanente: false }));
  const cells = celdas(rnd, geom, c.n);
  return { id: c.id, nombre: c.nombre, rol: c.rol, region: 'Los Ríos', provincia: 'Valdivia', comuna: c.comuna, geom: turf.feature(geom.geometry, {}),
    supSIG: haDe(geom), precipitacion: c.pp, cursos, celdas: cells.map((g, i) => turf.feature(g.geometry, { rodal: i + 1, tipo: c.tipos[i % c.tipos.length] })),
    cbr: { fojas: 200 + k * 131, numero: 300 + k * 87, anio: 1998 + k * 2, conservador: c.comuna === 'Corral' ? 'Valdivia' : c.comuna } };
}

/* Ejemplos del portal externo: un ticket por usar y un proyecto congelado por ticket vencido */
function semillaExterna() {
  DB.tickets = []; DB.proyectos = []; DB.seq.tk = 2; DB.seq.pry = 0;
  const hoy = hoyISO(), ahora = new Date().toISOString();
  DB.tickets.push({ id: 'T1', codigo: 'TK-ULMS-7K2Q', predioId: 'P09', propietarioId: 'pr1', consultorId: 'co1', vence: sumarDias(hoy, 30), nota: 'Plan de manejo para el rodal norte.', creado: ahora, canjeado: null, proyectoId: null });
  const t2 = { id: 'T2', codigo: 'TK-VERA-4M9P', predioId: 'P02', propietarioId: 'pr2', consultorId: 'co1', vence: sumarDias(hoy, -5), nota: '', creado: sumarDias(hoy, -35) + 'T09:00:00', canjeado: sumarDias(hoy, -34) + 'T10:00:00', proyectoId: null };
  DB.tickets.push(t2);
  const pry = armarProyecto(t2);
  pry.creada = t2.canjeado;
  pry.historial.push({ fecha: sumarDias(hoy, -34) + 'T10:05:00', usuario: 'co1', rol: 'CO', accion: 'Proyecto creado con los datos de la ficha predial', detalle: `Ticket ${t2.codigo}, vigente hasta ${fmtFecha(t2.vence)}` });
  DB.proyectos.push(pry);
}
/* Actualiza los datos ya guardados en el navegador sin perder los cambios del usuario */
function migrarDatos() {
  PREDIOS_SEED.forEach((c, k) => { if (!predio(c.id)) DB.predios.push(predioSemilla(c, k)); });
  if (!DB.tickets) { semillaExterna(); guardar(); }
}

function generarSemilla() {
  const db = { version: 1, seq: { sol: 0, res: 0 }, predios: [], solicitudes: [], ref: {} };
  // ---- Predios ----
  PREDIOS_SEED.forEach((c, k) => db.predios.push(predioSemilla(c, k)));
  const P = id => db.predios.find(p => p.id === id);
  // ---- Capas de referencia (ficticias) ----
  const gl = puntoDesplazado(P('P04').geom, 0.8, 100);
  db.ref.glaciares = turf.featureCollection([turf.feature(turf.circle(gl, 0.6, { steps: 24, units: 'kilometers' }).geometry, { nombre: 'Glaciar (referencial ficticio)' })]);
  const sn = puntoDesplazado(P('P05').geom, 0.6, 210);
  db.ref.snaspe = turf.featureCollection([turf.feature(turf.circle(sn, 1.2, { steps: 32, units: 'kilometers' }).geometry, { nombre: 'Reserva Nacional (referencial ficticia)', tipo: 'SNASPE' })]);
  const hu = puntoDesplazado(P('P03').geom, 0.15, 300);
  db.ref.humedales = turf.featureCollection([turf.feature(turf.circle(hu, 0.35, { steps: 24, units: 'kilometers' }).geometry, { nombre: 'Humedal sitio prioritario (referencial ficticio)' })]);
  const c2 = P('P02').celdas.find(f => f.properties.tipo === 'ALE') || P('P02').celdas[1];
  const e1 = turf.pointOnFeature(c2), e2 = turf.destination(e1, 0.08, 45);
  db.ref.especies = turf.featureCollection([
    turf.point(e1.geometry.coordinates, { especie: 'Fitzroya cupressoides (alerce)', categoria: 'En peligro' }),
    turf.point(e2.geometry.coordinates, { especie: 'Pilgerodendron uviferum (ciprés de las Guaitecas)', categoria: 'Vulnerable' }),
  ]);

  // ---- Solicitudes ----
  const hoy = hoyISO();
  const hace = n => restarHabiles(hoy, n);
  let solN = 0;
  const mkSol = (cfg) => {
    solN++;
    const p = P(cfg.predio);
    const y = +cfg.ingreso.slice(0, 4);
    const sol = {
      id: `PM-${y}-${String(solN).padStart(4, '0')}`, estado: cfg.estado, tipoPlan: cfg.tipoPlan || 'PMF', predioId: p.id, fechaIngreso: cfg.estado === 'recepcion' ? null : cfg.ingreso,
      oficina: 'Oficina Provincial Valdivia', creada: cfg.ingreso + 'T09:30:00',
      interesado: cfg.interesado, profesional: cfg.profesional || { nombre: 'Ignacio Fuentes Paredes', rut: fmtRut(14523876), titulo: 'Ingeniero forestal', universidad: 'Universidad Austral de Chile', semestres: 11, postitulo: false },
      documentos: {}, origenFormulario: cfg.externo ? 'externo' : 'interno', asignacion: null,
      tecnico: { estado: 'pendiente', checks: {}, rodales: {}, conclusion: '', informe: '', visita: { fecha: '', obs: '' } },
      juridico: { estado: 'pendiente', checks: {}, conclusion: '', informe: '' }, revisionJA: null, resolucion: null, notificacion: null, requerimientos: [], historial: [],
    };
    // Rodales y cartografía
    const sel = cfg.rodales.map(i => p.celdas[i - 1]).filter(Boolean);
    const rnd = mulberry32(solN * 313);
    sol.cartografia = turf.featureCollection(sel.map(f => turf.feature(f.geometry, { rodal: f.properties.rodal })));
    sol.pmfbn = plantillaPMFBN();
    sol.pmfbn.origen = cfg.externo ? 'externo' : 'interno';
    sol.pmfbn.interesado = { nombre: cfg.interesado.nombre, rut: cfg.interesado.rut };
    sol.pmfbn.predio = { nombre: p.nombre, rol: p.rol, comuna: p.comuna, superficieTotal: round2(p.supSIG * 1.01), precipitacion: p.precipitacion };
    sol.pmfbn.objetivo = { general: cfg.objetivo || 'produccion_maderera', descripcion: cfg.objDesc || 'Mejorar la calidad y el crecimiento del renoval mediante raleo, favoreciendo individuos de buena forma y sanidad.' };
    sol.pmfbn.rodales = sel.map((f, i) => {
      const tf = f.properties.tipo, met = (cfg.metodos && cfg.metodos[i]) || (tf === 'SV' ? 'corta_seleccion' : 'corta_intermedia');
      const sup = round2(haDe(f) * (0.98 + rnd() * 0.04));
      const inter = (METODOS[met] || {}).intermedia;
      return { numero: f.properties.rodal, tipoForestal: tf, estructura: tf === 'SV' ? 'Adulto-renoval' : 'Renoval', superficie: sup, pendiente: (cfg.pend && cfg.pend[i]) ?? Math.round(8 + rnd() * 30),
        densidad: Math.round(900 + rnd() * 900), areaBasal: round2(30 + rnd() * 25), volumen: Math.round(180 + rnd() * 220), especies: ESPECIES_TF[tf] || '',
        metodo: met, extraccionAB: inter ? 30 + Math.round(rnd() * 8) : 35, coberturaRemanente: (cfg.cob && cfg.cob[i]) ?? (62 + Math.round(rnd() * 8)), anioCorta: new Date().getFullYear() + 1 + (i % 2),
        reforestacion: inter ? { tipo: 'no_aplica', superficie: 0, especie: '', densidad: '', anio: '' } : { tipo: 'regeneracion_natural', superficie: sup, especie: ESPECIES_TF[tf] ? ESPECIES_TF[tf].split(',')[0] : '', densidad: 3000, anio: new Date().getFullYear() + 2 } };
    });
    sol.pmfbn.prescripciones = { criterioCorta: 'Se extraen árboles dominados, suprimidos y de mala forma o sanidad; se mantienen los mejores individuos de especies principales distribuidos homogéneamente.', madereo: 'tractor', caminosKm: cfg.caminos || 0, pendienteMaxCaminos: 12 };
    sol.pmfbn.proteccion = { zonasDemarcadas: true, residuos3cm: true, prevencionIncendios: true, plagas: true, sinCaminosZonas: true, justificacionArt16: cfg.just === false ? '' : 'En franjas a menos de 200 m de cursos de agua y pendientes mayores se aplica corta de baja intensidad, madereo con huinche y se mantiene cobertura mínima de 60 %.' };
    sol.pmfbn.firmas = { interesado: true, profesional: true };
    // Documentos
    documentosRequeridos(sol).forEach(d => {
      const f = d.vence === 'dominio' ? restarHabiles(cfg.ingreso, 40) : d.vence === 'personeria' ? isoDe(new Date(fechaDe(cfg.ingreso).getTime() - 20 * 864e5)) : cfg.ingreso;
      sol.documentos[d.key] = { presentado: !(cfg.faltan || []).includes(d.key), fecha: f, obs: '', ...(d.vence ? { recepcion: cfg.ingreso } : {}) };
    });
    if (cfg.domVencido) sol.documentos.dominio.fecha = restarHabiles(cfg.ingreso, 160);
    const H = (iso, u, accion, det = '') => sol.historial.push({ fecha: iso + 'T10:' + pad(10 + sol.historial.length) + ':00', usuario: u, rol: usuario(u).rol, accion, detalle: det });
    H(cfg.ingreso, 'st1', cfg.estado === 'recepcion' ? 'Solicitud en recepción' : 'Solicitud ingresada', cfg.estado === 'recepcion' ? '' : 'Plazo legal de 90 días hábiles (art. 8° Ley 20.283)');
    cfg.post && cfg.post(sol, H, p);
    db.solicitudes.push(sol);
    return sol;
  };
  const autoChecks = (sol, estado) => { const o = {}; PAUTA_TECNICA.forEach(c => o[c.id] = { estado: estado[c.id] || 'cumple', obs: '' }); return o; };
  const jurChecks = (sol, excepto = {}) => { const o = {}; PAUTA_JURIDICA.forEach(c => o[c.id] = { estado: (c.aplica && !c.aplica(sol)) ? 'na' : (excepto[c.id] || 'cumple'), obs: '' }); return o; };

  const natural = (nombre, rut, extra = {}) => ({ tipo: 'natural', calidad: 'propietario', nombre, rut: fmtRut(rut), domicilio: 'Camino rural s/n', comuna: '', email: 'contacto@ejemplo.cl', telefono: '+56 9 0000 0000', representante: { nombre: '', rut: '' }, pequenoPropietario: false, ...extra });
  const juridica = (nombre, rut, rep) => ({ tipo: 'juridica', calidad: 'propietario', nombre, rut: fmtRut(rut), domicilio: 'Av. Ramón Picarte 1200, Valdivia', comuna: 'Valdivia', email: 'gerencia@ejemplo.cl', telefono: '+56 63 200 0000', representante: { nombre: rep, rut: fmtRut(12876543) }, pequenoPropietario: false });

  // S1 · recepción (incompleta)
  mkSol({ predio: 'P06', estado: 'recepcion', ingreso: hoy, rodales: [1, 2, 3], interesado: natural('LUIS ALBERTO CARRASCO PINO', 11234567), faltan: ['dominio', 'titulo'] });
  // S2 · subsanación
  mkSol({ predio: 'P08', estado: 'subsanacion', ingreso: hace(4), rodales: [1, 2], interesado: natural('ROSA ELENA MANQUE HUENTÉN', 9876543, { pequenoPropietario: true }), domVencido: true,
    post: (s, H) => { s.requerimientos.push({ fecha: hace(2), plazo: sumarHabiles(hace(2), 5), detalle: 'Acompañar certificado de dominio vigente con antigüedad no superior a 120 días hábiles (art. 22 d) D.S. 93).', fechaRespuesta: null });
      H(hace(2), 'st1', 'Requerimiento de antecedentes (art. 31 Ley 19.880)', s.requerimientos[0].detalle); } });
  // S3 · por asignar
  mkSol({ predio: 'P07', estado: 'asignacion', ingreso: hace(3), rodales: [1, 2, 4, 5], externo: true, interesado: juridica('FORESTAL EL MAITÉN SPA', 76543210, 'CLAUDIA ROJAS ÁVILA') });
  // S4 · en evaluación (técnico en curso)
  mkSol({ predio: 'P01', estado: 'evaluacion', ingreso: hace(25), rodales: [2, 3, 5, 6], cob: [65, 50, 66, 64], interesado: juridica('AGRÍCOLA Y FORESTAL LOS ULMOS LTDA.', 77123456, 'HERNÁN SOLÍS VERA'),
    post: (s, H) => { s.asignacion = { analista: 'an1', abogado: 'ab1', fecha: hace(22), por: 'ja1' }; H(hace(22), 'ja1', 'Asignación', 'Analista: Camila Henríquez Soto · Abogado: Andrés Contreras Lagos');
      s.tecnico.estado = 'en_curso'; s.tecnico.visita = { fecha: hace(8), obs: 'Se recorren rodales 2 y 3. Renoval denso, buena regeneración.' }; H(hace(8), 'an1', 'Visita a terreno registrada'); } });
  // S5 · en evaluación (técnico enviado, jurídico pendiente) — glaciar
  mkSol({ predio: 'P04', estado: 'evaluacion', ingreso: hace(48), rodales: [3, 4, 6, 7, 8], interesado: juridica('INVERSIONES CORDILLERA DEL MOCHO S.A.', 76987654, 'PABLO URRUTIA KRAUSE'),
    post: (s, H) => { s.asignacion = { analista: 'an2', abogado: 'ab2', fecha: hace(45), por: 'ja1' }; H(hace(45), 'ja1', 'Asignación', 'Analista: Rodrigo Mansilla Ríos · Abogada: Francisca Barrientos Mora');
      s.tecnico = { estado: 'enviado', checks: {}, rodales: {}, conclusion: 'parcial', informe: '', visita: { fecha: hace(30), obs: 'Se verifica en terreno cercanía al frente glaciar en sector oriente.' }, fecha: hace(12), por: 'an2' };
      H(hace(12), 'an2', 'Informe técnico enviado al jefe analista', 'Conclusión: Aprobar parcialmente'); } });
  // S6 · revisión jefe analista — especies en categoría
  mkSol({ predio: 'P02', estado: 'revision', ingreso: hace(66), rodales: [1, 2, 3, 4], interesado: natural('JUAN CARLOS VERA OYARZO', 10456789),
    post: (s, H) => { s.asignacion = { analista: 'an3', abogado: 'ab1', fecha: hace(62), por: 'ja1' }; H(hace(62), 'ja1', 'Asignación', 'Analista: Valentina Oyarzún Leal · Abogado: Andrés Contreras Lagos');
      s.tecnico = { estado: 'enviado', checks: {}, rodales: {}, conclusion: 'parcial', informe: '', visita: { fecha: hace(40), obs: 'Se constatan ejemplares de alerce en el rodal indicado; se recomienda excluir el rodal.' }, fecha: hace(20), por: 'an3' };
      s.juridico = { estado: 'enviado', checks: jurChecks(s), conclusion: 'favorable', informe: 'El interesado acredita dominio vigente, identidad y habilitación del profesional. Cumple los requisitos legales de los arts. 21 y 22 del D.S. 93.', fecha: hace(15), por: 'ab1' };
      H(hace(20), 'an3', 'Informe técnico enviado al jefe analista', 'Conclusión: Aprobar parcialmente'); H(hace(15), 'ab1', 'Informe jurídico enviado al jefe analista', 'Conclusión: Cumple requisitos legales'); H(hace(15), 'ab1', 'Expediente completo en revisión del jefe analista'); } });
  // S7 · para firma — superposición con área protegida
  mkSol({ predio: 'P05', estado: 'firma', ingreso: hace(80), rodales: [1, 2, 4, 5, 7], interesado: juridica('FORESTAL LLANCAHUE SPA', 76111222, 'MARÍA JOSÉ PINTO LAGOS'),
    post: (s, H) => { s.asignacion = { analista: 'an1', abogado: 'ab2', fecha: hace(76), por: 'ja1' }; H(hace(76), 'ja1', 'Asignación', 'Analista: Camila Henríquez Soto · Abogada: Francisca Barrientos Mora');
      s.tecnico = { estado: 'enviado', checks: {}, rodales: {}, conclusion: 'parcial', informe: '', visita: { fecha: hace(50), obs: 'Límite con área protegida verificado con GPS.' }, fecha: hace(25), por: 'an1' };
      s.juridico = { estado: 'enviado', checks: jurChecks(s), conclusion: 'favorable', informe: 'Personería y vigencia de la sociedad acreditadas con documentos de menos de 90 días. Cumple requisitos legales.', fecha: hace(22), por: 'ab2' };
      H(hace(25), 'an1', 'Informe técnico enviado al jefe analista', 'Conclusión: Aprobar parcialmente'); H(hace(22), 'ab2', 'Informe jurídico enviado al jefe analista', 'Conclusión: Cumple requisitos legales'); } });
  // S8 · resuelta, por notificar (aprobada)
  mkSol({ predio: 'P03', estado: 'resuelta', ingreso: hace(70), rodales: [1, 2], interesado: natural('ELENA MARGARITA SCHULZ BECKER', 8765432),
    post: (s, H) => { s.asignacion = { analista: 'an2', abogado: 'ab1', fecha: hace(66), por: 'ja1' }; H(hace(66), 'ja1', 'Asignación');
      s.tecnico = { estado: 'enviado', checks: {}, rodales: {}, conclusion: 'aprobar', informe: '', visita: { fecha: hace(45), obs: 'Sin observaciones.' }, fecha: hace(30), por: 'an2' };
      s.juridico = { estado: 'enviado', checks: jurChecks(s), conclusion: 'favorable', informe: 'Cumple requisitos legales.', fecha: hace(28), por: 'ab1' }; } });
  // S9 · notificada (plan anterior aprobado en P01)
  mkSol({ predio: 'P01', estado: 'notificada', ingreso: '2025-03-10', rodales: [1, 4], interesado: juridica('AGRÍCOLA Y FORESTAL LOS ULMOS LTDA.', 77123456, 'HERNÁN SOLÍS VERA'),
    post: (s, H) => { s.asignacion = { analista: 'an1', abogado: 'ab1', fecha: '2025-03-12', por: 'ja1' };
      s.tecnico = { estado: 'enviado', checks: {}, rodales: {}, conclusion: 'aprobar', informe: '', visita: { fecha: '2025-04-10', obs: 'Sin observaciones.' }, fecha: '2025-05-02', por: 'an1' };
      s.juridico = { estado: 'enviado', checks: jurChecks(s), conclusion: 'favorable', informe: 'Cumple.', fecha: '2025-04-28', por: 'ab1' }; } });

  // Completar revisiones/resoluciones de los casos avanzados con el análisis espacial
  DB = db;
  db.solicitudes.forEach(s => {
    if (s.tecnico.estado !== 'enviado') return;
    const an = analizarSolicitud(s);
    const est = {}; Object.entries(an.auto).forEach(([k, v]) => est[k] = v.estado);
    s.tecnico.checks = autoChecks(s, est);
    (s.pmfbn.rodales || []).forEach(r => { const ob = an.objetables[r.numero]; s.tecnico.rodales[r.numero] = ob ? { decision: 'objetar', motivo: motivoObjecion(an, r.numero) } : { decision: 'aprobar', motivo: '' }; });
    s.tecnico.informe = s.tecnico.informe || borradorInformeTecnico(s, an);
    if (['firma', 'resuelta', 'notificada'].includes(s.estado)) {
      const pr = propuestaDesde(s);
      s.revisionJA = { ...pr, obs: 'Análisis técnico revisado y conforme.', fecha: s.estado === 'notificada' ? '2025-05-20' : restarHabiles(hoy, 10), por: 'ja1' };
      s.historial.push({ fecha: s.revisionJA.fecha + 'T12:00:00', usuario: 'ja1', rol: 'JA', accion: 'Análisis técnico conforme · proyecto de resolución enviado al jefe provincial', detalle: RESUELVE[pr.tipo] });
    }
    if (['resuelta', 'notificada'].includes(s.estado)) {
      db.seq.res++;
      const f = s.estado === 'notificada' ? '2025-06-03' : restarHabiles(hoy, 5);
      s.resolucion = { numero: `${db.seq.res}/${f.slice(0, 4)}`, fecha: f, tipo: s.revisionJA.tipo, supAprobada: s.revisionJA.supAprobada, supRechazada: s.revisionJA.supRechazada,
        rodalesAprobados: s.revisionJA.rodalesAprobados, rodalesObjetados: s.revisionJA.rodalesObjetados, firmadaPor: 'jp1', vigenciaHasta: s.revisionJA.vigenciaHasta };
      s.historial.push({ fecha: f + 'T16:00:00', usuario: 'jp1', rol: 'JP', accion: `Resolución N° ${s.resolucion.numero} firmada`, detalle: RESUELVE[s.resolucion.tipo] });
      if (s.estado === 'notificada') { s.notificacion = { fecha: '2025-06-09', medio: 'Carta certificada', numero: 'CC-1182', por: 'st1' }; s.historial.push({ fecha: '2025-06-09T11:00:00', usuario: 'st1', rol: 'ST', accion: 'Resolución notificada', detalle: 'Carta certificada N° CC-1182' }); }
    }
  });
  db.seq.sol = solN;
  semillaExterna();
  return db;
}
