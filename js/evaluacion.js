/* =====================================================================
   SIGPM · Lógica de evaluación (automática + borradores de informes)
   ===================================================================== */
const ESTADO_CHECK = { cumple: 'Cumple', no_cumple: 'No cumple', observacion: 'Con observación', na: 'No aplica' };

const TITULOS_HABILITADOS = {
  forestal: ['Ingeniero forestal', 'Ingeniero agrónomo especializado', 'Profesional de ciencias forestales con postítulo/postgrado'],
  preservacion: ['Ingeniero forestal', 'Ingeniero en conservación de recursos naturales', 'Ingeniero en recursos naturales', 'Profesional afín con postítulo/postgrado'],
};
function evaluarProfesional(sol) {
  const p = sol.profesional || {};
  const lista = sol.tipoPlan === 'PMP' ? TITULOS_HABILITADOS.preservacion : TITULOS_HABILITADOS.forestal;
  const requierePost = /postítulo|especializado/i.test(p.titulo || '');
  if (!p.nombre) return { estado: 'no_cumple', det: 'Sin profesional individualizado' };
  if (!lista.includes(p.titulo)) return { estado: 'no_cumple', det: `Título «${p.titulo || '—'}» no habilitado para este tipo de plan (art. 7° Ley 20.283)` };
  if (requierePost && !p.postitulo) return { estado: 'no_cumple', det: 'Requiere acreditar postítulo o postgrado en ciencias forestales (art. 7° Ley)' };
  if ((+p.semestres || 0) < NORMA.semestresProfesional) return { estado: 'no_cumple', det: `Plan de estudios de ${p.semestres || 0} semestres (< 10 exigidos)` };
  return { estado: 'cumple', det: `${p.titulo}, ${p.semestres} semestres, ${p.universidad || 'universidad no indicada'}` };
}

function autoJuridico(sol) {
  const ref = sol.fechaIngreso || hoyISO();
  const out = {};
  const d = sol.documentos || {};
  const dom = d.dominio || {};
  if (!dom.presentado) out.J3 = { estado: 'no_cumple', det: 'Certificado de dominio vigente no acompañado' };
  else if (!dom.fecha) out.J3 = { estado: 'observacion', det: 'Indique la fecha de emisión del certificado' };
  else { const n = habilesEntre(dom.fecha, ref); out.J3 = n <= NORMA.vigenciaDominio ? { estado: 'cumple', det: `Emitido el ${fmtFecha(dom.fecha)}: ${n} días hábiles al ingreso (≤ 120)` } : { estado: 'no_cumple', det: `Emitido el ${fmtFecha(dom.fecha)}: ${n} días hábiles al ingreso (> 120)` }; }
  if (sol.interesado.tipo === 'juridica') {
    const pe = d.personeria || {};
    if (!pe.presentado) out.J4 = { estado: 'no_cumple', det: 'Personería y vigencia no acompañadas' };
    else { const n = corridosEntre(pe.fecha || ref, ref); out.J4 = n <= NORMA.vigenciaPersoneria ? { estado: 'cumple', det: `Documento de ${fmtFecha(pe.fecha)}: ${n} días corridos (≤ 90)` } : { estado: 'no_cumple', det: `Documento de ${fmtFecha(pe.fecha)}: ${n} días corridos (> 90)` }; }
  } else out.J4 = { estado: 'na', det: 'Persona natural' };
  out.J5 = evaluarProfesional(sol);
  if (out.J5.estado === 'cumple' && !(d.titulo || {}).presentado) out.J5 = { estado: 'no_cumple', det: 'Certificado de título no acompañado' };
  const f = (sol.pmfbn || {}).firmas || {};
  out.J6 = (f.interesado && f.profesional && (d.firma || {}).presentado) ? { estado: 'cumple', det: 'Firmado por interesado y profesional' } : { estado: 'no_cumple', det: 'Falta firma del interesado o del profesional' };
  out.J2 = (d.ci || {}).presentado && rutValido(sol.interesado.rut) ? { estado: 'cumple', det: `RUT ${sol.interesado.rut}` } : { estado: 'no_cumple', det: 'Cédula/RUT faltante o inválido' };
  const pr = predio(sol.predioId);
  out.J11 = pr && sol.pmfbn.predio && norm(sol.pmfbn.predio.rol) === norm(pr.rol) ? { estado: 'cumple', det: `Rol ${pr.rol} coincide en formulario y ficha predial` } : { estado: 'observacion', det: 'El rol del formulario no coincide con la ficha predial' };
  PAUTA_JURIDICA.forEach(c => { if (c.aplica && !c.aplica(sol)) out[c.id] = { estado: 'na', det: 'No aplica' }; });
  return out;
}

