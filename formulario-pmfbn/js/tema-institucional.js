/* Agrega el logo institucional (Ministerio de Agricultura · Gobierno de Chile · CONAF) a la barra superior. */
(function () {
  const brand = document.querySelector('.topbar .brand');
  if (!brand) return;
  const wrap = document.createElement('span'); wrap.className = 'brand-logos';
  wrap.innerHTML = '<img class="logo-inst" src="../img/logo-conaf-gobierno.svg" alt="Ministerio de Agricultura, Gobierno de Chile · CONAF" onerror="this.parentNode.classList.add(\'sin-logo\');this.remove()"><span class="logo-fallback"><b>CONAF</b><small>Gobierno de Chile</small></span>';
  brand.insertBefore(wrap, brand.firstChild);
})();
