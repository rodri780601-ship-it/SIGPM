/* =====================================================================
   SIGPM · Módulo del formulario PMFBN (Plan de Manejo Forestal de Bosque Nativo)
   ---------------------------------------------------------------------
   Este módulo es el punto de integración con el proyecto
   «Aplicación web de plan de manejo». Admite tres vías:
     1. Formulario interno (estructura del art. 14 D.S. 93).
     2. Importación del archivo JSON exportado por la aplicación externa.
     3. Apertura de la aplicación externa en /formulario-pmfbn/ (iframe),
        que devuelve los datos con window.parent.postMessage({ tipo: 'pmfbn:datos', datos }, '*').
   El contrato de datos está descrito en formulario-pmfbn/CONTRATO.md.
   ===================================================================== */
function plantillaPMFBN() {
  return {
    version: '1.0', origen: 'interno',
    interesado: { nombre: '', rut: '' },
    predio: { nombre: '', rol: '', comuna: '', superficieTotal: '', precipitacion: '' },
    objetivo: { general: '', descripcion: '' },
    rodales: [],
    prescripciones: { criterioCorta: '', madereo: 'tractor', caminosKm: 0, pendienteMaxCaminos: 12 },
    proteccion: { zonasDemarcadas: false, residuos3cm: false, prevencionIncendios: false, plagas: false, sinCaminosZonas: false, justificacionArt16: '' },
    firmas: { interesado: false, profesional: false },
  };
}
function rodalVacio(n) {
  return { numero: n, tipoForestal: 'RRC', estructura: 'Renoval', superficie: 0, pendiente: 0, densidad: '', areaBasal: '', volumen: '', especies: '',
    metodo: 'corta_intermedia', extraccionAB: 35, coberturaRemanente: 60, anioCorta: new Date().getFullYear() + 1,
    reforestacion: { tipo: 'regeneracion_natural', superficie: 0, especie: '', densidad: '', anio: '' } };
}

const OBJETIVOS = { produccion_maderera: 'Producción maderera', no_maderera: 'Producción no maderera', mixto: 'Uso múltiple (maderero y no maderero)', conservacion: 'Conservación y protección', obra: 'Corta para obra o cambio de uso', preservacion: 'Preservación' };
const ESTRUCTURAS = ['Renoval', 'Adulto', 'Adulto-renoval', 'Bosque achaparrado'];
const MADEREO = { tractor: 'Tractor / skidder', animal: 'Tracción animal', cable: 'Cable aéreo', huinche: 'Huinche' };

