/* =====================================================================
   SIGPM · Catálogo normativo
   Fuente: «Normativa Forestal», CONAF, edición digital enero 2026.
   Ley 20.283; D.S. 93/2008 (Reglamento General); D.S. 82/2010 (Reglamento
   de Suelos, Aguas y Humedales); Ley 19.880; D.L. 701 art. 5°.
   ===================================================================== */

const NORMA = {
  plazoResolucion: 90,     // días hábiles · art. 8° Ley 20.283 / art. 6° D.S. 93
  plazoModificacion: 60,   // días hábiles · art. 12 Ley / art. 7° D.S. 93
  plazoSubsanar: 5,        // días · art. 31 Ley 19.880
  plazoNotificarRechazo: 10, // días hábiles · art. 6° D.S. 93 (carta certificada)
  plazoReclamo: 30,        // días · art. 5° D.L. 701
  vigenciaDominio: 120,    // días hábiles · art. 22 d) D.S. 93
  vigenciaPersoneria: 90,  // días corridos · art. 23 b) D.S. 93
  semestresProfesional: 10 // art. 7° Ley 20.283
};

/* Comunas declaradas fronterizas por la Dirección de Fronteras y Límites del Estado (DIFROL).
   Fuente: «Comunas Fronterizas — Listado de las Comunas declaradas Fronterizas y Parcialmente-Fronterizas en todo Chile»
   (DIFROL, Portal de Datos Abiertos datos.gob.cl; actualización del 01-02-2013). Se incluyen solo las comunas
   «Completamente» (tipo 'total') y «Parcialmente» (tipo 'parcial') en zona fronteriza; el resto del país no está en zona fronteriza.
   Las solicitudes en estas comunas requieren la aprobación previa de la DIFROL. */
