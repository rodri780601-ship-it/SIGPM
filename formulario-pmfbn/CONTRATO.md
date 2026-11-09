# Integración · Aplicación web de plan de manejo (PMFBN)

Esta carpeta contiene la **Aplicación web de plan de manejo** (https://rodri780601-ship-it.github.io/Plan-de-manejo/) sin modificaciones. Solo se agrega `js/sigpm-puente.js` al final de `index.html`.

## Cómo funciona

1. En SIGPM, la secretaría técnica abre *Formulario PMFBN → Completar en la Aplicación web de plan de manejo*. La aplicación se abre embebida (iframe, mismo origen).
2. SIGPM envía `{ tipo: 'sigpm:inicio', solicitud, proyecto, interesado, profesional, predio, cartografia, cursos, soloLectura }`.
   - Si la solicitud ya tiene un plan (`proyecto`), la aplicación lo abre tal cual.
   - Si no lo tiene, crea un proyecto nuevo prellenado con:
     - Interesado, representante legal, predio, rol, comuna e inscripción en el CBR.
     - Autor del plan.
     - Capas *Límite predial*, *Rodales a intervenir* e *Hidrografía* del capítulo 13, junto con los rodales del cuadro 5.1.1.
3. En la aplicación aparece una barra verde con el botón **Enviar a SIGPM**, que devuelve `{ tipo: 'pmfbn:datos', datos: { formato: 'pmfbn-app', proyecto, resumen, revision, cartografia } }`:
   - `proyecto`: el estado completo de la aplicación (el mismo JSON de «Exportar proyecto»).
   - `resumen`: resultados del inventario por rodal (densidad, área basal, volumen, especies, estado de desarrollo), tipo de bosque y zonas de protección (7.4.1).
   - `revision`: los errores y advertencias de «Revisión y exportación».
4. SIGPM guarda el proyecto en la solicitud y lo normaliza para la evaluación (`desdeAppPMFBN` en `js/pmfbn.js`). Analista, abogado y jefaturas lo consultan en modo de solo lectura.

También se puede importar en SIGPM el archivo `.json` que genera «Exportar proyecto» de la aplicación.

## Equivalencias principales (aplicación → SIGPM)

| Aplicación | SIGPM |
|---|---|
| `t.sol_int[0]` (nombre, RUT sin DV, calidad, tipo PPF) | Interesado (RUT con DV, pequeño propietario) |
| `f.rl_*` | Representante legal |
| `f.au_nombre`, `f.au_rut`, `f.au_prof` | Profesional (título habilitado, art. 7° Ley 20.283) |
| `f.pr_*`, `t.sol_rol` | Predio, rol(es), comuna, inscripción en el CBR |
| `t.t511` (rodal, sup, tf, est) | Rodales: superficie, tipo forestal, estructura |
| `t.t531.pend` (clases < 30, 30–45, 45–60, ≥ 60) | Pendiente representativa: 15, 37, 50 o 61 % |
| `t.t731` (actividad, inicio) | Método de corta y año de corta |
| `c742[rodal]` (clase de cobertura residual) | Cobertura remanente, con el límite inferior de la clase (criterio conservador) |
| `t.t743` | Compromiso de regeneración o reforestación |
| `t.t6`, `f.c6_fund` | Objetivo de manejo |
| `f.c71_a/b`, `f.c101` | Criterio de corta y madereo |
| `f.c112_a`, `f.c113_*`, `f.c114_*` | Medidas de protección y justificación del art. 16 |
| `f.f14_fecha` + interesado/autor | Firmas |
| `carto.layers.Rodales` (`N_Rodal`) | Cartografía del área a intervenir |
| `carto.layers.Hidrografia` | Cursos de agua de la ficha predial (si no tiene) |
| `carto.layers.Limite_Predial` | Límite de la ficha predial nueva, cuando el predio aún no existe en SIGPM |

## Ficha predial nueva desde el formulario

Si la solicitud no tiene predio, la pestaña *Ingreso y antecedentes* precarga la ficha predial con los datos del formulario: nombre (`f.pr_nombre`), rol(es) y comuna (`t.sol_rol`), inscripción en el CBR (`f.pr_fojas`, `f.pr_num`, `f.pr_anio`, `f.pr_cbr`), límite (`Limite_Predial`) e hidrografía. Si algún rol ya tiene ficha, propone usarla en lugar de crear otra.

El JSON simplificado acepta los mismos datos en `predio`: `nombre`, `rol` (varios separados por coma), `comuna`, `superficieTotal`, `precipitacion`, `inscripcion: { fojas, numero, anio, conservador }` y `limite` (geometría, Feature o FeatureCollection en WGS 84). Un límite en coordenadas proyectadas se ignora y se pide el archivo.

## Actualizar la aplicación

Copie la nueva versión del repositorio en esta carpeta. Luego vuelva a agregar la línea siguiente después de `js/app.js` en `index.html`:

```html
<script src="js/sigpm-puente.js"></script>
```

El puente usa estos objetos globales de la aplicación: `S`, `nuevoEstado`, `App`, `Inv`, `Carto`, `CAPAS`, `CAT` y `uid`. Si cambian de nombre, ajuste `sigpm-puente.js`.