/* Normaliza un JSON externo al esquema interno (tolera nombres de campo alternativos) */
function normalizarPMFBN(j) {
  if (j && (j.formato === 'pmfbn-app' || (j.f && j.t && j.carto))) return desdeAppPMFBN(j.formato === 'pmfbn-app' ? j.proyecto : j, j.resumen || null, j.revision || null);
  const src = j.pmfbn || j.planManejo || j.datos || j;
  const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] !== undefined && o[k] !== '') return o[k]; return undefined; };
  const out = plantillaPMFBN();
  out.origen = 'externo';
  const it = src.interesado || src.propietario || {};
  out.interesado = { nombre: pick(it, 'nombre', 'razonSocial') || '', rut: pick(it, 'rut', 'RUT') || '' };
  const pr = src.predio || {};
  out.predio = { nombre: pick(pr, 'nombre', 'nombrePredio') || '', rol: pick(pr, 'rol', 'rolAvaluo') || '', comuna: pick(pr, 'comuna') || '',
    superficieTotal: +pick(pr, 'superficieTotal', 'superficie', 'sup_total') || '', precipitacion: +pick(pr, 'precipitacion', 'pp', 'precipitacionAnual') || '' };
  const ob = src.objetivo || src.objetivos || {};
  out.objetivo = { general: pick(ob, 'general', 'tipo') || (typeof ob === 'string' ? ob : ''), descripcion: pick(ob, 'descripcion', 'detalle') || '' };
  out.rodales = (src.rodales || src.rodal || []).map((r, i) => {
    const tf = String(pick(r, 'tipoForestal', 'tipo_forestal', 'tf') || 'RRC');
    const tfCode = TIPOS_FORESTALES[tf] ? tf : (Object.entries(TIPOS_FORESTALES).find(([, v]) => norm(v.nombre) === norm(tf)) || ['RRC'])[0];
    const ref = r.reforestacion || {};
    return { numero: pick(r, 'numero', 'rodal', 'n', 'id') || i + 1, tipoForestal: tfCode, estructura: pick(r, 'estructura') || 'Renoval',
      superficie: +pick(r, 'superficie', 'sup_ha', 'sup') || 0, pendiente: +pick(r, 'pendiente', 'pend') || 0,
      densidad: pick(r, 'densidad', 'arb_ha') || '', areaBasal: pick(r, 'areaBasal', 'ab', 'AB') || '', volumen: pick(r, 'volumen', 'vol') || '',
      especies: Array.isArray(r.especies) ? r.especies.join(', ') : (pick(r, 'especies') || ''),
      metodo: METODOS[pick(r, 'metodo', 'tratamiento')] ? pick(r, 'metodo', 'tratamiento') : 'corta_intermedia',
      extraccionAB: +pick(r, 'extraccionAB', 'intensidad') || 0, coberturaRemanente: +pick(r, 'coberturaRemanente', 'cobertura') || 0,
      anioCorta: +pick(r, 'anioCorta', 'anio', 'temporada') || '',
      reforestacion: { tipo: pick(ref, 'tipo') || 'regeneracion_natural', superficie: +pick(ref, 'superficie') || 0, especie: pick(ref, 'especie') || '', densidad: pick(ref, 'densidad') || '', anio: pick(ref, 'anio') || '' } };
  });
  Object.assign(out.prescripciones, src.prescripciones || {});
  Object.assign(out.proteccion, src.proteccion || src.medidasProteccion || {});
  Object.assign(out.firmas, src.firmas || {});
  const carto = src.cartografia || j.cartografia;
  const ins = pr.inscripcion || pr.cbr || {};
  const cbr = { fojas: String(pick(ins, 'fojas') ?? ''), numero: String(pick(ins, 'numero', 'num', 'n') ?? ''), anio: String(pick(ins, 'anio', 'año') ?? ''), conservador: pick(ins, 'conservador', 'cbr') || '' };
  return { pmfbn: out, cartografia: carto && carto.type === 'FeatureCollection' ? carto : null,
    limite: limiteDe(pick(pr, 'limite', 'limitePredial', 'geometria') || src.limitePredial || j.limitePredial), extra: { cbr } };
}
/* Une los polígonos de un límite predial (Feature, FeatureCollection o geometría en WGS 84). Devuelve un Feature o null. */
function limiteDe(x) {
  if (!x || typeof x !== 'object') return null;
  const feats = x.type === 'FeatureCollection' ? x.features : x.type === 'Feature' ? [x] : x.type ? [{ type: 'Feature', properties: {}, geometry: x }] : [];
  const pol = feats.filter(f => f && f.geometry && /Polygon/.test(f.geometry.type)).map(f => turf.feature(f.geometry, {}));
  if (!pol.length || esProyectado(turf.featureCollection(pol))) return null;
  let g = pol[0];
  for (let k = 1; k < pol.length; k++) { try { g = turf.union(g, pol[k]) || g; } catch (e) { /* geometría inválida: se conserva lo unido */ } }
  return turf.feature(g.geometry, {});
}
/* Datos de la ficha predial según el formulario entregado (JSON o proyecto de la aplicación) */
function predioDelFormulario(sol) {
  const pp = (sol.pmfbn || {}).predio || {};
  let fp = sol.formularioPredio;
  if (!fp && sol.pmfbnProyecto) { try { const r = desdeAppPMFBN(sol.pmfbnProyecto); fp = { limite: limiteDe(r.limite), cbr: r.extra.cbr, cursos: r.cursos }; } catch (e) { fp = null; } }
  fp = fp || {};
  const lista = s => String(s || '').split(/[,;]/).map(x => x.trim()).filter(Boolean);
  const roles = lista(pp.rol), comunas = lista(pp.comuna);
  if (!pp.nombre && !roles.length && !fp.limite) return null;
  const cbr = fp.cbr && Object.values(fp.cbr).some(v => String(v || '').trim()) ? fp.cbr : null;
  return { nombre: pp.nombre || '', roles, rol: roles.join(', '), comunas, comuna: comunaOficial(comunas[0] || ''), superficieTotal: +pp.superficieTotal || 0,
    precipitacion: +pp.precipitacion || 0, cbr, limite: fp.limite || null, cursos: fp.cursos && (fp.cursos.features || []).length ? fp.cursos : null };
}
/* Ficha predial existente que coincide con algún rol del formulario */
const predioPorRol = roles => DB.predios.find(q => roles.some(r => norm(r) === norm(q.rol))) || null;


