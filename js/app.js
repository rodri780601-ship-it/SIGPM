/* =====================================================================
   SIGPM · Arranque, navegación y selector de usuario
   ===================================================================== */
function route() {
  limpiarMapas();
  const main = $('#main');
  main.onmouseover = main.onmouseleave = null; // la bandeja los fija para resaltar predios en su mapa
  const h = decodeURIComponent((location.hash || '#bandeja').slice(1)).split('/');
  const [v, a, b] = h;
  $$('.nav a').forEach(x => x.classList.toggle('on', x.dataset.v === v || (['exp', 'proyecto'].includes(v) && x.dataset.v === 'bandeja') || (v === 'predio' && x.dataset.v === (esExterno() ? 'bandeja' : 'mapa'))));
  try {
    switch (v) {
      case 'mapa': if (esExterno()) sinPermiso(main); else vistaMapa(main); break;
      case 'proyecto': vistaProyecto(main, a, b); break;
      case 'predio': vistaPredio(main, a); break;
      case 'registro': vistaRegistro(main); break;
      case 'normativa': vistaNormativa(main); break;
      case 'nueva': vistaNueva(main, a); break;
      case 'exp': vistaExpediente(main, a, b); break;
      default: vistaBandeja(main);
    }
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="alert bad"><b>Error al mostrar la vista.</b> ${esc(e.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

function pintarUsuario() {
  if (!USUARIO) return;
  $('#user-nom').textContent = USUARIO.nombre;
  $('#user-rol').textContent = `${ROLES[USUARIO.rol]} · ${USUARIO.oficina}`;
  $$('.only-st').forEach(x => x.hidden = USUARIO.rol !== 'ST');
  $$('.only-int').forEach(x => x.hidden = esExterno());
}

/* ---------- Pantalla de ingreso (estilo portada institucional) ---------- */
const PORTADA = [
  ['img/portada1.jpg', 'Bosque de araucarias'], ['img/portada2.jpg', 'Interior de bosque nativo siempreverde'],
  ['img/portada3.jpg', 'Bosque nativo caducifolio en otoño'], ['img/portada4.jpg', 'Bosque nativo junto a un fiordo de Aysén'],
];
let carruselTimer = null;
function mostrarLogin(msg) {
  limpiarMapas();
  document.body.classList.add('en-login');
  $('.top-wrap').hidden = true; $('#main').hidden = true;
  const L = $('#login'); L.hidden = false;
  const fila = u => `<button type="button" class="demo-acc" data-u="${esc(u.usuario)}"><b>${esc(u.nombre)}</b><code>${esc(u.usuario)}</code></button>`;
  L.innerHTML = `
    <header class="lg-head">${logoHTML()}<div class="lg-sistema"><b>SIGPM</b><span>Planes de Manejo de Bosque Nativo · Ley N° 20.283</span></div></header>
    <div class="franja-inst" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="lg-maqueta" role="note"><b>Maqueta de demostración.</b> No es un servicio oficial en funcionamiento: las cuentas, los predios y las solicitudes son ficticios.</div>
    <div class="lg-main">
      <section class="lg-carrusel" aria-label="Bosques nativos de Chile">${PORTADA.map(([src, alt], i) => `<figure class="lg-slide ${i ? '' : 'activo'}" style="background-image:url('${src}')" role="img" aria-label="${esc(alt)}"></figure>`).join('')}</section>
      <section class="lg-card lg-ingreso" aria-labelledby="login-t">
        <h1 id="login-t">Ingreso de usuarios</h1>
        <p class="muted small">Sistema de Gestión de Planes de Manejo de Bosque Nativo</p>
        <form id="login-form" autocomplete="off" novalidate>
          <label for="lg-u">Usuario</label><input id="lg-u" name="usuario" autocomplete="username" required>
          <label for="lg-c">Contraseña</label><input id="lg-c" name="clave" type="password" autocomplete="current-password" required>
          <p class="login-err" id="lg-err" role="alert">${msg ? esc(msg) : ''}</p>
          <button class="btn login-btn" type="submit">Ingresar</button>
        </form>
        <div class="lg-importante"><b>Importante</b><br>Recepción, evaluación técnica y jurídica, y resolución de planes de manejo de corta de bosque nativo con base en la ficha predial georreferenciada.</div>
      </section>
      <aside class="lg-card lg-demo" aria-labelledby="lg-demo-t">
        <h2 id="lg-demo-t">Cuentas de demostración</h2>
        <p class="small" style="margin:0;color:#4d5650">Contraseña de todas las cuentas: <code>demo2026</code>. Haga clic en una cuenta para completar el formulario.</p>
        <div class="demo-grupos">${Object.keys(ROLES).map(r => `<div class="demo-grupo"><div class="demo-gt">${esc(ROLES[r])}</div>${USUARIOS.filter(u => u.rol === r).map(fila).join('')}</div>`).join('')}</div>
      </aside>
      ${bloqueEjemplosHTML()}
    </div>
    <footer class="lg-pie"><div class="lg-pie-cols">
      <div><img src="img/logo-conaf-gobierno-gris.png" alt="Ministerio de Agricultura, Gobierno de Chile · CONAF"><b>Servicios en Línea</b></div>
      <div><b>Consultas</b><p>Para consultas de carácter general, reclamos o sugerencias, contáctese con la Oficina de Informaciones, Reclamos y Sugerencias (OIRS) de CONAF en <a href="https://oirs.conaf.cl" target="_blank" rel="noopener">oirs.conaf.cl</a>.</p></div>
      <div><b>Corporación Nacional Forestal · CONAF</b><p>Paseo Bulnes 259, Depto. 406<br>Santiago, Chile<br><a href="https://www.conaf.cl" target="_blank" rel="noopener">www.conaf.cl</a></p></div>
    </div><div class="lg-pie-legal">SIGPM · Planes de Manejo de Bosque Nativo — maqueta de demostración</div></footer>`;
  clearInterval(carruselTimer);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let k = 0; const sl = $$('.lg-slide', L);
    carruselTimer = setInterval(() => { if (L.hidden) { clearInterval(carruselTimer); return; } sl[k].classList.remove('activo'); k = (k + 1) % sl.length; sl[k].classList.add('activo'); }, 6000);
  }
  bindEjemplos(L);
  $$('.demo-acc', L).forEach(b => b.addEventListener('click', () => { $('#lg-u').value = b.dataset.u; $('#lg-c').value = 'demo2026'; $('#lg-c').focus(); }));
  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    const u = iniciarSesion($('#lg-u').value, $('#lg-c').value);
    if (!u) { $('#lg-err').textContent = 'Usuario o contraseña incorrectos. Revise las cuentas de demostración.'; $('#lg-c').value = ''; $('#lg-c').focus(); return; }
    clearInterval(carruselTimer);
    entrar();
  });
  $('#lg-u').focus();
}
/* ---------- Datos de ejemplo en la portada (solo para pruebas del sistema) ---------- */
function bloqueEjemplosHTML() {
  const r = resumenDatos(), todos = r.ejemplos === PREDIOS_SEED.length;
  const estado = r.ejemplos ? `Cargados: ${r.ejemplos} predios de ejemplo con sus solicitudes, tickets y proyectos.` : 'No hay datos de ejemplo cargados.';
  return `<aside class="lg-card lg-ejemplos" aria-labelledby="lg-ej-t"><h2 id="lg-ej-t">Datos de ejemplo</h2>
    <p class="small"><b>Solo para pruebas del sistema.</b> Predios, personas, RUT, solicitudes y capas de referencia ficticios. No los use para tramitar solicitudes reales.</p>
    <p class="small" id="lg-ej-estado">${esc(estado)}${r.propios ? ` Registros propios en este navegador: ${r.propios} (se conservan).` : ''}</p>
    <div class="lg-ej-btns"><button type="button" class="btn sm" id="lg-ej-cargar" ${todos ? 'disabled' : ''}>Cargar ejemplos</button>
      <button type="button" class="btn sm ghost danger" id="lg-ej-borrar" ${r.ejemplos ? '' : 'disabled'}>Borrar ejemplos</button></div></aside>`;
}
function bindEjemplos(L) {
  $('#lg-ej-borrar', L).addEventListener('click', async () => {
    const r = resumenDatos();
    const ok = await modal({ titulo: 'Borrar los datos de ejemplo', html: `<p>Se eliminarán de este navegador los ${r.ejemplos} predios de ejemplo, con sus solicitudes, tickets y proyectos, y las capas de referencia ficticias.</p>
        <p>${r.propios ? `Se conservan sus ${r.propios} registros propios (fichas prediales creadas por usted y lo que dependa de ellas).` : 'No hay registros propios: el sistema quedará vacío.'} Las cuentas de demostración siguen disponibles.</p>
        <p class="muted small">Puede volver a cargarlos cuando quiera con «Cargar ejemplos».</p>`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Borrar ejemplos', valor: true, cls: 'danger' }] });
    if (!ok) return;
    borrarEjemplos(); mostrarLogin(); toast('Datos de ejemplo borrados', 'ok');
  });
  $('#lg-ej-cargar', L).addEventListener('click', async () => {
    const r = resumenDatos();
    const ok = await modal({ titulo: 'Cargar los datos de ejemplo', html: `<p>Se cargarán predios, solicitudes en todas las etapas, tickets y proyectos <b>ficticios</b>, solo para probar el sistema.</p>
        ${r.ejemplos ? '<p>Los ejemplos que ya estaban vuelven a su estado inicial.</p>' : ''}${r.propios ? `<p>Se conservan sus ${r.propios} registros propios. Si alguno tiene el mismo número que un ejemplo, recibe un número nuevo.</p>` : ''}`,
      botones: [{ txt: 'Cancelar' }, { txt: 'Cargar ejemplos', valor: true }] });
    if (!ok) return;
    try { const x = cargarEjemplos(); mostrarLogin(); toast(`Datos de ejemplo cargados${x.renumeradas ? ` · ${x.renumeradas} registro(s) propio(s) renumerado(s)` : ''}`, 'ok'); }
    catch (e) { console.error(e); toast('No se pudieron cargar los ejemplos: ' + e.message, 'error'); }
  });
}
function entrar() {
  document.body.classList.remove('en-login');
  $('#login').hidden = true; $('.top-wrap').hidden = false; $('#main').hidden = false;
  pintarUsuario();
  if (!location.hash || location.hash === '#login') location.hash = '#bandeja';
  route();
  toast(`Bienvenido/a, ${USUARIO.nombre}`, 'ok');
}

/* Logo institucional (Ministerio de Agricultura · Gobierno de Chile · CONAF). Si falta, se muestra texto. */
function logoHTML() {
  return `<span class="brand-logos"><img class="logo-inst" src="img/logo-conaf-gobierno.svg" alt="Ministerio de Agricultura, Gobierno de Chile · Corporación Nacional Forestal (CONAF)" onerror="this.parentNode.classList.add('sin-logo');this.remove()"><span class="logo-fallback"><b>CONAF</b><small>Gobierno de Chile</small></span></span>`;
}

window.addEventListener('DOMContentLoaded', () => {
  const faltan = ['L', 'turf', 'proj4'].filter(k => typeof window[k] === 'undefined');
  if (faltan.length) { $('#main').innerHTML = `<div class="alert bad"><b>No se cargaron las librerías del mapa (${faltan.join(', ')}).</b> El sistema necesita conexión a cdnjs.cloudflare.com.</div>`; return; }
  initProj();
  if (!cargar()) {
    try { DB = generarSemilla(); guardar(); }
    catch (e) { console.error(e); $('#main').innerHTML = `<div class="alert bad"><b>Error al generar los datos de demostración.</b><pre>${esc(e.stack || e.message)}</pre></div>`; return; }
  } else migrarDatos();
  $('#brand-logos').outerHTML = logoHTML();
  $('#btn-logout').addEventListener('click', () => { cerrarSesion(); location.hash = ''; mostrarLogin(); });
  $('#btn-reset').addEventListener('click', async () => {
    const ok = await modal({ titulo: 'Restablecer datos de demostración', html: '<p>Se borrarán las solicitudes y cambios guardados en este navegador y se cargarán los datos ficticios iniciales.</p>', botones: [{ txt: 'Cancelar' }, { txt: 'Restablecer', valor: true, cls: 'danger' }] });
    if (ok) { reiniciarDatos(); pintarUsuario(); location.hash = '#bandeja'; route(); toast('Datos restablecidos', 'ok'); }
  });
  $('#btn-export').addEventListener('click', () => descargar(`sigpm_respaldo_${hoyISO()}.json`, JSON.stringify(DB), 'application/json'));
  window.addEventListener('hashchange', () => { if (!USUARIO) return; route(); pintarUsuario(); });
  const g = usuarioGuardado();
  if (g && usuario(g).rol) { setUsuario(g); entrar(); } else mostrarLogin();
});
