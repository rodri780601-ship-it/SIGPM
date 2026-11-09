# SIGPM · Sistema de Gestión de Planes de Manejo de Bosque Nativo

Maqueta funcional (HTML, CSS y JavaScript, sin servidor) para recepcionar, evaluar y resolver solicitudes de planes de manejo de corta de bosque nativo. Su base es geoespacial: cada solicitud cuelga de una **ficha predial** con su cartografía.

> Todos los predios, personas, RUT, resoluciones y capas de referencia (áreas protegidas, humedales, glaciares, especies) son **ficticios**.

## Cómo usarlo

1. Publique la carpeta en GitHub Pages o en cualquier servidor web estático. También puede abrirla en local con `python -m http.server` y visitar `http://localhost:8000`.
2. Ingrese con una de las cuentas de demostración (ver abajo).
3. Los datos se guardan en el navegador (`localStorage`). Con ↺ vuelve a los datos de demostración y con ⤓ descarga un respaldo JSON.

Requiere conexión a `cdnjs.cloudflare.com` (Leaflet, Turf, proj4) y a `unpkg.com` (lector de shapefile).

## Ingreso de usuarios (demostración)

Al abrir el sistema aparece la pantalla de ingreso. Todas las cuentas usan la contraseña `demo2026`:

| Perfil | Usuario | Nombre (ficticio) |
|---|---|---|
| Secretaría técnica | `secretaria` | Marcela Torres Vidal |
| Jefe analista | `jefe.analista` | Jorge Pérez Alarcón |
| Analista | `analista1`, `analista2`, `analista3` | Camila Henríquez · Rodrigo Mansilla · Valentina Oyarzún |
| Abogado (Unidad Jurídica) | `abogado1`, `abogado2` | Andrés Contreras · Francisca Barrientos |
| Jefe provincial | `jefe.provincial` | Patricio Saavedra Núñez |
| Propietario | `propietario1` (2 predios), `propietario2` (1 predio) | Agrícola y Forestal Los Ulmos Ltda. · Juan Carlos Vera Oyarzo |
| Consultor | `consultor1`, `consultor2` | Ignacio Fuentes · Daniela Riquelme |

El ingreso es solo una simulación: las credenciales están en `js/store.js` y no hay autenticación real. En producción se debe usar la autenticación institucional (por ejemplo, ClaveÚnica o el directorio de CONAF) en un servidor.

## Identidad institucional

Se tomó del proyecto **Tabla-de-Rodal-V2**, que replica la portada de la Oficina Virtual de CONAF:

- **Logo:** el logo institucional del Ministerio de Agricultura, Gobierno de Chile y CONAF (`img/logo-conaf-gobierno.svg`), con una versión gris para el pie de página.
- **Paleta:** azul `#0064a9`, rojo `#c4373b` y verde `#398245`, con la franja tricolor bajo el encabezado.
- **Tipografía:** sans del sistema (Segoe UI).
- **Pantalla de ingreso:** encabezado blanco con el logo, carrusel de fotografías, recuadro de ingreso, cuentas de demostración y pie con los datos de la OIRS.

Todo se define en `css/tema-institucional.css`. La Aplicación web de plan de manejo usa el mismo tema mediante `formulario-pmfbn/css/tema-institucional.css`.

## Flujo y roles