function motivoObjecion(an, num) {
  const r = an.porRodal[num] || {};
  const m = [];
  if (r.glaciar > 0.01) m.push(`${fmt(r.glaciar)} ha a menos de 500 m de glaciar (art. 17 Ley 20.283)`);
  if (r.preserv > 0.01) m.push(`${fmt(r.preserv)} ha en área protegida: bosque de preservación (art. 2° N° 4 Ley; art. 4° D.S. 93)`);
  if (r.humedal > 0.01) m.push(`${fmt(r.humedal)} ha en humedal prioritario (art. 10 D.S. 82)`);
  if (r.especies && r.especies.length) m.push(`Especies en categoría de conservación: ${r.especies.join(', ')} (art. 19 Ley 20.283)`);
  if (r.okCob === false) m.push(`Cobertura remanente ${r.cobProp}% inferior al mínimo de ${r.cobMin}% (${r.cobArt})`);
  return m.join('; ');
}

function sugerirDecisiones(sol, an) {
  const out = {};
  (sol.pmfbn.rodales || []).forEach(r => {
    const pr = an.porRodal[r.numero] || {};
    const objetar = an.objetables[r.numero] || (pr.especies || []).length || pr.okCob === false;
    out[r.numero] = objetar ? { decision: 'objetar', motivo: motivoObjecion(an, r.numero) } : { decision: 'aprobar', motivo: '' };
  });
  return out;
}

function supAprobadaDe(sol) {
  const rods = sol.pmfbn.rodales || [];
  const ap = rods.filter(r => ((sol.tecnico.rodales || {})[r.numero] || {}).decision !== 'objetar');
  return { aprobados: ap.map(r => r.numero), objetados: rods.filter(r => !ap.includes(r)).map(r => r.numero), supAprobada: round2(sum(ap, 'superficie')), supRechazada: round2(sum(rods, 'superficie') - sum(ap, 'superficie')) };
}

function borradorInformeTecnico(sol, an) {
  const p = predio(sol.predioId) || {};
  const s = supAprobadaDe(sol);
  const nc = PAUTA_TECNICA.filter(c => ((sol.tecnico.checks || {})[c.id] || an.auto[c.id] || {}).estado === 'no_cumple');
  const conc = sol.tecnico.conclusion ? CONCLUSION_TEC[sol.tecnico.conclusion] : (s.objetados.length ? (s.aprobados.length ? CONCLUSION_TEC.parcial : CONCLUSION_TEC.rechazar) : CONCLUSION_TEC.aprobar);
  return [
    `INFORME TÉCNICO · Solicitud ${sol.id}`,
    `Predio ${p.nombre || '—'}, rol ${p.rol || '—'}, comuna de ${p.comuna || '—'}. ${TIPOS_PLAN[sol.tipoPlan].nombre}.`,
    `Superficie solicitada: ${fmt(an.supDecl)} ha en ${(sol.pmfbn.rodales || []).length} rodales; superficie SIG verificada: ${fmt(an.supSIG)} ha.`,
    sol.tecnico.visita && sol.tecnico.visita.fecha ? `Visita a terreno el ${fmtFecha(sol.tecnico.visita.fecha)}: ${sol.tecnico.visita.obs || 'sin observaciones'}.` : 'No se realizó visita a terreno.',
    `Análisis espacial: ${an.alertas.length ? an.alertas.map(a => `[${a.check}] ${a.txt}`).join(' ') : 'sin alertas normativas.'}`,
    nc.length ? `Requisitos no cumplidos: ${nc.map(c => `${c.id} ${c.txt} (${c.art})`).join('; ')}.` : 'El plan cumple los requisitos técnicos de la Ley 20.283, el D.S. 93 y el D.S. 82 revisados en la pauta.',
    s.objetados.length ? `Se objetan los rodales ${s.objetados.join(', ')} (${fmt(s.supRechazada)} ha): ${s.objetados.map(n => `R${n}: ${((sol.tecnico.rodales || {})[n] || {}).motivo || 'ver pauta'}`).join(' · ')}.` : '',
    `Conclusión: ${conc}. Superficie que se propone aprobar: ${fmt(s.supAprobada)} ha (rodales ${s.aprobados.join(', ') || '—'}).`,
  ].filter(Boolean).join('\n\n');
}

