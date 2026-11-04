/* =====================================================================
   SIGPM · Núcleo geoespacial
   - Sistemas de referencia usados en Chile
   - Lectura de cartografía (shapefile .zip, GeoJSON, KML)
   - Análisis normativo espacial automático (Ley 20.283, D.S. 82)
   - Ayudas de mapa (Leaflet)
   ===================================================================== */
const SRC = {
  'EPSG:4326':  { nombre: 'WGS 84 geográficas', def: '+proj=longlat +datum=WGS84 +no_defs' },
  'EPSG:32718': { nombre: 'WGS 84 / UTM 18S', def: '+proj=utm +zone=18 +south +datum=WGS84 +units=m +no_defs' },
  'EPSG:32719': { nombre: 'WGS 84 / UTM 19S', def: '+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs' },
  'EPSG:5362':  { nombre: 'SIRGAS-Chile 2002 / UTM 18S', def: '+proj=utm +zone=18 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
  'EPSG:5361':  { nombre: 'SIRGAS-Chile 2002 / UTM 19S', def: '+proj=utm +zone=19 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' },
  'EPSG:29188': { nombre: 'SAD69 / UTM 18S (aprox.)', def: '+proj=utm +zone=18 +south +ellps=aust_SA +towgs84=-57,1,-41,0,0,0,0 +units=m +no_defs' },
  'EPSG:24878': { nombre: 'PSAD56 / UTM 18S (aprox.)', def: '+proj=utm +zone=18 +south +ellps=intl +towgs84=-288,175,-376,0,0,0,0 +units=m +no_defs' },
};
function initProj() { Object.entries(SRC).forEach(([k, v]) => proj4.defs(k, v.def)); }

const toUTM = (lng, lat) => { const huso = lng < -72 ? 18 : 19; const [E, N] = proj4('EPSG:4326', 'EPSG:327' + huso, [lng, lat]); return { huso, E, N }; };
const haDe = f => round2(turf.area(f) / 1e4);

/* ---------- Lectura de archivos ---------- */
function parseKML(text) {
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const out = [];
  const pc = s => s.trim().split(/\s+/).map(t => t.split(',').slice(0, 2).map(Number)).filter(c => c.length === 2 && !c.some(isNaN));
  xml.querySelectorAll('Placemark').forEach(pm => {
    const props = {};
    const nm = pm.querySelector('name'); if (nm) props.name = nm.textContent.trim();
    pm.querySelectorAll('ExtendedData Data').forEach(d => { const v = d.querySelector('value'); props[d.getAttribute('name')] = v ? v.textContent : ''; });
    pm.querySelectorAll('ExtendedData SimpleData').forEach(d => { props[d.getAttribute('name')] = d.textContent; });
    const polys = [];
    pm.querySelectorAll('Polygon').forEach(pg => {
      const o = pg.querySelector('outerBoundaryIs coordinates'); if (!o) return;
      const rings = [pc(o.textContent)];
      pg.querySelectorAll('innerBoundaryIs coordinates').forEach(h => rings.push(pc(h.textContent)));
      polys.push(rings);
    });
    if (polys.length === 1) out.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: polys[0] } });
    else if (polys.length > 1) out.push({ type: 'Feature', properties: props, geometry: { type: 'MultiPolygon', coordinates: polys } });
    pm.querySelectorAll('LineString coordinates').forEach(l => out.push({ type: 'Feature', properties: { ...props }, geometry: { type: 'LineString', coordinates: pc(l.textContent) } }));
  });
  return { type: 'FeatureCollection', features: out };
}