/* ---------- Proyecto de la «Aplicación web de plan de manejo» → esquema SIGPM ---------- */
const PEND_APP = { '< 30': 15, '≥ 30 ᴧ < 45': 37, '≥ 45 ᴧ < 60': 50, '≥ 60': 61 };
const COB_APP = { '>10 ᴧ ≤20': 11, '>20 ᴧ ≤30': 21, '>30 ᴧ ≤40': 31, '>40 ᴧ ≤50': 41, '>50 ᴧ ≤60': 51, '>60': 61 };
function metodoDesdeActividad(a) {
  a = a || '';
  if (/tala rasa/i.test(a)) return 'tala_rasa';
  if (/semillera/i.test(a)) return 'arboles_semilleros';
  if (/regeneraci|preparatoria|cosecha|final/i.test(a)) return 'corta_proteccion';
  if (/bosquetes|irregulares/i.test(a)) return 'corta_seleccion';
  if (/sanitaria|quemados|recuperaci/i.test(a)) return 'corta_sanitaria';
  if (/raleo|clareo|intermedia|liberaci|limpieza|mejoramiento|poda|anillado/i.test(a)) return 'corta_intermedia';
  return '';
}
function desdeAppPMFBN(P, resumen, revision) {
  const f = P.f || {}, t = P.t || {}, tab = k => t[k] || [];
  const out = plantillaPMFBN();
  out.origen = 'externo'; out.app = true;
  const it = tab('sol_int')[0] || {};
  const rutDe = r => { const n = String(r || '').replace(/\D/g, ''); return n ? fmtRut(+n) : ''; };
  out.interesado = { nombre: it.nombre || '', rut: rutDe(it.rut) };
  const roles = tab('sol_rol');
  out.predio = { nombre: f.pr_nombre || '', rol: roles.map(r => r.rol).filter(Boolean).join(', '), comuna: [...new Set(roles.map(r => r.comuna).filter(Boolean))].join(', '),
    superficieTotal: +f.pr_suptotal || '', precipitacion: '' };
  const t6 = tab('t6');
  const obj = (t6[0] || {}).obj || '';
  out.objetivo = { general: obj === 'Maderero' ? 'produccion_maderera' : obj === 'No maderero' ? 'no_maderera' : '', descripcion: [f.c6_fund, ...t6.map(r => r.esp)].filter(Boolean).join(' · ') };
  const porRod = (k, rod) => tab(k).filter(r => String(r.rodal).trim() === String(rod).trim());
  out.rodales = tab('t511').filter(r => String(r.rodal || '').trim()).map(r => {
    const rod = String(r.rodal).trim();
    const fis = porRod('t531', rod)[0] || {};
    const acts = porRod('t731', rod);
    const corta = acts.find(a => metodoDesdeActividad(a.act)) || acts[0] || {};
    const ref = porRod('t743', rod)[0];
    const res = resumen && resumen.rodales ? resumen.rodales[rod] || {} : {};
    const inter = (METODOS[metodoDesdeActividad(corta.act)] || {}).intermedia;
    const ab0 = +res.areaBasal, ab1 = +res.areaBasalFin;
    return {
      numero: rod, tipoForestal: TF_APP[r.tf] || 'OTR', estructura: r.est || '', superficie: +String(r.sup || 0).replace(',', '.') || 0,
      pendiente: PEND_APP[fis.pend] ?? '', pendienteClase: fis.pend || '',
      densidad: res.densidad ? Math.round(res.densidad) : '', areaBasal: isFinite(ab0) ? round2(ab0) : '', volumen: res.volumen ? Math.round(res.volumen) : '',
      especies: (res.especies || []).join(', '), metodo: metodoDesdeActividad(corta.act), actividad: corta.act || '',
      extraccionAB: isFinite(ab0) && isFinite(ab1) && ab0 > 0 ? Math.round((ab0 - ab1) / ab0 * 100) : '',
      coberturaRemanente: COB_APP[(P.c742 || {})[rod]] ?? '', coberturaClase: (P.c742 || {})[rod] || '',
      anioCorta: +corta.ini || '', tipoBosqueApp: res.tipoBosque || '', zonasRSAH: res.zonasRSAH || '',
      reforestacion: ref ? { tipo: /plant/i.test(ref.treg || '') ? 'plantacion' : 'regeneracion_natural', superficie: +String(r.sup || 0).replace(',', '.') || 0, especie: Array.isArray(ref.sp) ? ref.sp.join(', ') : (ref.sp || ''), densidad: ref.dens || '', anio: ref.ini || '' }
        : { tipo: inter ? 'no_aplica' : '', superficie: 0, especie: '', densidad: '', anio: '' },
    };
  });
  out.prescripciones = { criterioCorta: [f.c71_b, f.c71_a].filter(Boolean).join(' '), madereo: /cable/i.test(f.c101 || '') ? 'cable' : /huinche/i.test(f.c101 || '') ? 'huinche' : /animal|bueyes/i.test(f.c101 || '') ? 'animal' : 'tractor',
    caminosKm: 0, pendienteMaxCaminos: 12, madereoTexto: f.c101 || '' };
  out.proteccion = { zonasDemarcadas: !!(f.c114_b || f.c114_c), residuos3cm: /3\s*cm|residuo|desecho/i.test([f.c113_c, f.c114_a].join(' ')), prevencionIncendios: !!(f.c113_a || f.c113_b || f.c113_c),
    plagas: !!f.c112_a, sinCaminosZonas: !!f.c114_d, justificacionArt16: [f.c114_a, f.c114_c].filter(Boolean).join(' ') };
  out.firmas = { interesado: !!(it.nombre && f.f14_fecha), profesional: !!(f.au_nombre && f.f14_fecha) };
  // Cartografía de la aplicación (capas del capítulo 13)
  const L = (P.carto && P.carto.layers) || {};
  const fc = arr => ({ type: 'FeatureCollection', features: arr });
  const cartografia = (L.Rodales || []).length ? fc(L.Rodales.map((x, i) => ({ type: 'Feature', properties: { rodal: x.p && x.p.N_Rodal ? String(x.p.N_Rodal) : String(i + 1) }, geometry: x.g }))) : null;
  const cursos = (L.Hidrografia || []).length ? fc(L.Hidrografia.map(x => ({ type: 'Feature', properties: { nombre: (x.p && x.p.Nom_Dren) || 'Curso de agua', permanente: !(x.p && String(x.p.Tipo_Perma) === '2'), seccion: 'entre02y05' }, geometry: x.g }))) : null;
  const limite = (L.Limite_Predial || []).length ? { type: 'Feature', properties: {}, geometry: L.Limite_Predial[0].g } : null;
  const autor = { 'Ingeniero Forestal': 'Ingeniero forestal', 'Ingeniero Agrónomo especializado': 'Ingeniero agrónomo especializado', 'Profesional Cs. Forestales con Postítulo': 'Profesional de ciencias forestales con postítulo/postgrado' };
  const extra = {
    interesado: { nombre: it.nombre || '', rut: rutDe(it.rut), domicilio: it.domicilio || '', comuna: it.ciudad || '', email: it.email || '', telefono: it.fono || '',
      pequenoPropietario: it.tipo === 'PPF', calidad: /Poseedor/.test(it.calidad || '') ? 'poseedor' : /Art/.test(it.calidad || '') ? 'concesionario' : 'propietario',
      representante: { nombre: f.rl_nombre || '', rut: rutDe(f.rl_rut) } },
    profesional: { nombre: f.au_nombre || '', rut: rutDe(f.au_rut), titulo: autor[f.au_prof] || '', postitulo: /Postítulo/.test(f.au_prof || '') },
    cbr: { fojas: f.pr_fojas || '', numero: f.pr_num || '', anio: f.pr_anio || '', conservador: f.pr_cbr || '' },
  };
  return { pmfbn: out, cartografia, cursos, limite, proyecto: P, revision: revision || null, extra };
}