function borradorInformeJuridico(sol) {
  const a = autoJuridico(sol);
  const ch = sol.juridico.checks || {};
  const nc = PAUTA_JURIDICA.filter(c => ((ch[c.id] || a[c.id] || {}).estado) === 'no_cumple');
  return [
    `INFORME JURÍDICO · Solicitud ${sol.id}`,
    `Interesado: ${sol.interesado.nombre} (RUT ${sol.interesado.rut}), ${sol.interesado.tipo === 'juridica' ? `persona jurídica representada por ${sol.interesado.representante.nombre || '—'}` : 'persona natural'}.`,
    `Dominio: ${(a.J3 || {}).det || '—'}. Profesional: ${(a.J5 || {}).det || '—'}.`,
    nc.length ? `No se cumplen los siguientes requisitos legales: ${nc.map(c => `${c.txt} (${c.art})`).join('; ')}.` : 'Se cumplen los requisitos legales y reglamentarios de los arts. 7° de la Ley 20.283 y 21 a 23 del D.S. 93.',
    `Conclusión: ${CONCLUSION_JUR[sol.juridico.conclusion || (nc.length ? 'desfavorable' : 'favorable')]}.`,
  ].join('\n\n');
}

function propuestaDesde(sol) {
  const s = supAprobadaDe(sol);
  let tipo = s.objetados.length ? (s.aprobados.length ? 'parcial' : 'rechaza') : 'aprueba';
  if (sol.tecnico.conclusion === 'rechazar' || sol.juridico.conclusion === 'desfavorable') tipo = 'rechaza';
  const rods = sol.pmfbn.rodales || [];
  const anioFin = Math.max(new Date().getFullYear() + 1, ...rods.map(r => +r.anioCorta || 0), ...rods.map(r => +(r.reforestacion || {}).anio || 0));
  return { tipo, supAprobada: tipo === 'rechaza' ? 0 : s.supAprobada, supRechazada: tipo === 'rechaza' ? round2(sum(rods, 'superficie')) : s.supRechazada,
    rodalesAprobados: tipo === 'rechaza' ? [] : s.aprobados, rodalesObjetados: tipo === 'rechaza' ? rods.map(r => r.numero) : s.objetados, vigenciaHasta: `${anioFin}-12-31` };
}