async function leerCartografia(file) {
  const n = file.name.toLowerCase();
  let fc, crs = null;
  if (n.endsWith('.zip')) {
    if (typeof shp === 'undefined') throw new Error('No se cargó el lector de shapefile (shpjs). Revise la conexión.');
    let r = await shp(await file.arrayBuffer());
    if (Array.isArray(r)) r = { type: 'FeatureCollection', features: r.flatMap(x => x.features) };
    fc = r;
  } else if (n.endsWith('.kml')) fc = parseKML(await file.text());
  else if (n.endsWith('.geojson') || n.endsWith('.json')) {
    const j = JSON.parse(await file.text());
    if (j.crs && j.crs.properties && j.crs.properties.name) { const m = String(j.crs.properties.name).match(/(\d{4,5})/); if (m) crs = 'EPSG:' + m[1]; }
    fc = j.type === 'FeatureCollection' ? j : j.type === 'Feature' ? { type: 'FeatureCollection', features: [j] } : { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: j }] };
  } else throw new Error('Formato no soportado: use shapefile comprimido (.zip), GeoJSON o KML.');
  return { fc, crs };
}
function esProyectado(fc) { let p = false; turf.coordEach(fc, c => { if (Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) p = true; }); return p; }
function reproyectar(fc, epsg) { turf.coordEach(fc, c => { const [x, y] = proj4(epsg, 'EPSG:4326', [c[0], c[1]]); c[0] = +x.toFixed(7); c[1] = +y.toFixed(7); }); return fc; }
async function cargarCapa(file, epsgSel, tipo) {
  const { fc, crs } = await leerCartografia(file);
  let src = null;
  if (esProyectado(fc)) {
    src = epsgSel !== 'auto' ? epsgSel : (crs && SRC[crs] ? crs : null);
    if (!src) throw new Error('Las coordenadas están en metros y el archivo no declara su sistema de referencia. Indíquelo en «Sistema de coordenadas».');
    reproyectar(fc, src);
  }
  const re = tipo === 'linea' ? /LineString/ : /Polygon/;
  const feats = fc.features.filter(f => f && f.geometry && re.test(f.geometry.type));
  if (!feats.length) throw new Error(tipo === 'linea' ? 'El archivo no contiene líneas.' : 'El archivo no contiene polígonos.');
  return { fc: turf.featureCollection(feats), src: src || 'EPSG:4326' };
}

/* ---------- Análisis normativo espacial ---------- */
function rodalesConGeometria(sol) {
  const f = sol.pmfbn || {};
  const feats = (sol.cartografia && sol.cartografia.features) || [];
  return (f.rodales || []).map(r => {
    const g = feats.find(x => String(x.properties.rodal) === String(r.numero));
    return { ...r, geom: g || null, supSIG: g ? haDe(g) : 0 };
  });
}
function interHa(a, b) { try { const i = turf.intersect(a, b); return i ? turf.area(i) / 1e4 : 0; } catch (e) { return 0; } }