const COMUNAS_FRONTERIZAS = [
  { region: 'XV Región de Arica y Parinacota', comuna: 'General Lagos', tipo: 'total' },
  { region: 'XV Región de Arica y Parinacota', comuna: 'Putre', tipo: 'total' },
  { region: 'XV Región de Arica y Parinacota', comuna: 'Arica', tipo: 'total' },
  { region: 'XV Región de Arica y Parinacota', comuna: 'Camarones', tipo: 'total' },
  { region: 'I Región de Tarapacá', comuna: 'Huara', tipo: 'total' },
  { region: 'I Región de Tarapacá', comuna: 'Camiña', tipo: 'total' },
  { region: 'I Región de Tarapacá', comuna: 'Colchane', tipo: 'total' },
  { region: 'I Región de Tarapacá', comuna: 'Pica', tipo: 'parcial' },
  { region: 'II Región de Antofagasta', comuna: 'Calama', tipo: 'parcial', obs: 'Area Urbana desafectada' },
  { region: 'II Región de Antofagasta', comuna: 'Ollagüe', tipo: 'total' },
  { region: 'II Región de Antofagasta', comuna: 'San Pedro de Atacama', tipo: 'total' },
  { region: 'II Región de Antofagasta', comuna: 'Antofagasta', tipo: 'parcial' },
  { region: 'III Región de Atacama', comuna: 'Diego de Almagro', tipo: 'parcial' },
  { region: 'III Región de Atacama', comuna: 'Copiapó', tipo: 'parcial', obs: 'Area Urbana desafectada' },
  { region: 'III Región de Atacama', comuna: 'Tierra amarilla', tipo: 'total' },
  { region: 'III Región de Atacama', comuna: 'Alto del Carmen', tipo: 'parcial' },
  { region: 'IV Región de Coquimbo', comuna: 'Vicuña', tipo: 'parcial' },
  { region: 'IV Región de Coquimbo', comuna: 'Paihuano', tipo: 'total' },
  { region: 'IV Región de Coquimbo', comuna: 'Río Hurtado', tipo: 'total' },
  { region: 'IV Región de Coquimbo', comuna: 'Monte Patria', tipo: 'total' },
  { region: 'IV Región de Coquimbo', comuna: 'Combarbalá', tipo: 'parcial' },
  { region: 'IV Región de Coquimbo', comuna: 'Illapel', tipo: 'parcial' },
  { region: 'IV Región de Coquimbo', comuna: 'Salamanca', tipo: 'total' },
  { region: 'V Región de Valparaíso', comuna: 'Putaendo', tipo: 'total' },
  { region: 'V Región de Valparaíso', comuna: 'San Esteban', tipo: 'parcial' },
  { region: 'V Región de Valparaíso', comuna: 'Los Andes', tipo: 'parcial', obs: 'Area urbana desafectada' },
  { region: 'V Región de Valparaíso', comuna: 'Juan Fernandez', tipo: 'total' },
  { region: 'V Región de Valparaíso', comuna: 'Isla de Pascua', tipo: 'total' },
  { region: 'VI Región del Libertador General Bernardo O\'Higgins', comuna: 'Machalí', tipo: 'total' },
  { region: 'VI Región del Libertador General Bernardo O\'Higgins', comuna: 'San Fernando', tipo: 'parcial' },
  { region: 'VII Región del Maule', comuna: 'Curicó', tipo: 'parcial' },
  { region: 'VII Región del Maule', comuna: 'Romeral', tipo: 'total' },
  { region: 'VII Región del Maule', comuna: 'Molina', tipo: 'parcial' },
  { region: 'VII Región del Maule', comuna: 'San Clemente', tipo: 'total' },
  { region: 'VII Región del Maule', comuna: 'Colbún', tipo: 'total' },
  { region: 'VIII Región del Biobío', comuna: 'San Fabian', tipo: 'total' },
  { region: 'VIII Región del Biobío', comuna: 'Coihueco', tipo: 'total' },
  { region: 'VIII Región del Biobío', comuna: 'Pinto', tipo: 'total' },
  { region: 'VIII Región del Biobío', comuna: 'Antuco', tipo: 'total' },
  { region: 'VIII Región del Biobío', comuna: 'Santa Bárbara', tipo: 'total' },
  { region: 'VIII Región del Biobío', comuna: 'Alto Biobío', tipo: 'total' },
  { region: 'IX Región de La Araucanía', comuna: 'Lonquimay', tipo: 'total' },
  { region: 'IX Región de La Araucanía', comuna: 'Melipeuco', tipo: 'total' },
  { region: 'IX Región de La Araucanía', comuna: 'Curarrehue', tipo: 'total' },
  { region: 'XIV Región de Los Ríos', comuna: 'Panguipulli', tipo: 'total' },
  { region: 'XIV Región de Los Ríos', comuna: 'Futrono', tipo: 'total' },
  { region: 'XIV Región de Los Ríos', comuna: 'Lago Ranco', tipo: 'total' },
  { region: 'XIV Región de Los Ríos', comuna: 'Río Bueno', tipo: 'total' },
  { region: 'X Región de Los Lagos', comuna: 'Puyehue', tipo: 'parcial' },
  { region: 'X Región de Los Lagos', comuna: 'Puerto Varas', tipo: 'parcial' },
  { region: 'X Región de Los Lagos', comuna: 'Cochamó', tipo: 'total' },
  { region: 'X Región de Los Lagos', comuna: 'Hualaihué', tipo: 'total' },
  { region: 'X Región de Los Lagos', comuna: 'Chaitén', tipo: 'total' },
  { region: 'X Región de Los Lagos', comuna: 'Futaleufú', tipo: 'total' },
  { region: 'X Región de Los Lagos', comuna: 'Palena', tipo: 'total' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Cisne', tipo: 'total' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Aisén', tipo: 'parcial', obs: 'Area Urbana desafectada' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Lago Verde', tipo: 'total' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Coihaique', tipo: 'parcial', obs: 'Area Urbana desafectada' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Río Ibañez', tipo: 'total' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Chile Chico', tipo: 'total' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Cochrane', tipo: 'total' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'Tortel', tipo: 'total' },
  { region: 'XI Región de Aysén del General Carlos Ibañez del Campo', comuna: 'O\'Higgins', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Natales', tipo: 'parcial', obs: 'Area Urbana desafectada' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Torres del Paine', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Laguna Blanca', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'San Gregorio', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Río Verde', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Punta Arenas', tipo: 'parcial', obs: 'Area Urbana desafectada' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Primavera', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Porvenir', tipo: 'parcial', obs: 'Area Urbana desafectada' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Timaukel', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Cabo de Hornos', tipo: 'total' },
  { region: 'XII Región de Magallanes y de Antártica Chilena', comuna: 'Antártica', tipo: 'total' },
  { region: 'Región Metropolitana de Santiago', comuna: 'San José de Maipo', tipo: 'total' },
];

/* Tipos de plan (D.S. 93 arts. 13 a 20) */
const TIPOS_PLAN = {
  PMF:   { nombre: 'Plan de manejo forestal (bosque nativo)', base: 'Art. 5° Ley 20.283; arts. 13 y 14 D.S. 93' },
  PMO:   { nombre: 'Plan de manejo forestal bajo criterio de ordenación', base: 'Art. 15 D.S. 93' },
  PMP:   { nombre: 'Plan de manejo de preservación', base: 'Arts. 4°, 16 y 17 D.S. 93; art. 19 Ley 20.283' },
  PMOC:  { nombre: 'Plan de manejo de corta para obras / cambio de uso', base: 'Art. 21 Ley 20.283; art. 19 D.S. 93' },
};

/* Contenidos mínimos del plan (art. 14 D.S. 93) — se verifican contra el formulario */
const CONTENIDOS_ART14 = [
  ['a', 'Individualización del interesado', f => !!(f.interesado && f.interesado.nombre && f.interesado.rut)],
  ['b', 'Antecedentes generales del predio', f => !!(f.predio && f.predio.nombre && f.predio.rol)],
  ['c', 'Información del recurso forestal del área a intervenir', f => (f.rodales || []).length > 0 && f.rodales.every(r => r.tipoForestal && r.superficie > 0)],
  ['d', 'Definición de los objetivos de manejo', f => !!(f.objetivo && f.objetivo.general)],
  ['e', 'Tratamiento silvicultural consecuente', f => (f.rodales || []).every(r => r.metodo)],
  ['f', 'Calendarización de actividades', f => (f.rodales || []).every(r => r.anioCorta)],
  ['g', 'Prescripciones técnicas y criterios de corta', f => !!(f.prescripciones && f.prescripciones.criterioCorta)],
  ['h', 'Medidas de protección ambiental y sanitaria', f => !!(f.proteccion && Object.values(f.proteccion).some(Boolean))],
  ['i', 'Cartografía digital georreferenciada', (f, sol) => !!(sol && sol.cartografia && sol.cartografia.features && sol.cartografia.features.length)],
];

/* Métodos de corta / tratamientos (D.S. 93 art. 1° y prácticas del formulario) */
const METODOS = {
  'corta_seleccion':  { nombre: 'Corta de selección', intermedia: false },
  'corta_proteccion': { nombre: 'Corta de protección', intermedia: false },
  'arboles_semilleros': { nombre: 'Árboles semilleros', intermedia: false },
  'tala_rasa':        { nombre: 'Tala rasa (en fajas o bosquetes)', intermedia: false },
  'corta_intermedia': { nombre: 'Corta intermedia (raleo / clareo)', intermedia: true },
  'corta_sanitaria':  { nombre: 'Corta sanitaria', intermedia: true },
  'corta_obras':      { nombre: 'Corta para obras (art. 21 Ley)', intermedia: false },
};

const TIPOS_FORESTALES = {
  'RRC': { nombre: 'Roble-Raulí-Coigüe', color: '#5a8f3d', esclerofilo: false },
  'CRT': { nombre: 'Coigüe-Raulí-Tepa', color: '#2f6b4f', esclerofilo: false },
  'SV':  { nombre: 'Siempreverde', color: '#3c7f7a', esclerofilo: false },
  'LEN': { nombre: 'Lenga', color: '#8a9a3c', esclerofilo: false },
  'ROH': { nombre: 'Roble-Hualo', color: '#9b7b3a', esclerofilo: false },
  'ESC': { nombre: 'Esclerófilo', color: '#b58b4c', esclerofilo: true },
  'PAL': { nombre: 'Palma chilena', color: '#c06c3e', esclerofilo: true },
  'ALE': { nombre: 'Alerce', color: '#7a4a2b', esclerofilo: false },
  'ARA': { nombre: 'Araucaria', color: '#5b5a2a', esclerofilo: false },
  'CIP': { nombre: 'Ciprés de la cordillera', color: '#6d7f4a', esclerofilo: false },
  'CGU': { nombre: 'Ciprés de las Guaitecas', color: '#556b2f', esclerofilo: false },
  'CMA': { nombre: 'Coigüe de Magallanes', color: '#40695a', esclerofilo: false },
  'OTR': { nombre: 'Otros', color: '#8d8d8d', esclerofilo: false },
};
/* Equivalencias con las listas del formulario oficial (Aplicación web de plan de manejo) */
const TF_APP = { 'Roble - Raulí - Coigüe': 'RRC', 'Coigüe - Raulí - Tepa': 'CRT', 'Siempreverde': 'SV', 'Lenga': 'LEN', 'Roble - Hualo': 'ROH', 'Esclerófilo': 'ESC',
  'Ciprés de la Cordillera': 'CIP', 'Ciprés de las Guaitecas': 'CGU', 'Coigüe de Magallanes': 'CMA', 'Alerce': 'ALE', 'Araucaria': 'ARA', 'Palma chilena': 'PAL', 'Otros': 'OTR' };

/* Cobertura arbórea/arbustiva mínima remanente (D.S. 82 arts. 7° y 8°) */
function coberturaMinima({ tipo, pendiente, precipitacion, region }) {
  const tf = TIPOS_FORESTALES[tipo] || {};
  const austral = /ays[eé]n|magallanes/i.test(region || '');
  if (tf.esclerofilo) {
    if (pendiente >= 45) return { min: 40, art: 'Art. 7° D.S. 82 (esclerófilo/palma, pendiente ≥ 45 %)', nota: 'En suelos graníticos el mínimo es 60 %.' };
    return { min: 20, art: 'Art. 7° D.S. 82 (esclerófilo/palma, pendiente < 45 %)' };
  }
  if (!austral && (pendiente > 60 || precipitacion > 1500)) return { min: 60, art: 'Art. 8° inc. 2° D.S. 82 (pendiente > 60 % o pp > 1.500 mm)' };
  if (pendiente >= 45) return { min: 40, art: 'Art. 8° D.S. 82 (pendiente ≥ 45 %)' };
  return { min: 30, art: 'Art. 8° D.S. 82 (pendiente < 45 %)' };
}

/* Zonas de protección de cursos de agua (D.S. 82 art. 1° letras p y q) */
function anchosProteccion(seccion, pendiente) {
  // seccion: 'menor02' (< 0,2 m²), 'entre02y05' (0,2 – 0,5 m²), 'mayor05' (> 0,5 m²), 'cuerpo' (manantial o cuerpo de agua)
  let exclusion = 0, manejo = 0;
  if (seccion === 'entre02y05') exclusion = 5;
  if (seccion === 'mayor05' || seccion === 'cuerpo') exclusion = 10;
  if (seccion === 'mayor05' || seccion === 'cuerpo') manejo = pendiente > 45 ? 20 : pendiente >= 30 ? 10 : 0;
  return { exclusion, manejo };
}

/* Documentos de la solicitud (arts. 21, 22 y 23 D.S. 93) */
const DOCUMENTOS = [
  { key: 'plan',       nombre: 'Plan de manejo en formulario oficial', art: 'Art. 22 a) D.S. 93', siempre: true },
  { key: 'carto',      nombre: 'Cartografía digital georreferenciada', art: 'Art. 22 b) D.S. 93', siempre: true },
  { key: 'ci',         nombre: 'Copia de cédula de identidad o RUT del interesado', art: 'Art. 22 c) D.S. 93', siempre: true },
  { key: 'dominio',    nombre: 'Inscripción de dominio con certificado de vigencia (≤ 120 días hábiles)', art: 'Art. 22 d) D.S. 93', siempre: true, vence: 'dominio' },
  { key: 'titulo',     nombre: 'Certificado de título del profesional (copia autorizada)', art: 'Art. 22 e) D.S. 93; art. 7° Ley', siempre: true },
  { key: 'firma',      nombre: 'Plan firmado por el interesado y el profesional', art: 'Art. 7° Ley; art. 21 D.S. 93', siempre: true },
  { key: 'rut_pj',     nombre: 'RUT de la persona jurídica y de su representante legal', art: 'Art. 23 a) D.S. 93', cuando: s => s.interesado.tipo === 'juridica' },
  { key: 'personeria', nombre: 'Personería, vigencia y representación (≤ 90 días corridos)', art: 'Art. 23 b) D.S. 93', cuando: s => s.interesado.tipo === 'juridica', vence: 'personeria' },
  { key: 'bbnn',       nombre: 'Certificado de regularización de títulos (Bienes Nacionales)', art: 'Art. 22 f) D.S. 93', cuando: s => s.interesado.calidad === 'poseedor' },
  { key: 'servidumbre',nombre: 'Documento de servidumbre o concesión', art: 'Art. 22 g) D.S. 93; art. 7° inc. 4° Ley', cuando: s => s.tipoPlan === 'PMOC' },
  { key: 'fiscal',     nombre: 'Concesión o arriendo fiscal y firma SEREMI de Bienes Nacionales', art: 'Art. 22 h) y 21 D.S. 93', cuando: s => s.interesado.calidad === 'fiscal' },
  { key: 'pequeno',    nombre: 'Declaración jurada de pequeño propietario forestal', art: 'Art. 22 i) D.S. 93', cuando: s => !!s.interesado.pequenoPropietario },
];
function documentosRequeridos(sol) { return DOCUMENTOS.filter(d => d.siempre || (d.cuando && d.cuando(sol))); }

/* Pauta jurídica (abogado) */
const PAUTA_JURIDICA = [
  { id: 'J1', txt: 'Individualización del interesado o representante legal y del predio con superficie afecta', art: 'Art. 22 inc. 1° D.S. 93' },
  { id: 'J2', txt: 'Copia de cédula de identidad o RUT', art: 'Art. 22 c) D.S. 93', doc: 'ci' },
  { id: 'J3', txt: 'Dominio acreditado con certificado de vigencia de no más de 120 días hábiles', art: 'Art. 22 d) D.S. 93', doc: 'dominio', auto: 'dominio' },
  { id: 'J4', txt: 'Persona jurídica: RUT, personería, vigencia y representación (≤ 90 días corridos)', art: 'Art. 23 D.S. 93', doc: 'personeria', auto: 'personeria', aplica: s => s.interesado.tipo === 'juridica' },
  { id: 'J5', txt: 'Profesional habilitado: título del art. 7° y plan de estudios de al menos 10 semestres', art: 'Art. 7° Ley 20.283; art. 22 e) D.S. 93', doc: 'titulo', auto: 'profesional' },
  { id: 'J6', txt: 'Plan suscrito por el interesado y por el profesional que lo elaboró', art: 'Art. 7° Ley; art. 21 D.S. 93', doc: 'firma' },
  { id: 'J7', txt: 'Poseedor en regularización: certificado de inicio del trámite (D.L. 2.695)', art: 'Art. 22 f) D.S. 93', doc: 'bbnn', aplica: s => s.interesado.calidad === 'poseedor' },
  { id: 'J8', txt: 'Obras o concesiones: título de servidumbre o concesión; presentado por el titular', art: 'Art. 7° inc. 4° Ley; art. 22 g) D.S. 93', doc: 'servidumbre', aplica: s => s.tipoPlan === 'PMOC' },
  { id: 'J9', txt: 'Bosque fiscal: suscrito por concesionario/arrendatario y SEREMI de Bienes Nacionales', art: 'Art. 7° inc. final Ley; arts. 21 y 22 h) D.S. 93', doc: 'fiscal', aplica: s => s.interesado.calidad === 'fiscal' },
  { id: 'J10', txt: 'Solicitud presentada en la oficina competente según ubicación del predio', art: 'Art. 2° D.S. 93' },
  { id: 'J11', txt: 'Coincidencia entre rol, inscripción de dominio y predio cartografiado', art: 'Arts. 22 y 29 D.S. 93' },
  { id: 'J12', txt: 'Pequeño propietario: declaración jurada e inscripción ≤ 120 días hábiles', art: 'Art. 22 i) D.S. 93; art. 2° N° 17 Ley', doc: 'pequeno', aplica: s => !!s.interesado.pequenoPropietario },
];

/* Pauta técnica (analista / jefe analista) */
const PAUTA_TECNICA = [
  { id: 'T1',  txt: 'Contenidos mínimos del plan (letras a–i)', art: 'Art. 14 D.S. 93', auto: 'art14' },
  { id: 'T2',  txt: 'Información detallada del recurso forestal en el área a intervenir', art: 'Art. 6° Ley 20.283' },
  { id: 'T3',  txt: 'Objetivos de manejo definidos y coherentes con el tipo de bosque', art: 'Art. 14 d) D.S. 93' },
  { id: 'T4',  txt: 'Tratamiento silvicultural consecuente con los objetivos', art: 'Art. 14 e) D.S. 93' },
  { id: 'T5',  txt: 'Calendarización y criterios de corta para orientar las faenas', art: 'Arts. 9° y 14 f–g) D.S. 93' },
  { id: 'T6',  txt: 'Reforestación o regeneración de superficie igual o mayor a la cortada (salvo cortas intermedias)', art: 'Art. 3° D.S. 93', auto: 'reforestacion' },
  { id: 'T7',  txt: 'Cobertura arbórea remanente mínima por rodal', art: 'Arts. 7° y 8° D.S. 82', auto: 'cobertura' },
  { id: 'T8',  txt: 'Zonas de protección de cursos y cuerpos de agua (exclusión y manejo limitado)', art: 'Arts. 1° p–q, 3°, 4° y 5° D.S. 82', auto: 'agua' },
  { id: 'T9',  txt: 'Bosque de conservación y protección: justificación técnica de métodos y medidas', art: 'Art. 2° N° 5 y art. 16 Ley 20.283', auto: 'conservacion' },
  { id: 'T10', txt: 'Sin intervención a menos de 500 m de glaciares', art: 'Art. 17 Ley 20.283', auto: 'glaciar' },
  { id: 'T11', txt: 'Sin corta de especies en categoría de conservación ni alteración de su hábitat', art: 'Art. 19 Ley 20.283', auto: 'especies' },
  { id: 'T12', txt: 'Humedales prioritarios o Ramsar: vegetación hidrófila y faja de 10 m', art: 'Arts. 10 y 12 D.S. 82', auto: 'humedal' },
  { id: 'T13', txt: 'Bosque de preservación / áreas protegidas: requiere plan de preservación', art: 'Art. 2° N° 4 Ley; art. 4° D.S. 93', auto: 'preservacion' },
  { id: 'T14', txt: 'Suelos de profundidad menor a 20 cm sin corta', art: 'Art. 9° D.S. 82' },
  { id: 'T15', txt: 'Caminos y vías de saca conforme a requisitos de diseño', art: 'Art. 17 D.S. 82' },
  { id: 'T16', txt: 'Medidas para evitar erosión, sedimentos y alteración de cursos de agua', art: 'Art. 18 D.S. 82; art. 15 Ley' },
  { id: 'T17', txt: 'Cartografía conforme: área dentro del predio y superficie consistente', art: 'Art. 14 i) D.S. 93', auto: 'cartografia' },
];

/* Feriados legales (referenciales) para el cómputo de días hábiles — Ley 19.880 art. 25 */
const FERIADOS = new Set([
  '2025-01-01','2025-04-18','2025-04-19','2025-05-01','2025-05-21','2025-06-20','2025-06-29','2025-07-16','2025-08-15',
  '2025-09-18','2025-09-19','2025-10-12','2025-10-31','2025-11-01','2025-11-16','2025-12-08','2025-12-14','2025-12-25',
  '2026-01-01','2026-04-03','2026-04-04','2026-05-01','2026-05-21','2026-06-21','2026-06-29','2026-07-16','2026-08-15',
  '2026-09-18','2026-09-19','2026-10-12','2026-10-31','2026-11-01','2026-12-08','2026-12-25',
  '2027-01-01','2027-03-26','2027-03-27','2027-05-01','2027-05-21','2027-06-21','2027-06-29','2027-07-16','2027-08-15',
  '2027-09-17','2027-09-18','2027-09-19','2027-10-11','2027-10-31','2027-11-01','2027-12-08','2027-12-25',
]);

/* Estados del procedimiento */
const ESTADOS = {
  recepcion:   { nombre: 'En recepción', rol: 'ST', paso: 0, color: 'neutral' },
  subsanacion: { nombre: 'Requerimiento art. 31', rol: 'ST', paso: 0, color: 'warn' },
  asignacion:  { nombre: 'Por asignar', rol: 'JA', paso: 1, color: 'info' },
  evaluacion:  { nombre: 'En evaluación', rol: 'AN', paso: 2, color: 'info' },
  revision:    { nombre: 'Revisión jefe analista', rol: 'JA', paso: 3, color: 'info' },
  firma:       { nombre: 'Para firma jefe provincial', rol: 'JP', paso: 4, color: 'accent' },
  resuelta:    { nombre: 'Resuelta · por notificar', rol: 'ST', paso: 5, color: 'ok' },
  notificada:  { nombre: 'Notificada', rol: null, paso: 6, color: 'ok' },
  desistida:   { nombre: 'Desistida', rol: null, paso: 6, color: 'bad' },
};
const PASOS = ['Recepción', 'Asignación', 'Evaluación', 'Revisión', 'Firma', 'Notificación'];

/* Provincia de cada comuna de la Región de Los Ríos */
const PROVINCIA_DE_COMUNA = { Valdivia: 'Valdivia', Corral: 'Valdivia', Lanco: 'Valdivia', 'Los Lagos': 'Valdivia', 'Máfil': 'Valdivia', Mariquina: 'Valdivia', Paillaco: 'Valdivia', Panguipulli: 'Valdivia', 'La Unión': 'Ranco', Futrono: 'Ranco', 'Lago Ranco': 'Ranco', 'Río Bueno': 'Ranco' };
const provinciaDe = comuna => { const k = Object.keys(PROVINCIA_DE_COMUNA).find(c => norm(c) === norm(comuna)); return k ? PROVINCIA_DE_COMUNA[k] : 'Valdivia'; };
const comunaOficial = comuna => Object.keys(PROVINCIA_DE_COMUNA).find(c => norm(c) === norm(comuna)) || String(comuna || '').trim();

const ROLES = {
  ST: 'Secretaría técnica',
  JA: 'Jefe analista',
  AN: 'Analista',
  AB: 'Abogado (Unidad Jurídica)',
  JP: 'Jefe provincial',
  PR: 'Propietario',
  CO: 'Consultor',
};