| Etapa | Rol | Qué hace |
|---|---|---|
| Recepción | Secretaría técnica | Crea la solicitud, individualiza al interesado y al profesional, registra los antecedentes (arts. 21–23 D.S. 93), carga el formulario PMFBN y la cartografía. Si falta algo, emite un requerimiento con plazo de 5 días (art. 31 Ley 19.880). Al ingresar comienza el plazo de 90 días hábiles (art. 8° Ley 20.283). |
| Asignación | Jefe analista | Asigna un analista y un abogado de la unidad jurídica. |
| Evaluación | Analista (y jefe analista) | Aplica la pauta técnica, con 17 requisitos y verificación espacial automática. Decide por rodal (aprobar u objetar con fundamento), registra la visita a terreno y emite el informe técnico. |
| Evaluación | Abogado | Aplica la pauta jurídica (12 requisitos, con control automático de la vigencia de dominio, la personería y la habilitación del profesional) y emite el informe jurídico. |
| Revisión | Jefe analista | Recibe ambos informes y verifica que el análisis técnico esté bien hecho. Puede devolverlo al analista o al abogado, o enviar el proyecto de resolución. |
| Firma | Jefe provincial | Revisa el proyecto de resolución (aprueba, aprueba parcialmente o rechaza) y lo firma o lo devuelve. |
| Notificación | Secretaría técnica | Registra la carta certificada (10 días hábiles, art. 6° D.S. 93). El plan aprobado queda en la ficha predial y en el registro público (art. 29 D.S. 93). |

## Portal externo: propietarios y consultores

Antes de la recepción, un plan puede nacer fuera de CONAF:

1. **Ticket.** El propietario crea un ticket desde la ficha predial: elige al consultor y la fecha límite. Se genera un código `TK-XXXX-XXXX` que solo sirve para ese consultor y esa ficha.
2. **Acceso.** El consultor ingresa el código en *Mi bandeja* y accede a la ficha predial mientras el ticket esté vigente.
3. **Proyecto.** Desde la ficha crea el proyecto, que copia los datos del predio, del propietario y del consultor al formulario.
4. **Congelamiento.** El propietario puede revocar un ticket en cualquier momento. Si el ticket vence o se revoca con el proyecto en elaboración, queda en solo lectura. Se reactiva con un ticket nuevo del propietario para el mismo consultor y predio.
5. **Revisión.** El consultor envía el proyecto al propietario, que puede devolverlo con observaciones o enviarlo a CONAF.
6. **Recepción.** Al enviarlo nace la solicitud en estado *En recepción*, en la bandeja de la secretaría técnica. El plazo legal corre desde su ingreso.

En su ficha predial, el propietario tiene dos vistas del historial: **Planes con resolución firmada**, desde donde abre solo la resolución y el formulario, y **Solicitudes en evaluación**, con la línea de tiempo de la etapa, el plazo legal y los requerimientos pendientes, sin acceso a documentos ni informes.

Los proyectos se guardan en `DB.proyectos`, separados de las solicitudes, de modo que CONAF no ve borradores. En la maqueta el envío del código es un correo simulado, visible en la bandeja del consultor, y los permisos se aplican solo en el navegador: en producción deben validarse en el servidor.

El botón **Llenar con ejemplo** del proyecto genera un plan completo con datos ficticios a partir de la ficha predial (`js/ejemplo.js`), incluidos inventario y cartografía. La aplicación calcula y revisa ese plan igual que uno real, y el historial del proyecto deja constancia de que es un ejemplo.

Para probarlo: `consultor1` tiene un código por usar del predio Los Ulmos Bajo y un proyecto congelado en Hijuela Cuesta Alerce, que se reactiva con un ticket de `propietario2`.

## Análisis espacial automático

Para cada rodal del área a intervenir:

- Superficie SIG frente a la declarada, y área fuera del límite predial (art. 14 i D.S. 93).
- Zonas de exclusión y de manejo limitado en cursos de agua según la sección del cauce y la pendiente, con la cobertura de 50 % exigida (D.S. 82 arts. 1°, 3°–5°).
- Franja de 200 m de cursos de agua y pendiente ≥ 45 %: bosque de conservación y protección, que exige justificación técnica (arts. 2° N° 5 y 16 Ley 20.283).
- 500 m de glaciares (art. 17 Ley), áreas protegidas o bosque de preservación (art. 4° D.S. 93), humedales prioritarios y su faja de 10 m (D.S. 82 arts. 10 y 12), y especies en categoría de conservación (art. 19 Ley).
- Cobertura remanente mínima según tipo forestal, pendiente y precipitación (D.S. 82 arts. 7° y 8°).
- Reforestación o regeneración igual o mayor a la superficie cortada, salvo cortas intermedias (art. 3° D.S. 93).

