# Revisión integral de LMBC VETERANOS — 11 de octubre de 2026

## Cambios implementados

- Navegación de liga conserva la categoría/rama y temporada seleccionadas. Los enlaces explícitos a juegos y temporadas se respetan; torneos, Copa y herramientas de captura no heredan filtros de liga indebidamente.
- Cambios de categoría y temporada actualizan la dirección del navegador. El calendario conserva búsqueda, fecha, estado, competencia y equipo al copiar su dirección o recargar.
- El próximo encuentro del calendario obedece todos los filtros activos; las horas se presentan en 24 horas. Los resultados no muestran un próximo juego que contradiga la selección.
- Cada grupo de estadísticas del jugador permite descargar/compartir una imagen con todas sus participaciones, rivales y totales. Cada equipo, categoría, temporada y ámbito mantiene una imagen independiente; el enlace abre el apartado correspondiente.
- Historial del equipo carga la hoja al abrirla. Imprimir sigue preparando todas las hojas; la vista abierta añade las mismas acciones de resultado, MVP y estadísticas que el calendario.
- La preparación de imágenes estadísticas se pospone hasta pulsar su botón.
- Lecturas JSON simultáneas se agrupan en una petición; las fallidas se pueden reintentar. Los juegos no se conservan en una caché persistente que oculte capturas nuevas.
- Tablas desplazables accesibles por teclado, indicación móvil cuando hay columnas fuera de pantalla, categorías con estado accesible, controles táctiles mayores y logos completos sin recortes circulares en perfiles.
- Se corrige un encabezado duplicado del resumen y el nombre oficial en impresión y en fotos.

## Medición reproducible

Mismo conjunto de capturas locales y mismo equipo CFE SUTERM, antes/después:

| Medida | Antes | Después |
|---|---:|---:|
| HTML inicial del historial | 45,239 bytes | 3,140 bytes |
| Hojas generadas antes de abrir el historial | 6 | 0 |
| Modelos de imagen estadística preparados al renderizar 73 juegos | 68 | 0 |

El HTML inicial del historial se reduce 93%. Las hojas completas y las imágenes se generan cuando se necesitan. Esta cifra mide trabajo y volumen del historial, no una reducción de 93% del tiempo de descarga del sitio.

## Validación

109 pruebas automatizadas aprobadas. Se cubren navegación y filtros, recuperación de lecturas fallidas, hojas bajo demanda, imagen de participaciones, temporada activa, aislamiento de amistosos y torneos, resultados por forfeit, series a ganar dos de tres, logos/fotos y conflictos de captura.

Se recorrieron en Chrome portada, calendario, equipos, jugador, posiciones, líderes, rankings, playoffs, estadísticas, comparar, resumen, noticias, sedes, torneos y los accesos de administración, agenda, captura, registro y fotos. Se comprobó visualmente el diálogo de imagen del jugador en celular y se abrió una hoja completa desde el historial del equipo. Se comprobó el cambio de temporada en los enlaces de navegación.

Las escrituras de administración se validan con fixtures: no se crearon, borraron ni editaron juegos reales para probar. No se cambian cálculos, resultados históricos, datos JSON, el branding ni /piensa/.

## Límites de la medición

No hay métricas de campo de LCP/INP/CLS ni mediciones de una conexión celular física. No se presenta una calificación Lighthouse inventada ni una garantía de ausencia de errores. La reducción inicial y las comprobaciones funcionales anteriores sí son reproducibles.