function analizarSolicitud(sol) {
  const pred = DB.predios.find(p => p.id === sol.predioId);
  const res = { alertas: [], porRodal: {}, auto: {}, capas: { exclusion: [], manejo: [], c200: [], glaciar: [] }, supSIG: 0, supDecl: 0, supObjetable: 0 };
  const add = (nivel, check, txt) => res.alertas.push({ nivel, check, txt });
  const rods = rodalesConGeometria(sol);
  res.supDecl = round2(sum(rods, 'superficie'));
  res.supSIG = round2(sum(rods, 'supSIG'));
  const region = pred ? pred.region : '';
  const austral = /araucan|los r[ií]os|los lagos|ays[eé]n|magallanes/i.test(region); // art. 5° D.S. 82
  const cursos = ((pred && pred.cursos && pred.cursos.features) || []).filter(c => !austral || c.properties.permanente || c.properties.seccion === 'cuerpo');
  const objetables = {}; // rodal -> ha objetable

  // T17 · Cartografía
  const sinGeom = rods.filter(r => !r.geom).map(r => r.numero);
  let fuera = 0;
  if (pred) rods.forEach(r => { if (r.geom) fuera += r.supSIG - interHa(r.geom, pred.geom); });
  const difSup = res.supDecl ? (res.supSIG - res.supDecl) / res.supDecl * 100 : 0;
  res.auto.T17 = sinGeom.length ? { estado: 'no_cumple', det: `Rodales sin polígono: ${sinGeom.join(', ')}` }
    : fuera > 0.1 ? { estado: 'no_cumple', det: `${fmt(fuera)} ha fuera del límite predial` }
    : Math.abs(difSup) > 5 ? { estado: 'observacion', det: `Superficie SIG ${fmt(res.supSIG)} ha difiere ${fmt(difSup, 1)} % de la declarada (${fmt(res.supDecl)} ha)` }
    : { estado: 'cumple', det: `Superficie SIG ${fmt(res.supSIG)} ha · declarada ${fmt(res.supDecl)} ha` };
  if (res.auto.T17.estado !== 'cumple') add(res.auto.T17.estado === 'no_cumple' ? 'bad' : 'warn', 'T17', res.auto.T17.det);

  // T1 · contenidos art. 14
  const faltan = CONTENIDOS_ART14.filter(([, , fn]) => !fn(sol.pmfbn || {}, sol)).map(([l, t]) => `${l}) ${t}`);
  res.auto.T1 = faltan.length ? { estado: 'no_cumple', det: 'Falta: ' + faltan.join('; ') } : { estado: 'cumple', det: 'Contiene las letras a) a i)' };
  if (faltan.length) add('bad', 'T1', 'Contenidos incompletos del art. 14 D.S. 93: ' + faltan.join('; '));

  // T6 · reforestación (art. 3° D.S. 93)
  const noInter = rods.filter(r => r.metodo && !(METODOS[r.metodo] || {}).intermedia);
  const supCorta = sum(noInter, 'superficie'), supRef = sum(noInter, r => r.reforestacion ? r.reforestacion.superficie : 0);
  res.auto.T6 = !noInter.length ? { estado: 'na', det: 'Solo cortas intermedias o sanitarias' }
    : supRef + 0.001 >= supCorta ? { estado: 'cumple', det: `Regeneración/reforestación ${fmt(supRef)} ha ≥ corta ${fmt(supCorta)} ha` }
    : { estado: 'no_cumple', det: `Regeneración/reforestación ${fmt(supRef)} ha < superficie de corta ${fmt(supCorta)} ha` };
  if (res.auto.T6.estado === 'no_cumple') add('bad', 'T6', res.auto.T6.det + ' (art. 3° D.S. 93)');

  // Por rodal
  const glaciares = DB.ref.glaciares.features, snaspe = DB.ref.snaspe.features, humedales = DB.ref.humedales.features, especies = DB.ref.especies.features;
  let cobMal = [], aguaMal = [], consSinJust = [], glac = [], esp = [], hum = [], pres = [];
  const justificacion = ((sol.pmfbn || {}).proteccion || {}).justificacionArt16;

  rods.forEach(r => {
    const pr = { numero: r.numero, supSIG: r.supSIG, exc: 0, man: 0, c200: 0, glaciar: 0, preserv: 0, humedal: 0, faja: 0, especies: [] };
    const cm = coberturaMinima({ tipo: r.tipoForestal, pendiente: +r.pendiente || 0, precipitacion: +((sol.pmfbn || {}).predio || {}).precipitacion || 0, region });
    pr.cobMin = cm.min; pr.cobArt = cm.art; pr.cobProp = +r.coberturaRemanente || 0;
    pr.okCob = pr.cobProp >= cm.min;
    if (!pr.okCob && r.metodo && r.metodo !== 'corta_obras') cobMal.push(`R${r.numero}: ${pr.cobProp}% < ${cm.min}%`);
    if (r.geom) {
      cursos.forEach(c => {
        const { exclusion, manejo } = anchosProteccion(c.properties.seccion, +r.pendiente || 0);
        try {
          if (exclusion) { const bE = turf.buffer(c, exclusion / 1000, { units: 'kilometers' }); pr.exc += interHa(r.geom, bE); res.capas.exclusion.push(bE); if (manejo) { const bM = turf.buffer(c, (exclusion + manejo) / 1000, { units: 'kilometers' }); pr.man += Math.max(0, interHa(r.geom, bM) - interHa(r.geom, bE)); res.capas.manejo.push(bM); } }
        } catch (e) { /* geometría degenerada */ }
      });
      ((pred && pred.cursos && pred.cursos.features) || []).forEach(c => {
        try { const b = turf.buffer(c, 0.2, { units: 'kilometers' }); pr.c200 = Math.max(pr.c200, interHa(r.geom, b)); res.capas.c200.push(b); } catch (e) { /* */ }
      });
      try {
      glaciares.forEach(g => { const b = turf.buffer(g, 0.5, { units: 'kilometers' }); pr.glaciar += interHa(r.geom, b); res.capas.glaciar.push(b); });
      snaspe.forEach(a => { pr.preserv += interHa(r.geom, a); });
      humedales.forEach(h => { pr.humedal += interHa(r.geom, h); const b = turf.buffer(h, 0.01, { units: 'kilometers' }); pr.faja += Math.max(0, interHa(r.geom, b) - interHa(r.geom, h)); });
      especies.forEach(e => {
        const d = turf.booleanPointInPolygon(e, r.geom) ? 0 : turf.pointToLineDistance(e, turf.polygonToLine(r.geom).type === 'Feature' ? turf.polygonToLine(r.geom) : turf.polygonToLine(r.geom).features[0], { units: 'meters' });
        if (d <= 50) pr.especies.push(`${e.properties.especie} (${e.properties.categoria})${d ? ` a ${fmt(d, 0)} m` : ''}`);
      });
      } catch (e) { console.warn('Análisis de capas de referencia', e); }
      ['exc', 'man', 'c200', 'glaciar', 'preserv', 'humedal', 'faja'].forEach(k => pr[k] = round2(pr[k]));
      if (pr.exc > 0.01 && !(r.metodo === 'corta_intermedia' || r.metodo === 'corta_seleccion' || r.metodo === 'corta_proteccion')) aguaMal.push(`R${r.numero}: ${fmt(pr.exc)} ha en zona de exclusión con «${(METODOS[r.metodo] || {}).nombre || '—'}»`);
      if ((pr.exc > 0.01 || pr.man > 0.01) && pr.cobProp < 50) aguaMal.push(`R${r.numero}: cobertura remanente ${pr.cobProp}% < 50% exigido en zonas de protección`);
      const enCons = pr.c200 > 0.01 || (+r.pendiente || 0) >= 45;
      pr.conservacion = enCons;
      if (enCons && !justificacion) consSinJust.push(`R${r.numero}`);
      if (pr.glaciar > 0.01) { glac.push(`R${r.numero}: ${fmt(pr.glaciar)} ha`); objetables[r.numero] = Math.max(objetables[r.numero] || 0, pr.glaciar); }
      if (pr.preserv > 0.01) { pres.push(`R${r.numero}: ${fmt(pr.preserv)} ha`); objetables[r.numero] = Math.max(objetables[r.numero] || 0, pr.preserv); }
      if (pr.humedal > 0.01) { hum.push(`R${r.numero}: ${fmt(pr.humedal)} ha dentro del humedal`); objetables[r.numero] = Math.max(objetables[r.numero] || 0, pr.humedal); }
      else if (pr.faja > 0.01 && pr.cobProp < 50) hum.push(`R${r.numero}: faja de 10 m con cobertura ${pr.cobProp}% < 50%`);
      if (pr.especies.length) esp.push(`R${r.numero}: ${pr.especies.join(', ')}`);
    }
    res.porRodal[r.numero] = pr;
  });

  const set = (id, estado, det, nivel, txtAlerta) => { res.auto[id] = { estado, det }; if (estado !== 'cumple' && estado !== 'na') add(nivel, id, txtAlerta || det); };
  set('T7', cobMal.length ? 'no_cumple' : 'cumple', cobMal.length ? cobMal.join('; ') : 'Todos los rodales cumplen la cobertura mínima', 'bad', 'Cobertura remanente bajo el mínimo D.S. 82: ' + cobMal.join('; '));
  set('T8', aguaMal.length ? 'no_cumple' : (cursos.length ? 'cumple' : 'na'), aguaMal.length ? aguaMal.join('; ') : (cursos.length ? 'Intervención compatible con las zonas de protección' : 'Sin cursos de agua aplicables en el predio'), 'bad');
  set('T9', consSinJust.length ? 'no_cumple' : (rods.some(r => (res.porRodal[r.numero] || {}).conservacion) ? 'cumple' : 'na'),
    consSinJust.length ? `Rodales con bosque de conservación y protección sin justificación del art. 16: ${consSinJust.join(', ')}` : 'Justificación técnica presente o no aplica', 'warn');
  set('T10', glac.length ? 'no_cumple' : 'cumple', glac.length ? 'Intervención a menos de 500 m de glaciar: ' + glac.join('; ') : 'Sin glaciares a menos de 500 m', 'bad', 'Prohibición art. 17 Ley 20.283 (500 m de glaciares): ' + glac.join('; '));
  set('T11', esp.length ? 'observacion' : 'cumple', esp.length ? 'Ejemplares en categoría de conservación dentro o a ≤ 50 m: ' + esp.join('; ') : 'Sin registros de especies en categoría', 'bad', 'Art. 19 Ley 20.283 — verificar en terreno y excluir ejemplares y hábitat: ' + esp.join('; '));
  set('T12', hum.length ? 'no_cumple' : 'cumple', hum.length ? hum.join('; ') : 'Sin humedales prioritarios/Ramsar comprometidos', 'bad');
  set('T13', pres.length ? 'no_cumple' : 'cumple', pres.length ? 'Superposición con área protegida (bosque de preservación): ' + pres.join('; ') : 'Sin superposición con áreas protegidas', 'bad', 'Bosque de preservación (art. 2° N° 4 Ley): requiere plan de manejo de preservación — ' + pres.join('; '));
  if (pres.length && sol.tipoPlan === 'PMP') res.auto.T13 = { estado: 'cumple', det: 'Plan de preservación presentado para área de preservación' };

  res.objetables = objetables;
  res.supObjetable = round2(Object.values(objetables).reduce((a, b) => a + b, 0));
  return res;
}

