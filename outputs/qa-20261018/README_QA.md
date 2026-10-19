# QA del 18 de octubre de 2026

Esta selección conserva resultados históricos, no una ejecución nueva. El dictamen y las limitaciones están en INFORME_QA.md. No se modificaron resultados ni se repitieron pruebas contra la base de datos al versionar este bloque.

## Herramientas

Requisitos: Node.js compatible con el proyecto, dependencias instaladas de backend/, frontend-app/ y e2e/, y Chromium instalado para Playwright. Los arneses leen la configuración DB_* del entorno o backend/.env, que no se versiona. Solo admiten servidor de base de datos local. La fase principal crea un esquema dj_qa_* nuevo y lo conserva; la complementaria necesita ese mismo esquema todavía disponible. No apuntar a una base de uso habitual.

Desde la raíz, en PowerShell, para una nueva ejecución:

```powershell
$env:QA_OUTPUT_DIR = 'outputs/qa-nueva-ejecucion'
node outputs/qa-20261018/ejecutar.cjs
node outputs/qa-20261018/complementarias.cjs
```

Mantener QA_OUTPUT_DIR entre fases. Sin esa variable se usa la carpeta histórica y se sobrescriben resultados; usar siempre otra carpeta al repetir. QA_SKIP_REGRESSION=1 omite la regresión auxiliar; QA_ONLY_MESA=1 limita la fase complementaria a CP-025. Para repetir todo, dejar ambas sin definir.

El generador necesita la matriz Excel original de 55 casos y ocho hojas (no la matriz de resultados ya rellenada), además de @oai/artifact-tool en un entorno que lo proporcione. Es una dependencia externa especializada y no está incluida en este repositorio. QA_ARTIFACT_MODULE permite indicar otra ubicación importable del mismo módulo; no sustituye su API por una librería Excel distinta.

```powershell
$env:QA_MATRIX_PATH = 'ruta/relativa/a/matriz-original.xlsx'
node outputs/qa-20261018/generar-entregables.mjs
```

El generador lee ejecucion.json y ambiente.json de QA_OUTPUT_DIR, extrae los casos directamente de la matriz original y genera los informes. No requiere fuente-extraida.json ni rutas personales. El módulo, la matriz original y el esquema histórico no se empaquetan como dependencias automáticas. Esta preparación comprobó sintaxis y referencias estáticas; no certifica una nueva ejecución integral del generador o los arneses.

## Evidencias seleccionadas

Se conservan informe Markdown/HTML, matriz XLSX/CSV, incidencias, acciones, ejecución consolidada, ambiente, resumen, mapa técnico, procedencia y las 39 capturas finales CP-*. No hay duplicados SHA-256 entre esas 39 capturas. Los resultados previos sustituidos permanecen registrados en retests de ejecucion.json.

Del piloto se conservan exclusivamente regresion.log y regresion-estado.json: el informe cita ese registro de regresión real. La mención de piloto/ y segunda-ejecucion/ en el informe describe fases preparatorias, no carpetas completas incluidas en esta selección.

procedencia-codigo.json mantiene los hashes históricos de código y la matriz original; solo se retiró la ruta personal de esta última, conservando su nombre. Sus hashes no describen las adaptaciones posteriores de las herramientas para versionarlas. manifiesto-entrega.json inventaría los artefactos seleccionados actuales y excluye su propio archivo.

## Exclusiones del commit

No se borró ningún archivo. Quedan fuera Entrega_QA_Donde_Juanca.zip, fuente-extraida.json, *.inspect.ndjson, logs de servidores y regresión raíz, previsualizaciones y verificaciones temporales, integridad-xlsx.json, regresion-estado.json raíz y los auxiliares ajustar-arnes.cjs, completar-arnes.cjs, conservar-filtro.ps1 e inspeccionar-excel.mjs.

Se excluye todo segunda-ejecucion/ y todo piloto/ salvo los dos registros citados. Las capturas preparatorias no se incorporan aunque algunas sean distintas: las finales están en la raíz. El listado exacto de archivos omitidos se mostró antes del commit.