function textoResolucion(sol) {
  const p = predio(sol.predioId) || {};
  const pr = sol.resolucion || sol.revisionJA || propuestaDesde(sol);
  const num = sol.resolucion ? `N° ${sol.resolucion.numero}` : 'N° ______ (borrador)';
  const fecha = sol.resolucion ? fmtFecha(sol.resolucion.fecha) : fmtFecha(hoyISO());
  const objetados = (pr.rodalesObjetados || []);
  const mot = objetados.map(n => `rodal ${n}: ${((sol.tecnico.rodales || {})[n] || {}).motivo || 'no se ajusta a los requisitos de la Ley y sus reglamentos'}`).join('; ');
  const jp = sol.resolucion ? usuario(sol.resolucion.firmadaPor).nombre : usuario('jp1').nombre;
  const resuelvo = [];
  if (pr.tipo === 'aprueba' || pr.tipo === 'parcial') {
    resuelvo.push(`APRUÉBASE el ${TIPOS_PLAN[sol.tipoPlan].nombre.toLowerCase()} presentado por ${sol.interesado.nombre}, RUT ${sol.interesado.rut}, para el predio «${p.nombre}», rol de avalúo ${p.rol}, comuna de ${p.comuna}, Región de ${p.region}, en una superficie de ${fmt(pr.supAprobada)} ha correspondiente a los rodales ${(pr.rodalesAprobados || []).join(', ')}, conforme a la cartografía georreferenciada que forma parte de esta resolución.`);
    if (pr.tipo === 'parcial') resuelvo.push(`RECHÁZASE fundadamente la superficie objetada de ${fmt(pr.supRechazada)} ha (${mot}), de conformidad con el art. 6° del D.S. N° 93 de 2008.`);
    resuelvo.push(`El plan estará vigente hasta el ${fmtFecha(pr.vigenciaHasta)}, conforme al calendario aprobado (art. 7° D.S. 93).`);
    resuelvo.push('El interesado deberá dar aviso escrito a la Corporación antes de iniciar las faenas y, cumplido un año desde su inicio, acreditar anualmente el grado de avance (art. 8° Ley 20.283; art. 9° D.S. 93).');
    resuelvo.push('La corta, salvo cortas intermedias, obliga a reforestar o regenerar una superficie igual, a lo menos, a la intervenida (art. 3° D.S. 93), y deberán respetarse las normas de protección ambiental del Título III de la Ley 20.283 y del D.S. N° 82 de 2010.');
    resuelvo.push('Comuníquese al Conservador de Bienes Raíces respectivo para la anotación al margen de la inscripción de dominio (art. 13 Ley 20.283) e incorpórese al registro público de planes de manejo (art. 9° Ley; art. 29 D.S. 93).');
  } else {
    resuelvo.push(`RECHÁZASE el ${TIPOS_PLAN[sol.tipoPlan].nombre.toLowerCase()} presentado por ${sol.interesado.nombre}, RUT ${sol.interesado.rut}, para el predio «${p.nombre}», rol ${p.rol}, por no cumplir los requisitos establecidos en la Ley 20.283 y sus reglamentos (art. 8° inc. 2° Ley 20.283)${mot ? `: ${mot}` : ''}.`);
  }
  resuelvo.push(`Notifíquese al interesado mediante carta certificada dirigida al domicilio señalado en la solicitud dentro de los ${NORMA.plazoNotificarRechazo} días hábiles siguientes (art. 6° D.S. 93).`);
  if (pr.tipo !== 'aprueba') resuelvo.push(`En contra de lo resuelto, el interesado podrá reclamar ante el juez de letras en lo civil del territorio en que se ubica el inmueble, dentro de ${NORMA.plazoReclamo} días contados desde la expedición de la carta certificada (art. 5° D.L. 701; art. 8° Ley 20.283), sin perjuicio de los recursos de la Ley 19.880.`);
  return `CORPORACIÓN NACIONAL FORESTAL · ${sol.oficina.toUpperCase()}
RESOLUCIÓN ${num}
Valdivia, ${fecha}

VISTOS: La Ley N° 20.283 sobre Recuperación del Bosque Nativo y Fomento Forestal; el D.S. N° 93 de 2008 del Ministerio de Agricultura, Reglamento General de dicha ley; el D.S. N° 82 de 2010, Reglamento de Suelos, Aguas y Humedales; el D.L. N° 701 de 1974; la Ley N° 19.880; la solicitud ${sol.id} ingresada el ${fmtFecha(sol.fechaIngreso)}; el informe técnico de ${usuario((sol.tecnico || {}).por).nombre} y el informe jurídico de ${usuario((sol.juridico || {}).por).nombre}.

CONSIDERANDO:
1. Que el interesado presentó un ${TIPOS_PLAN[sol.tipoPlan].nombre.toLowerCase()} para ${fmt(sum(sol.pmfbn.rodales || [], 'superficie'))} ha, elaborado por ${sol.profesional.nombre}, ${sol.profesional.titulo}.
2. Que el informe jurídico concluye: ${CONCLUSION_JUR[sol.juridico.conclusion] || '—'}.
3. Que el informe técnico, revisado por el jefe analista, concluye: ${CONCLUSION_TEC[sol.tecnico.conclusion] || '—'}.
4. Que la Corporación debe pronunciarse dentro de ${NORMA.plazoResolucion} días hábiles desde el ingreso y sólo puede rechazar un plan que no cumpla los requisitos de la ley (art. 8° Ley 20.283).

RESUELVO:
${resuelvo.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Anótese, notifíquese y archívese.

${jp}
Jefe Provincial · ${sol.oficina}`;
}