/* ---------- Mapas ---------- */
function capasBase() {
  return {
    'Satélite (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imágenes © Esri' }),
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }),
    'Topográfico': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenTopoMap (CC-BY-SA)' }),
  };
}
const MAPAS = [];
function nuevoMapa(el, base = 'Satélite (Esri)') {
  const map = L.map(el, { zoomControl: true });
  const bm = capasBase(); bm[base].addTo(map);
  const ctrl = L.control.layers(bm, {}, { collapsed: true }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  const coord = L.control({ position: 'bottomright' });
  coord.onAdd = () => { const d = L.DomUtil.create('div', 'coord-ctl'); d.textContent = 'UTM'; return d; };
  coord.addTo(map);
  map.on('mousemove', e => { const u = toUTM(e.latlng.lng, e.latlng.lat); coord.getContainer().textContent = `UTM ${u.huso}S E ${fmt(u.E, 0)} N ${fmt(u.N, 0)}`; });
  MAPAS.push(map);
  return { map, ctrl };
}
function limpiarMapas() { while (MAPAS.length) { try { MAPAS.pop().remove(); } catch (e) { /* */ } } }

function estiloRodal(f) { const t = TIPOS_FORESTALES[f.properties.tipoForestal] || {}; return { color: '#ffffff', weight: 1.4, fillColor: t.color || '#e8590c', fillOpacity: .55 }; }

/* Dibuja predio + cursos + área a intervenir + capas de referencia; devuelve grupo de capas */
function dibujarPredio(map, ctrl, pred, sol, opts = {}) {
  const grupos = {};
  grupos.predio = L.geoJSON(pred.geom, { style: { color: '#111', weight: 3, fill: false }, interactive: false }).addTo(map);
  grupos.cursos = L.geoJSON(pred.cursos, {
    style: f => ({ color: '#1c7ed6', weight: f.properties.seccion === 'mayor05' ? 4 : 2.5, dashArray: f.properties.permanente ? null : '4 4' }),
    onEachFeature: (f, l) => l.bindTooltip(`${esc(f.properties.nombre || 'Curso de agua')} · sección ${({ menor02: '< 0,2', entre02y05: '0,2–0,5', mayor05: '> 0,5', cuerpo: 'cuerpo de agua' })[f.properties.seccion] || '?'} m² · ${f.properties.permanente ? 'permanente' : 'no permanente'}`),
  }).addTo(map);
  ctrl.addOverlay(grupos.predio, 'Límite predial'); ctrl.addOverlay(grupos.cursos, 'Cursos de agua');
  // referencias
  grupos.snaspe = L.geoJSON(DB.ref.snaspe, { style: { color: '#2b8a3e', weight: 2, dashArray: '6 4', fillOpacity: .08 }, onEachFeature: (f, l) => l.bindTooltip(esc(f.properties.nombre)) }).addTo(map);
  grupos.humedales = L.geoJSON(DB.ref.humedales, { style: { color: '#0b7285', weight: 2, fillColor: '#66d9e8', fillOpacity: .35 }, onEachFeature: (f, l) => l.bindTooltip(esc(f.properties.nombre)) }).addTo(map);
  grupos.glaciares = L.geoJSON(DB.ref.glaciares, { style: { color: '#74c0fc', weight: 2, fillColor: '#e7f5ff', fillOpacity: .8 }, onEachFeature: (f, l) => l.bindTooltip(esc(f.properties.nombre)) }).addTo(map);
  grupos.especies = L.geoJSON(DB.ref.especies, { pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 6, color: '#fff', weight: 2, fillColor: '#ae3ec9', fillOpacity: 1 }), onEachFeature: (f, l) => l.bindTooltip(`${esc(f.properties.especie)} · ${esc(f.properties.categoria)}`) }).addTo(map);
  ctrl.addOverlay(grupos.snaspe, 'Áreas protegidas (ref.)'); ctrl.addOverlay(grupos.humedales, 'Humedales prioritarios/Ramsar (ref.)');
  ctrl.addOverlay(grupos.glaciares, 'Glaciares (ref.)'); ctrl.addOverlay(grupos.especies, 'Especies en categoría (ref.)');
  if (sol && sol.cartografia && sol.cartografia.features && sol.cartografia.features.length) {
    const rodTipo = {}; ((sol.pmfbn || {}).rodales || []).forEach(r => rodTipo[r.numero] = r);
    const fc = turf.featureCollection(sol.cartografia.features.map(f => turf.feature(f.geometry, { ...f.properties, tipoForestal: (rodTipo[f.properties.rodal] || {}).tipoForestal })));
    grupos.area = L.geoJSON(fc, {
      style: f => {
        const s = estiloRodal(f);
        if (opts.decisiones && opts.decisiones[f.properties.rodal] && opts.decisiones[f.properties.rodal].decision === 'objetar') { s.fillColor = '#c92a2a'; s.fillOpacity = .45; s.dashArray = '5 4'; }
        return s;
      },
      onEachFeature: (f, l) => {
        const r = rodTipo[f.properties.rodal] || {};
        l.bindTooltip(`R${esc(f.properties.rodal)}`, { permanent: true, direction: 'center', className: 'rod-label' });
        l.bindPopup(`<b>Rodal ${esc(f.properties.rodal)}</b><br>${esc((TIPOS_FORESTALES[r.tipoForestal] || {}).nombre || '—')}<br>${esc((METODOS[r.metodo] || {}).nombre || '—')}<br>Sup. declarada ${fmt(r.superficie)} ha · SIG ${fmt(haDe(f))} ha<br>Pendiente ${r.pendiente ?? '—'} % · cobertura remanente ${r.coberturaRemanente ?? '—'} %`);
      },
    }).addTo(map);
    ctrl.addOverlay(grupos.area, 'Área a intervenir (rodales)');
  }
  if (opts.analisis) {
    const a = opts.analisis;
    const fcOf = arr => turf.featureCollection(arr);
    grupos.c200 = L.geoJSON(fcOf(a.capas.c200), { style: { color: '#4dabf7', weight: 1, dashArray: '3 4', fillColor: '#4dabf7', fillOpacity: .06 }, interactive: false });
    grupos.manejo = L.geoJSON(fcOf(a.capas.manejo), { style: { color: '#f08c00', weight: 1, fillColor: '#ffa94d', fillOpacity: .35 }, interactive: false }).addTo(map);
    grupos.exclusion = L.geoJSON(fcOf(a.capas.exclusion), { style: { color: '#e03131', weight: 1, fillColor: '#ff6b6b', fillOpacity: .55 }, interactive: false }).addTo(map);
    grupos.glaciarBuf = L.geoJSON(fcOf(a.capas.glaciar), { style: { color: '#228be6', weight: 1.5, dashArray: '8 5', fill: false }, interactive: false }).addTo(map);
    ctrl.addOverlay(grupos.exclusion, 'Zona de exclusión (D.S. 82)'); ctrl.addOverlay(grupos.manejo, 'Zona de manejo limitado (D.S. 82)');
    ctrl.addOverlay(grupos.c200, 'Franja 200 m (bosque de protección)'); ctrl.addOverlay(grupos.glaciarBuf, 'Franja 500 m glaciares (art. 17)');
    grupos.cursos.bringToFront();
  }
  map.fitBounds((grupos.area || grupos.predio).getBounds().extend(grupos.predio.getBounds()), { padding: [20, 20] });
  return grupos;
}
