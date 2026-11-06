/* =====================================================================
   SIGPM · Plan de ejemplo para el consultor (datos FICTICIOS)
   Arma un proyecto completo de la Aplicación web de plan de manejo a partir
   de la ficha predial. La propia aplicación calcula el inventario y la
   revisión, igual que al usar «Enviar a SIGPM».
   ===================================================================== */
const TF_EJEMPLO = {
  RRC: { app: 'Roble - Raulí - Coigüe', cod: 8, stf: 'Renoval y bosque puro secundario', sp: ['Nothofagus obliqua', 'Nothofagus alpina', 'Nothofagus dombeyi'] },
  CRT: { app: 'Coigüe - Raulí - Tepa', cod: 6, stf: 'Otro', sp: ['Nothofagus dombeyi', 'Nothofagus alpina', 'Laureliopsis philippiana'] },
  SV: { app: 'Siempreverde', cod: 10, stf: 'De Tolerantes', sp: ['Eucryphia cordifolia', 'Drimys winteri', 'Aextoxicon punctatum'] },
  LEN: { app: 'Lenga', cod: 7, stf: 'Bosques Lenga Puro', sp: ['Nothofagus pumilio', 'Nothofagus dombeyi', 'Drimys winteri'] },
};
const FUENTE_EJEMPLO = 'Elaboración propia (ejemplo ficticio)';
const SECCION_APP = { mayor05: '> 0,5m²', entre02y05: '> 0,2 ᴧ ≤ 0,5m²', menor02: '≤ 0,2m²' };

/* Hasta tres rodales de la ficha; si la ficha no tiene rodales, el predio completo es el rodal 1 */
function rodalesEjemplo(p) {
  const cels = (p.celdas || []).filter(c => c.geometry.type === 'Polygon' && TF_EJEMPLO[c.properties.tipo]).slice(0, 3);
  if (cels.length) return cels.map(c => ({ nombre: String(c.properties.rodal), geom: c.geometry, tf: c.properties.tipo }));
  const partes = turf.flatten(p.geom).features.sort((a, b) => turf.area(b) - turf.area(a));
  return [{ nombre: '1', geom: partes[0].geometry, tf: 'RRC' }];
}
function distanciaCurso(rodal, curso) {
  const poly = turf.feature(rodal.geom);
  if (turf.booleanIntersects(poly, curso)) return 0;
  return Math.round(Math.min(...rodal.geom.coordinates[0].map(c => turf.pointToLineDistance(turf.point(c), curso, { units: 'meters' }))));
}
function inventarioEjemplo(rodales, rnd) {
  const rows = [];
  rodales.forEach(r => {
    const sp = TF_EJEMPLO[r.tf].sp;
    for (let parc = 1; parc <= 4; parc++) {
      const n = 24 + Math.floor(rnd() * 9);
      for (let i = 0; i < n; i++) {
        const dap = round2(12 + Math.pow(rnd(), 1.6) * 38);
        const u = rnd(), especie = u < 0.55 ? sp[0] : u < 0.85 ? sp[1] : sp[2];
        rows.push([r.nombre, String(parc), especie, String(Math.round(dap * 10) / 10), rnd() < (dap < 22 ? 0.5 : 0.12) ? 'X' : '']);
      }
    }
  });
  return rows;
}
function puntosParcela(rodal, rnd) {
  const poly = turf.feature(rodal.geom), bb = turf.bbox(poly), out = [];
  for (let g = 0; out.length < 4 && g < 400; g++) {
    const c = [bb[0] + rnd() * (bb[2] - bb[0]), bb[1] + rnd() * (bb[3] - bb[1])];
    if (turf.booleanPointInPolygon(c, poly)) out.push(c);
  }
  while (out.length < 4) out.push(turf.pointOnFeature(poly).geometry.coordinates);
  return out;
}