/* ---------- Render ---------- */
function renderPMFBN(sol, editable) {
  const f = sol.pmfbn; const dis = editable ? '' : 'disabled';
  const inp = (k, v, t = 'text', extra = '') => `<input ${dis} data-k="${k}" type="${t}" value="${esc(v ?? '')}" ${extra}>`;
  const sel = (k, v, opts) => `<select ${dis} data-k="${k}">${Object.entries(opts).map(([o, l]) => `<option value="${o}" ${o === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const chk = (k, v, l) => `<label class="chk"><input ${dis} type="checkbox" data-k="${k}" ${v ? 'checked' : ''}> ${esc(l)}</label>`;
  const rs = f.rodales || [];
  const rsel = (i, k, v, opts) => `<select ${dis} data-r="${i}" data-f="${k}">${Object.entries(opts).map(([o, l]) => `<option value="${o}" ${String(o) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const rin = (i, k, v, t = 'number', w = '') => `<input ${dis} data-r="${i}" data-f="${k}" type="${t}" value="${esc(v ?? '')}" ${w}>`;
  const tfOpts = Object.fromEntries(Object.entries(TIPOS_FORESTALES).map(([k, v]) => [k, v.nombre]));
  const metOpts = Object.fromEntries(Object.entries(METODOS).map(([k, v]) => [k, v.nombre]));
  const estOpts = Object.fromEntries(ESTRUCTURAS.map(e => [e, e]));
  const refOpts = { regeneracion_natural: 'Regeneración natural', plantacion: 'Plantación', enriquecimiento: 'Enriquecimiento', no_aplica: 'No aplica (corta intermedia)' };
  return `<div class="pmfbn ${editable ? 'editable' : ''}">
    <div class="pm-bar">
      <div><b>Formulario PMFBN</b> <span class="chip ${f.app ? 'ok' : f.origen === 'externo' ? 'info' : ''}">${f.app ? 'Recibido desde la Aplicación web de plan de manejo' : f.origen === 'externo' ? 'Importado (JSON)' : 'Sin plan de la aplicación'}</span></div>
      <div class="row-btns wrap">${editable ? `<button class="btn sm" id="pm-externo">${sol.pmfbnProyecto ? 'Editar en la Aplicación web de plan de manejo' : 'Completar en la Aplicación web de plan de manejo'}</button><button class="btn sm ghost" id="pm-import">Importar proyecto (.json)</button><input type="file" id="pm-file" accept=".json" hidden>` : ''}
        ${!editable && sol.pmfbnProyecto ? '<button class="btn sm" id="pm-ver">Ver plan completo en la aplicación</button>' : ''}${sol.pmfbnProyecto ? '<button class="btn sm ghost" id="pm-dl">Descargar proyecto (.json)</button>' : ''}</div>
    </div>
    ${sol.pmfbnRevision ? `<details class="pm-rev"><summary>Revisión de la aplicación: <b>${sol.pmfbnRevision.filter(x => x.lvl === 'err').length}</b> errores · <b>${sol.pmfbnRevision.filter(x => x.lvl !== 'err').length}</b> advertencias</summary>
      <ul class="list small">${sol.pmfbnRevision.slice(0, 60).map(x => `<li class="${x.lvl === 'err' ? 'bad-txt' : 'warn-txt'}">[${esc(x.cap)}] ${esc(x.sec)}: ${esc(x.msg)}</li>`).join('')}</ul></details>` : ''}
    <p class="hint">${f.app ? 'Datos extraídos del plan para la evaluación técnica y el análisis espacial. El plan completo (inventario, gráficos, cartografía del capítulo 13) se consulta en la aplicación.' : 'Complete el plan en la aplicación oficial o, si no está disponible, en esta ficha resumida.'}</p>
    <section class="pm-sec"><h4>a) Individualización del interesado <small>Art. 14 a) D.S. 93</small></h4>
      <p class="muted small">Se toma de la solicitud: <b>${esc(sol.interesado.nombre || '—')}</b> · RUT ${esc(sol.interesado.rut || '—')}</p></section>
    <section class="pm-sec"><h4>b) Antecedentes generales del predio <small>Art. 14 b) D.S. 93</small></h4>
      <div class="fgrid g4"><label>Nombre del predio ${inp('predio.nombre', f.predio.nombre)}</label><label>Rol de avalúo ${inp('predio.rol', f.predio.rol)}</label>
      <label>Superficie total (ha) ${inp('predio.superficieTotal', f.predio.superficieTotal, 'number', 'step="0.01" min="0"')}</label>
      <label>Precipitación media anual (mm) ${inp('predio.precipitacion', f.predio.precipitacion, 'number', 'min="0"')}</label></div></section>
    <section class="pm-sec"><h4>d) Objetivos de manejo <small>Art. 14 d) D.S. 93</small></h4>
      <div class="fgrid"><label>Objetivo general ${sel('objetivo.general', f.objetivo.general, { '': '— Seleccione —', ...OBJETIVOS })}</label>
      <label class="span2">Descripción ${editable ? `<textarea data-k="objetivo.descripcion" rows="2">${esc(f.objetivo.descripcion)}</textarea>` : `<div class="ro">${esc(f.objetivo.descripcion || '—')}</div>`}</label></div></section>
    <section class="pm-sec"><h4>c, e, f) Recurso forestal, tratamiento silvicultural y calendario por rodal <small>Art. 14 c), e) y f) D.S. 93 · art. 6° Ley 20.283</small></h4>
      <div class="tbl-wrap"><table class="grid pm-rod"><thead><tr><th>N°</th><th>Tipo forestal</th><th>Estructura</th><th class="num">Sup. (ha)</th><th class="num">Pend. (%)</th>
        <th class="num">Densidad (arb/ha)</th><th class="num">AB (m²/ha)</th><th class="num">Vol. (m³/ha)</th><th>Especies principales</th><th>Método de corta</th><th class="num">Extrac. AB (%)</th>
        <th class="num">Cobertura remanente (%)</th><th class="num">Año corta</th><th>Regeneración / reforestación</th><th class="num">Sup. (ha)</th><th>Especie</th>${editable ? '<th></th>' : ''}</tr></thead>
      <tbody>${rs.map((r, i) => `<tr>
        <td>${rin(i, 'numero', r.numero, 'text', 'style="width:48px"')}</td><td>${rsel(i, 'tipoForestal', r.tipoForestal, tfOpts)}</td><td>${rsel(i, 'estructura', r.estructura, estOpts)}</td>
        <td>${rin(i, 'superficie', r.superficie, 'number', 'step="0.01" min="0" style="width:80px"')}</td><td>${rin(i, 'pendiente', r.pendiente, 'number', 'min="0" style="width:60px"')}</td>
        <td>${rin(i, 'densidad', r.densidad, 'number', 'style="width:70px"')}</td><td>${rin(i, 'areaBasal', r.areaBasal, 'number', 'step="0.1" style="width:60px"')}</td><td>${rin(i, 'volumen', r.volumen, 'number', 'style="width:70px"')}</td>
        <td>${rin(i, 'especies', r.especies, 'text', 'style="width:170px"')}</td><td>${rsel(i, 'metodo', r.metodo, metOpts)}</td>
        <td>${rin(i, 'extraccionAB', r.extraccionAB, 'number', 'min="0" max="100" style="width:60px"')}</td><td>${rin(i, 'coberturaRemanente', r.coberturaRemanente, 'number', 'min="0" max="100" style="width:60px"')}</td>
        <td>${rin(i, 'anioCorta', r.anioCorta, 'number', 'style="width:70px"')}</td><td>${rsel(i, 'reforestacion.tipo', r.reforestacion.tipo, refOpts)}</td>
        <td>${rin(i, 'reforestacion.superficie', r.reforestacion.superficie, 'number', 'step="0.01" style="width:75px"')}</td><td>${rin(i, 'reforestacion.especie', r.reforestacion.especie, 'text', 'style="width:120px"')}</td>
        ${editable ? `<td><button class="icon-btn" data-del="${i}" title="Quitar rodal" aria-label="Quitar rodal ${esc(r.numero)}">✕</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="17" class="muted center">Sin rodales. ${editable ? 'Agréguelos o cárguelos desde la cartografía.' : ''}</td></tr>`}</tbody>
      <tfoot><tr><td colspan="3">Total</td><td class="num">${fmt(sum(rs, 'superficie'))}</td><td colspan="10"></td><td class="num">${fmt(sum(rs, r => r.reforestacion.superficie))}</td><td colspan="${editable ? 2 : 1}"></td></tr></tfoot></table></div>
      ${editable ? '<div class="row-btns"><button class="btn sm ghost" id="pm-add">+ Agregar rodal</button><button class="btn sm ghost" id="pm-from-carto">Crear rodales desde la cartografía</button></div>' : ''}</section>
    <section class="pm-sec"><h4>g) Prescripciones técnicas y criterios de corta <small>Arts. 9° y 14 g) D.S. 93</small></h4>
      <div class="fgrid g4"><label class="span2">Criterio de corta de los individuos ${editable ? `<textarea data-k="prescripciones.criterioCorta" rows="2">${esc(f.prescripciones.criterioCorta)}</textarea>` : `<div class="ro">${esc(f.prescripciones.criterioCorta || '—')}</div>`}</label>
      <label>Sistema de madereo ${sel('prescripciones.madereo', f.prescripciones.madereo, MADEREO)}</label>
      <label>Caminos nuevos (km) ${inp('prescripciones.caminosKm', f.prescripciones.caminosKm, 'number', 'step="0.1" min="0"')}</label></div></section>
    <section class="pm-sec"><h4>h) Medidas de protección ambiental <small>Art. 14 h) D.S. 93 · Título III Ley 20.283 · D.S. 82</small></h4>
      <div class="chk-grid">${chk('proteccion.zonasDemarcadas', f.proteccion.zonasDemarcadas, 'Zonas de protección de cursos de agua demarcadas en terreno (D.S. 82 art. 3°–4°)')}
      ${chk('proteccion.sinCaminosZonas', f.proteccion.sinCaminosZonas, 'Sin caminos, vías de saca ni desechos en zonas de protección (D.S. 82 art. 4° y 17)')}
      ${chk('proteccion.residuos3cm', f.proteccion.residuos3cm, 'Residuos leñosos < 3 cm permanecen en el área (D.S. 82 art. 7°–8°)')}
      ${chk('proteccion.prevencionIncendios', f.proteccion.prevencionIncendios, 'Medidas de prevención y combate de incendios (art. 16 Ley)')}
      ${chk('proteccion.plagas', f.proteccion.plagas, 'Medidas de protección contra plagas y enfermedades (art. 14 h)')}</div>
      <label class="mt">Justificación técnica para bosque de conservación y protección (art. 16 Ley 20.283)
        ${editable ? `<textarea data-k="proteccion.justificacionArt16" rows="2" placeholder="Métodos de corta y medidas para proteger suelos, caudales y biodiversidad">${esc(f.proteccion.justificacionArt16)}</textarea>` : `<div class="ro">${esc(f.proteccion.justificacionArt16 || '—')}</div>`}</label></section>
    <section class="pm-sec"><h4>Firmas <small>Art. 7° Ley 20.283 · art. 21 D.S. 93</small></h4>
      <div class="chk-grid">${chk('firmas.interesado', f.firmas.interesado, 'Firmado por el interesado')}${chk('firmas.profesional', f.firmas.profesional, `Firmado por el profesional (${esc(sol.profesional.nombre || '—')})`)}</div></section>
    <section class="pm-sec"><h4>i) Cartografía digital georreferenciada <small>Art. 14 i) D.S. 93</small></h4>
      <p class="muted small">${sol.cartografia ? `${sol.cartografia.features.length} polígono(s) cargado(s). Véase la pestaña «Cartografía y análisis».` : 'Sin cartografía cargada.'}</p></section>
  </div>`;
}

function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }

function bindPMFBN(el, sol, onChange) {
  const valOf = i => i.type === 'checkbox' ? i.checked : i.type === 'number' ? (i.value === '' ? '' : +i.value) : i.value;
  $$('[data-k]', el).forEach(i => i.addEventListener('change', () => { setPath(sol.pmfbn, i.dataset.k, valOf(i)); onChange(false); }));
  $$('[data-r]', el).forEach(i => i.addEventListener('change', () => { setPath(sol.pmfbn.rodales[+i.dataset.r], i.dataset.f, valOf(i)); onChange(['superficie', 'reforestacion.superficie', 'metodo'].includes(i.dataset.f)); }));
  $$('[data-del]', el).forEach(b => b.addEventListener('click', () => { sol.pmfbn.rodales.splice(+b.dataset.del, 1); onChange(true); }));
  const add = $('#pm-add', el); if (add) add.addEventListener('click', () => { const n = (sol.pmfbn.rodales.reduce((m, r) => Math.max(m, +r.numero || 0), 0)) + 1; sol.pmfbn.rodales.push(rodalVacio(n)); onChange(true); });
  const fc = $('#pm-from-carto', el); if (fc) fc.addEventListener('click', () => {
    if (!sol.cartografia) { toast('Primero cargue la cartografía del área a intervenir', 'warn'); return; }
    sol.cartografia.features.forEach(ft => {
      const n = ft.properties.rodal;
      let r = sol.pmfbn.rodales.find(x => String(x.numero) === String(n));
      if (!r) { r = rodalVacio(n); sol.pmfbn.rodales.push(r); }
      r.superficie = haDe(ft);
    });
    sol.pmfbn.rodales.sort((a, b) => a.numero - b.numero);
    toast('Rodales sincronizados con la cartografía (superficie SIG)', 'ok'); onChange(true);
  });
  const imp = $('#pm-import', el), file = $('#pm-file', el);
  if (imp) { imp.addEventListener('click', () => file.click()); file.addEventListener('change', async () => {
    try { aplicarImportacion(sol, JSON.parse(await file.files[0].text())); onChange(true); }
    catch (e) { toast('El archivo no es un JSON válido del formulario: ' + e.message, 'error'); }
  }); }
  const ext = $('#pm-externo', el); if (ext) ext.addEventListener('click', () => abrirFormularioExterno(sol, onChange));
}

function aplicarImportacion(sol, json) {
  const r = normalizarPMFBN(json);
  const { pmfbn, cartografia } = r;
  sol.pmfbn = pmfbn; sol.origenFormulario = 'externo';
  sol.formularioPredio = { limite: limiteDe(r.limite), cbr: (r.extra || {}).cbr || null, cursos: r.cursos || null };
  if (r.proyecto) {
    sol.pmfbnProyecto = r.proyecto; sol.pmfbnRevision = r.revision;
    const ed = typeof puedeEditar === 'function' && puedeEditar(sol, 'ingreso');
    const llenar = (dst, src) => Object.entries(src).forEach(([k, v]) => { if (v && typeof v === 'object' && !Array.isArray(v)) { dst[k] = dst[k] || {}; llenar(dst[k], v); } else if ((v || v === false) && !dst[k]) dst[k] = v; });
    if (ed) { llenar(sol.interesado, r.extra.interesado); llenar(sol.profesional, r.extra.profesional); }
    const p = predio(sol.predioId);
    if (p) {
      // Un proyecto aún no toca la ficha predial oficial: los cursos se aplican al enviarlo a CONAF
      if (r.cursos && sol.esProyecto) sol.cursosPropuestos = r.cursos;
      else if (r.cursos && !(p.cursos.features || []).length) p.cursos = r.cursos;
      if (!pmfbn.predio.precipitacion) pmfbn.predio.precipitacion = p.precipitacion;
    }
  } else if (!sol.interesado.nombre && pmfbn.interesado.nombre) { sol.interesado.nombre = pmfbn.interesado.nombre; sol.interesado.rut = pmfbn.interesado.rut; }
  if (cartografia) sol.cartografia = soloPoligonosRodal(cartografia);
  const p = predio(sol.predioId);
  if (p && !pmfbn.predio.precipitacion) pmfbn.predio.precipitacion = p.precipitacion;
  registrar(sol, r.proyecto ? 'Plan recibido desde la Aplicación web de plan de manejo' : 'Formulario PMFBN importado',
    `${pmfbn.rodales.length} rodales${cartografia ? ' + cartografía' : ''}${r.revision ? ` · revisión de la aplicación: ${r.revision.filter(x => x.lvl === 'err').length} errores, ${r.revision.filter(x => x.lvl !== 'err').length} advertencias` : ''}`);
  toast(`Plan recibido: ${pmfbn.rodales.length} rodales${cartografia ? ' y cartografía' : ''}`, 'ok');
}
function soloPoligonosRodal(fc) {
  const keys = Object.keys((fc.features[0] || {}).properties || {});
  const kRod = keys.find(k => /^(n_?)?rod|rodal|^num|^id$/i.test(k));
  return turf.featureCollection(fc.features.filter(f => /Polygon/.test(f.geometry.type)).map((f, i) => turf.feature(f.geometry, { rodal: kRod ? (f.properties[kRod] ?? i + 1) : i + 1 })));
}

function abrirFormularioExterno(sol, onChange, soloLectura = false) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ext" role="dialog" aria-modal="true" aria-label="Aplicación web de plan de manejo">
    <div class="ext-bar"><b>Aplicación web de plan de manejo</b><span class="muted small">${soloLectura ? 'Consulta del plan presentado (solo lectura).' : 'Complete el plan y use «Enviar a SIGPM» en la barra verde superior.'}</span><button class="btn sm ghost" id="ext-close">Cerrar</button></div>
    <iframe src="formulario-pmfbn/index.html" title="Aplicación web de plan de manejo"></iframe></div>`;
  document.body.appendChild(bg);
  const iframe = $('iframe', bg);
  const p = predio(sol.predioId);
  const ctx = () => JSON.parse(JSON.stringify({ tipo: 'sigpm:inicio', solicitud: sol.id, soloLectura, proyecto: sol.pmfbnProyecto || null, interesado: sol.interesado, profesional: sol.profesional,
    predio: p ? { nombre: p.nombre, rol: p.rol, comuna: p.comuna, superficie: p.supSIG, cbr: p.cbr, geom: p.geom } : null,
    cartografia: sol.cartografia || null, cursos: p ? p.cursos : null }));
  iframe.addEventListener('load', () => { try { iframe.contentWindow.postMessage(ctx(), '*'); } catch (e) { /* */ } });
  const onMsg = ev => {
    if (ev.source !== iframe.contentWindow || !ev.data || ev.data.tipo !== 'pmfbn:datos' || soloLectura) return;
    aplicarImportacion(sol, ev.data.datos); cerrar(); onChange(true);
  };
  const cerrar = () => { window.removeEventListener('message', onMsg); bg.remove(); };
  window.addEventListener('message', onMsg);
  $('#ext-close', bg).addEventListener('click', cerrar);
}