## Formulario PMFBN: Aplicación web de plan de manejo integrada

La carpeta `formulario-pmfbn/` contiene la **Aplicación web de plan de manejo** (https://rodri780601-ship-it.github.io/Plan-de-manejo/). Funciona con todas sus capacidades: inventario, tabla de rodal, gráficos, cartografía del capítulo 13 y revisión.

- La secretaría técnica la abre desde *Formulario PMFBN*. Llega prellenada con los datos ya registrados en SIGPM y con la cartografía del predio.
- Al terminar, usa **Enviar a SIGPM**. SIGPM guarda el proyecto completo y extrae los datos que usan la pauta técnica y el análisis espacial.
- Analista, abogado y jefaturas ven el plan completo en modo de solo lectura.
- También se puede importar el `.json` de «Exportar proyecto».

Los detalles y las equivalencias de campos están en `formulario-pmfbn/CONTRATO.md`.

## Estructura

```
index.html
css/estilos.css
js/normativa.js     catálogo normativo: plazos, pautas, umbrales D.S. 82, feriados
js/util.js          DOM, fechas y días hábiles, RUT, diálogos
js/geo.js           sistemas de referencia, lectura de shapefile/GeoJSON/KML, análisis espacial, mapas
js/store.js         datos en el navegador, permisos por rol y transiciones del procedimiento
js/pmfbn.js         formulario PMFBN e integración
js/seed.js          datos de demostración (ficticios)
js/evaluacion.js    verificaciones automáticas, borradores de informes y de la resolución
js/vistas.js        bandeja, mapa, ficha predial, registro público, normativa
js/expediente.js    expediente con pestañas y acciones por rol
js/portal.js        portal de propietarios y consultores: tickets y proyectos
js/ejemplo.js       plan de ejemplo ficticio para el consultor
js/app.js           navegación y arranque
formulario-pmfbn/   Aplicación web de plan de manejo + js/sigpm-puente.js (integración)
                    js/vendor/: polygon-clipping 0.15.7 (MIT), para recortar polígonos al límite predial
ejemplos/           archivos para probar la carga de un predio nuevo e importar un formulario
```

## Para probar la carga

1. Como secretaría técnica, use **⬆ Subir solicitud (.json)** con `ejemplos/pmfbn_ejemplo_las_vertientes.json`, o abra **Nueva solicitud** e importe ese archivo en *Formulario PMFBN*. En *Ingreso y antecedentes*, la ficha predial nueva aparece completada con los datos del formulario: nombre, rol, comuna, precipitación, inscripción en el CBR y límite predial. Revísela y presione «Crear ficha predial». Si el formulario no trae el límite, adjunte `ejemplos/nuevo_predio_limite_WGS84.geojson`.
2. En *Cartografía y análisis*, cargue `ejemplos/nuevo_predio_rodales_UTM18S.geojson`. Está en UTM 18S y el sistema la reproyecta. Agregue también `nuevo_predio_cursos_agua_WGS84.geojson`.
3. En *Formulario PMFBN*, abra la Aplicación web de plan de manejo, complete el plan y presione «Enviar a SIGPM». También puede importar `ejemplos/pmfbn_ejemplo_las_vertientes.json`, que viene en formato simplificado.

## Para pasar a producción

`js/store.js` concentra todo el acceso a los datos: se puede reemplazar por llamadas a una API (por ejemplo REST + PostGIS) con autenticación institucional. Las capas de referencia (SNASPE, sitios prioritarios, glaciares, especies) deben venir de las fuentes oficiales. El cómputo de feriados en `js/normativa.js` es referencial.