function proyectoAppEjemplo(pry) {
  const p = predio(pry.predioId), it = pry.interesado, au = pry.profesional, co = usuario(pry.consultorId);
  const semilla = [...p.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const rnd = mulberry32(semilla);
  const rodales = rodalesEjemplo(p), nombres = rodales.map(r => r.nombre);
  const y = new Date().getFullYear(), hoy = hoyISO(), juridica = it.tipo === 'juridica';
  const sinDV = r => String(r || '').replace(/\./g, '').split('-')[0].replace(/\D/g, '');
  const fila = o => ({ _id: uid(), ...o });
  const porRodal = fn => rodales.map((r, i) => fila({ rodal: r.nombre, ...fn(r, i) }));
  const c0 = turf.centroid(p.geom).geometry.coordinates, utm = toUTM(c0[0], c0[1]);
  const pred = p.nombre.slice(0, 100);
  const cursos = (p.cursos && p.cursos.features) || [];
  const especiePrincipal = r => TF_EJEMPLO[r.tf].sp[0];

  const f = {
    sol_incendio: 'No', pr_nombre: p.nombre, pr_difrol: 'no', pr_fojas: String(p.cbr.fojas), pr_num: String(p.cbr.numero), pr_anio: String(p.cbr.anio), pr_cbr: String(p.cbr.conservador),
    pr_suptotal: String(p.supSIG), sol_fecha: hoy, sol_ciudad: p.comuna,
    pm_suptitulo: String(p.supSIG), pm_supet: String(p.supSIG), pm_huso: String(utm.huso),
    c1_vias: `Acceso por camino público hasta la entrada del predio, en la comuna de ${p.comuna}. Coordinar el ingreso con el administrador al teléfono ${it.telefono || '+56 9 0000 0000'}.`,
    au_nombre: au.nombre, au_rut: sinDV(au.rut), au_prof: 'Ingeniero Forestal', au_dir: `Oficina profesional, ${p.comuna}`, au_email: co.email || '', au_fono: '+56 9 0000 0000',
    c41: `El predio se ubica en la provincia de ${p.provincia}, en un entorno de bosque nativo secundario y praderas. Una cuenca local con cursos de agua atraviesa el predio; no hay centros poblados inmediatos.`,
    c421_obs: 'No se detectaron especies de flora en categoría de conservación a menos de 100 m de los rodales.', c422_obs: 'No se observaron nidos ni madrigueras de especies en categoría de conservación.',
    c511_obs: 'Rodales definidos según tipo forestal, estructura y estado de desarrollo, con apoyo de imagen satelital y recorrido en terreno.',
    c512_obs: 'Bosque con buena forma y sanidad general; daños puntuales por viento.', c513_obs: 'Principal riesgo: ramoneo de ganado doméstico.',
    c514_b: 'Bosque secundario originado tras floreos antiguos, sin intervención silvícola en los últimos 25 años.', c514_c: 'Sin bonificaciones anteriores.',
    c52_obs: 'Distancias medidas sobre la cartografía de la ficha predial.', c531_obs: 'Sin factores limitantes relevantes.', c532_obs: 'Suelos profundos, sin limitaciones para la intervención propuesta.',
    c541_obs: 'Sin centros poblados ni sectores turísticos a menos de 1 km.', c542_obs: 'Sin infraestructura crítica en el entorno.', c55_obs: 'La hidrografía se aborda con las medidas del capítulo 11.',
    c6_fund: 'Se busca mejorar la calidad y el crecimiento del bosque para obtener madera de mejor valor, manteniendo la protección de suelos y aguas.',
    c71_a: 'Monte alto con raleos sucesivos, conducido a una estructura regular.',
    c71_b: 'Raleo por lo bajo: se extraen árboles dominados, suprimidos y de mala forma o sanidad, y se mantienen los mejores individuos de especies principales distribuidos homogéneamente.',
    c731_obs: 'La intervención se ejecuta fuera del período de mayor riesgo de incendios.', c732_obs: 'Un segundo raleo se evaluará al cierre del plan.',
    c741_a: 'Raleo con motosierra, con extracción aproximada de un tercio del área basal.', c741_b: 'Se dejan árboles sanos, de fuste recto y copa bien formada.', c741_c: 'Marcación con pintura de los árboles a extraer, a la altura del pecho y en el tocón.',
    c741_d: 'En franjas a menos de 200 m de cursos de agua se aplica corta de baja intensidad, se usa madereo con huinche y se mantiene una cobertura mínima de 60 %.',
    c742_obs: 'Cobertura residual estimada en terreno.',
    c101: 'Madereo con tractor forestal y huinche por vías de saca existentes, fuera de las zonas de protección.', c102_obs: 'Volúmenes estimados según la tabla de rodal.',
    c111_a: 'Se conservan árboles semilleros, árboles con cavidades y madera muerta en el piso del bosque.', c111_b: 'Se mantienen franjas de bosque en los bordes de caminos públicos.',
    c112_a: 'Monitoreo anual del estado sanitario y extracción de árboles afectados.', c112_b: 'Exclusión del ganado doméstico de los rodales intervenidos.',
    c113_a: 'Vigilancia durante las faenas y aviso inmediato a CONAF.', c113_b: 'Equipo de primer ataque y herramientas manuales disponibles en faena.', c113_c: 'Residuos leñosos menores a 3 cm permanecen en el área y los desechos mayores se ordenan en fajas lejos de caminos.',
    c114_a: 'Vías de saca con drenajes transversales; sin madereo con suelo saturado.', c114_b: 'Sin cruces de maquinaria por cursos de agua; las zonas de protección se demarcan en terreno.',
    c114_c: 'Faja de protección de 10 m a cada lado de los cursos permanentes, según el D.S. 82, con cobertura mínima de 50 %.', c114_d: 'No se construirán caminos nuevos en zonas de protección.',
    c115: 'Exclusión de ganado para favorecer la regeneración natural bajo dosel.', c116: 'Capacitación del personal de faena sobre las medidas de este plan.',
    f14_lugar: p.comuna, f14_fecha: hoy,
  };
  if (juridica) Object.assign(f, { rl_nombre: it.representante.nombre, rl_rut: sinDV(it.representante.rut), rl_dom: it.domicilio, rl_ciudad: it.comuna, rl_email: it.email, rl_fono: it.telefono });

  const t = {
    sol_int: [fila({ nombre: it.nombre, rut: sinDV(it.rut), calidad: 'Propietario/a', tipo: it.pequenoPropietario ? 'PPF' : 'Otros interesados', genero: juridica ? 'No Aplica' : 'Masculino', etnia: 'No aplica', domicilio: it.domicilio, ciudad: it.comuna, email: it.email, fono: it.telefono })],
    sol_rol: [fila({ rol: p.rol, comuna: p.comuna })],
    c1_ref: [
      fila({ ref: 'Acceso predial', desc: 'Portón de entrada al predio', este: String(Math.round(utm.E)), norte: String(Math.round(utm.N)) }),
      fila({ ref: 'Infraestructura', desc: 'Sin infraestructura relevante' }), fila({ ref: 'Acceso rodal', desc: 'Camino interior hacia los rodales' }), fila({ ref: 'Otra', desc: '' }),
    ],
    t511: porRodal(r => ({ sup: String(haDe(turf.feature(r.geom))), tf: TF_EJEMPLO[r.tf].app, stf: TF_EJEMPLO[r.tf].stf, est: 'Regular', estr: 'Uniestratificado', edd: ['Latizal Alto'], cont: 'Homogénea' })),
    t512: porRodal(r => ({ dom: especiePrincipal(r), sec: TF_EJEMPLO[r.tf].sp[1], ori: 'Monte alto', cob: 'Semi cerrado', san: 'Bueno', age: ['Factores abióticos'] })),
    t513: porRodal(r => ({ sp: especiePrincipal(r), ab50: 'Frecuente', ab51: 'Escasa', ori: 'Monte alto', dist: 'En mosaico' })),
    t52: rodales.flatMap(r => cursos.map(c => {
      const q = c.properties || {}, d = distanciaCurso(r, c);
      return fila({ rodal: r.nombre, nom: q.nombre || '', tipo: /quebrada/i.test(q.nombre || '') ? 'Quebrada' : 'Estero', temp: q.permanente ? 'Permanente' : 'Temporal', ubi: d === 0 ? 'Dentro' : 'Fuera', dist: String(d), afl: '', sec: SECCION_APP[q.seccion] || '> 0,2 ᴧ ≤ 0,5m²' });
    })),
    t531: porRodal((r, i) => ({ alt: String(120 + i * 35), rel: 'Ladera media', exp: ['N', 'E', 'SW'][i % 3], pend: i % 2 ? '≥ 30 ᴧ < 45' : '< 30' })),
    t532: porRodal(() => ({ tipo: 'Trumao', tex: 'Franca', estr: 'si', cap: 'VI', prof: '90', serie: '', form: '', ero: '< Moderada', fra: 'No' })),
    t55: [fila({ rods: nombres, fac: ['Hidrografía'], desc: 'Cursos de agua cercanos a los rodales.' })],
    t6: [fila({ obj: 'Maderero', rods: nombres, esp: 'Obtener trozas aserrables de mayor diámetro y calidad.' })],
    t71: [fila({ rods: nombres, est: 'Regular', met: 'Monte alto', corta: 'Protección', sp: especiePrincipal(rodales[0]) })],
    t731: porRodal((r, i) => ({ act: 'Raleo latizal alto', ini: String(y + 1 + (i % 2)), fin: String(y + 2 + (i % 2)), conc: '' })),
    t102: porRodal(() => ({ cant: '450', uni: 'm³', prod: ['Troza aserrable', 'Leña'] })),
  };

  const especies = [...new Set(rodales.flatMap(r => TF_EJEMPLO[r.tf].sp))];
  const rod = {}, c742 = {};
  rodales.forEach(r => {
    const d = TF_EJEMPLO[r.tf];
    rod[r.nombre] = { sup: String(haDe(turf.feature(r.geom))), tf: d.app, stf: d.stf, est: 'Regular', muestreo: 'Sistemático', tam: '500', forma: 'Circular', fecha: hoy, sp1: d.sp[0], sp2: d.sp[1], sp3: d.sp[2] };
    c742[r.nombre] = '>60';
  });

  const capa = (g, q) => ({ id: uid(), g, p: { Nom_Predio: pred, Fuente: FUENTE_EJEMPLO, ...q } });
  const layers = {
    Limite_Predial: [capa(p.geom.geometry, { Rol: p.rol, Comuna: p.comuna, Sup_ha: p.supSIG })],
    Rodales: rodales.map(r => capa(r.geom, { N_Rodal: r.nombre, Tipo_Bos: 'BN', Tipo_For: TF_EJEMPLO[r.tf].cod, Sup_ha: haDe(turf.feature(r.geom)) })),
    Parcela: rodales.flatMap(r => puntosParcela(r, rnd).map((c, i) => capa({ type: 'Point', coordinates: c }, { N_Rodal: r.nombre, N_Parc: i + 1 }))),
    Referencia: [capa(turf.pointOnFeature(p.geom).geometry, { Nom_Pto: 'Acceso predial' })],
    Hidrografia: cursos.map(c => capa(c.geometry, { Nom_Dren: (c.properties || {}).nombre || '', Tip_Dren: '2', Tipo_Perma: (c.properties || {}).permanente ? '1' : '2' })),
  };

  return {
    version: 1, creado: new Date().toISOString(), modo: 'corta', opt: { sol3: juridica, c101: true, c102: true }, f, t,
    inv: { tipo: 'Monopódico', rows: inventarioEjemplo(rodales, rnd) }, rod,
    vol: Object.fromEntries(especies.map(sp => [sp, { expr: '0.00004*DAP^2*H', h: '20' }])),
    coord: {}, c72: {}, c742, carto: { huso: String(utm.huso), layers, plano: {} },
  };
}

/* La aplicación se abre oculta, recibe el proyecto y lo devuelve con su cálculo y su revisión */
function llenarProyectoEjemplo(pry) {
  return new Promise((resolve, reject) => {
    const proyecto = proyectoAppEjemplo(pry);
    const fr = document.createElement('iframe');
    fr.src = 'formulario-pmfbn/index.html'; fr.title = 'Generación del plan de ejemplo'; fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:800px;border:0';
    const fin = () => { clearTimeout(reloj); window.removeEventListener('message', onMsg); fr.remove(); };
    const reloj = setTimeout(() => { fin(); reject(new Error('La aplicación de plan de manejo no respondió.')); }, 30000);
    const onMsg = ev => {
      if (ev.source !== fr.contentWindow || !ev.data || ev.data.tipo !== 'pmfbn:datos') return;
      fin();
      if (!puedeEditarProyecto(pry)) { reject(new Error('El proyecto ya no se puede modificar.')); return; }
      aplicarImportacion(pry, ev.data.datos);
      registrar(pry, 'Proyecto llenado con datos de ejemplo', 'Datos ficticios generados por el botón de la maqueta');
      guardar();
      resolve(ev.data.datos);
    };
    window.addEventListener('message', onMsg);
    fr.addEventListener('load', () => {
      const p = predio(pry.predioId);
      fr.contentWindow.postMessage({ tipo: 'sigpm:inicio', solicitud: pry.id, soloLectura: false, proyecto, predio: { nombre: p.nombre } }, '*');
      fr.contentWindow.postMessage({ tipo: 'sigpm:enviar' }, '*');
    });
    document.body.appendChild(fr);
  });
}
