/* ==========================================================================
   Puente SIGPM ⇄ Aplicación web de plan de manejo (PMFBN)
   Se activa solo cuando la aplicación se abre dentro de SIGPM (iframe).
   - Recibe:  { tipo: 'sigpm:inicio', solicitud, proyecto, interesado, profesional, predio, cartografia, soloLectura }
   - Recibe:  { tipo: 'sigpm:enviar' } para devolver el proyecto sin usar el botón (plan de ejemplo)
   - Envía:   { tipo: 'pmfbn:datos', datos: { formato: 'pmfbn-app', proyecto, resumen, revision } }
   La aplicación original no se modifica; este archivo se agrega al final de index.html.
   ========================================================================== */
'use strict';
(function () {
  const embebida = window.parent && window.parent !== window;
  if (!embebida) return;
  let ctx = null;

  const sinDV = r => String(r || '').replace(/\./g, '').split('-')[0].replace(/\D/g, '');
  const comunaCat = c => { const n = String(c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); const row = CAT.COMUNAS.find(x => String(x[0]).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === n); return row ? row[0] : c; };
  const CALIDAD = { propietario: 'Propietario/a', poseedor: 'Poseedor en trámite de saneamiento', concesionario: 'Titular de derechos Artículo 7°', fiscal: 'Titular de derechos Artículo 7°' };
  const PROF = { 'Ingeniero forestal': 'Ingeniero Forestal', 'Ingeniero agrónomo especializado': 'Ingeniero Agrónomo especializado', 'Profesional de ciencias forestales con postítulo/postgrado': 'Profesional Cs. Forestales con Postítulo' };

  function cargar(d) {
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, nuevoEstado(), d || {});
    try { Inv.invalidate(); } catch (e) { /* */ }
    try { Carto.reload && Carto.reload(); } catch (e) { /* */ }
    App.save(); App.navRefresh(); App.go('sol');
  }

  /* Proyecto nuevo prellenado con lo que la secretaría técnica ya registró en SIGPM */
  function prellenado(c) {
    const p = nuevoEstado();
    const i = c.interesado || {}, pr = c.predio || {}, au = c.profesional || {};
    p.t.sol_int = [{ _id: uid(), nombre: i.nombre || '', rut: sinDV(i.rut), calidad: CALIDAD[i.calidad] || 'Propietario/a', tipo: i.pequenoPropietario ? 'PPF' : 'Otros interesados',
      domicilio: i.domicilio || '', ciudad: i.comuna || '', email: i.email || '', fono: i.telefono || '' }];
    if (i.tipo === 'juridica' && i.representante) { p.f.rl_nombre = i.representante.nombre || ''; p.f.rl_rut = sinDV(i.representante.rut); }
    p.f.pr_nombre = pr.nombre || '';
    p.t.sol_rol = [{ _id: uid(), rol: pr.rol || '', comuna: comunaCat(pr.comuna) }];
    if (pr.superficie) p.f.pr_suptotal = String(pr.superficie);
    if (pr.cbr) { p.f.pr_fojas = String(pr.cbr.fojas ?? ''); p.f.pr_num = String(pr.cbr.numero ?? ''); p.f.pr_anio = String(pr.cbr.anio ?? ''); p.f.pr_cbr = String(pr.cbr.conservador ?? ''); }
    p.f.au_nombre = au.nombre || ''; p.f.au_rut = sinDV(au.rut); p.f.au_prof = PROF[au.titulo] || '';
    p.opt.sol3 = i.tipo === 'juridica';
    // Cartografía ya disponible en SIGPM (límite predial y área a intervenir)
    p.carto = { huso: '', layers: {}, plano: {} };
    if (pr.geom) p.carto.layers.Limite_Predial = [{ id: uid(), g: pr.geom.geometry || pr.geom, p: { Nom_Predio: (pr.nombre || '').slice(0, 100), Rol: pr.rol || '', Comuna: pr.comuna || '', Fuente: 'SIGPM' } }];
    if (c.cartografia && c.cartografia.features) p.carto.layers.Rodales = c.cartografia.features.map(f => ({ id: uid(), g: f.geometry, p: { N_Rodal: String(f.properties.rodal), Tipo_Bos: 'BN', Fuente: 'SIGPM' } }));
    if (c.cursos && c.cursos.features) p.carto.layers.Hidrografia = c.cursos.features.map(f => ({ id: uid(), g: f.geometry, p: { Tip_Dren: '2', Tipo_Perma: f.properties.permanente ? '1' : '2', Fuente: 'SIGPM' } }));
    if (c.cartografia && c.cartografia.features) p.t.t511 = c.cartografia.features.map(f => ({ _id: uid(), rodal: String(f.properties.rodal) }));
    return p;
  }

  /* Resumen calculado por la aplicación (inventario y revisión) que SIGPM usa para evaluar */
  function resumen() {
    const out = { rodales: {} };
    for (const rod of App.rodales()) {
      let r = null; try { r = Inv.resultado(rod); } catch (e) { /* */ }
      const t = r && r.tot ? r.tot : null;
      out.rodales[rod] = t ? { densidad: t.nIni, areaBasal: t.gIni, volumen: t.vIni, densidadFin: t.nFin, areaBasalFin: t.gFin, dmc: t.dmcIni,
        especies: (r.especies || []).map(e => Array.isArray(e) ? e[0] : (e.sp || e)).filter(x => typeof x === 'string').slice(0, 6),
        estadoDesarrollo: (Inv.estadoFinal ? Inv.estadoFinal(rod) : r.edd) || '', tipoBosque: App.tipoBosque(rod), zonasRSAH: App.zonasRSAH(rod) }
        : { tipoBosque: App.tipoBosque(rod), zonasRSAH: App.zonasRSAH(rod) };
    }
    let rev = [];
    try { rev = App.revisar().map(x => ({ cap: x.chap || x.cap || '', sec: x.sec || x.title || '', msg: x.msg, lvl: x.lvl })); } catch (e) { /* */ }
    let carto = null;
    try { carto = { type: 'FeatureCollection', features: CAPAS.flatMap(c => (S.carto.layers[c.k] || []).map(f => ({ type: 'Feature', geometry: f.g, properties: Object.assign({ _capa: c.k }, f.p) }))) }; } catch (e) { /* */ }
    return { resumen: out, revision: rev, cartografia: carto };
  }

  function barra() {
    if (document.getElementById('sigpm-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'sigpm-bar';
    document.body.classList.add('en-sigpm');
    bar.style.cssText = 'position:fixed;inset:0 0 auto 0;height:40px;box-sizing:border-box;z-index:60;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 16px;background:#2e6b39;color:#fff;font:13px "Segoe UI",system-ui,sans-serif';
    bar.innerHTML = `<b>SIGPM</b><span id="sigpm-ctx" style="opacity:.85"></span><span style="flex:1"></span>` +
      (ctx && ctx.soloLectura ? '<span style="background:#f2c14e;color:#3b2d00;border-radius:999px;padding:2px 10px;font-weight:700">Solo lectura: los cambios no se envían a SIGPM</span>'
        : '<button id="sigpm-enviar" style="border:0;border-radius:7px;padding:7px 14px;background:#f2c14e;color:#3b2d00;font-weight:700;cursor:pointer">Enviar a SIGPM</button>');
    document.body.insertBefore(bar, document.body.firstChild);
    const b = document.getElementById('sigpm-enviar');
    if (b) b.addEventListener('click', enviar);
  }

  function enviar() {
    App.save();
    const r = resumen();
    const errores = r.revision.filter(x => x.lvl === 'err').length;
    window.parent.postMessage({ tipo: 'pmfbn:datos', datos: { formato: 'pmfbn-app', version: 1, proyecto: JSON.parse(JSON.stringify(S)), resumen: r.resumen, revision: r.revision, cartografia: r.cartografia, erroresRevision: errores } }, '*');
  }

  window.addEventListener('message', ev => {
    const d = ev.data;
    if (d && d.tipo === 'sigpm:enviar' && ctx && !ctx.soloLectura) { enviar(); return; }
    if (!d || d.tipo !== 'sigpm:inicio') return;
    ctx = d;
    cargar(d.proyecto && d.proyecto.f ? d.proyecto : prellenado(d));
    barra();
    document.getElementById('sigpm-ctx').textContent = `Solicitud ${d.solicitud} · ${d.predio && d.predio.nombre ? d.predio.nombre : ''}`;
    document.title = `PMFBN · ${d.solicitud}`;
  });
  window.parent.postMessage({ tipo: 'pmfbn:listo' }, '*');
})();
