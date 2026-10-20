# Cierre de temporada y reconocimientos

Abrir **Administrar → Cierre de temporada y reconocimientos**, o `/reconocimientos/?administrar=1`. Utiliza el mismo token de las herramientas de captura; sus preferencias de sesión se conservan.

1. Conectar o recargar y elegir temporada, categoría y rama.
2. Elegir líderes por total o promedio y el mínimo de juegos. Aplicar criterios.
3. Revisar pendientes, final confirmada, jugadores y roster. Los líderes se calculan en fase regular: puntos y triples; opcionalmente el registro de faltas, identificado como dato estadístico. Los empates producen lideratos compartidos. No se consideran amistosos ni forfeits en estos cálculos.
4. Elegir MVP de temporada y MVP de la serie. Ninguno se asigna automáticamente. El primero requiere cumplir el mínimo de juegos; el segundo requiere hojas de los juegos de la final que coincidan con los marcadores y fechas de la serie.
5. Incluir campeón si la final tiene dos victorias válidas en tres juegos. Puede agregarse una fotografía del equipo, reemplazarla o retirarla. No cambia las fotos de los jugadores. El roster conmemorativo usa las membresías de esa temporada, categoría y equipo; si no hay roster registrado no se inventa una plantilla.
6. Marcar la revisión, preparar las tarjetas y comprobar sus descargas. Guardar borrador o publicar. No se confirma un cierre con juegos de fase regular pendientes. Un campeonato histórico respaldado por la final puede publicarse aunque no existan hojas antiguas de fase regular; en ese caso no se inventan líderes ni MVP.
7. «Ocultar publicación» retira el cierre de la galería y conserva sus reconocimientos. Se puede revisar y publicar otra vez.

La galería pública está en `/reconocimientos/`, en el menú Más y en Estadísticas. Recuerda la temporada activa por defecto y permite consultar todo el archivo o una categoría/rama. No carga todos los juegos históricos: muestra las instantáneas confirmadas de `data/reconocimientos.json`.

Se exportan campeón, roster campeón, líderes, MVP de temporada, MVP de final y resumen de categoría/rama. Cada acción genera un PNG y ofrece el mismo diálogo de compartir del sitio. El roster y el resumen crecen en altura cuando es necesario para conservar todos los nombres. La edición conmemorativa utiliza metal, marfil y acentos oro, plata o champaña, sin laureles ni número de uniforme. Las tarjetas anteriores conservan su diseño.

Los cambios de capturas o registros posteriores no modifican silenciosamente los premios históricos. Para actualizarlos, recargar, revisar y volver a publicar. El guardado reconstruye los reconocimientos desde los datos actuales de GitHub y rechaza una revisión desactualizada. Fusiona únicamente el registro de la categoría/temporada elegida y guarda JSON y fotografía en un commit atómico, sin forzar main. Un conflicto exige recargar; no se sobrescriben capturas simultáneas.

Los borradores no aparecen en la galería, pero el repositorio continúa siendo público: no deben contener datos confidenciales. La disponibilidad de compartir archivo depende del navegador; siempre se conserva la descarga PNG. El despliegue debe terminar para ver una nueva publicación u ocultación.

Este módulo pertenece exclusivamente a la liga. No modifica el sistema ni los datos de Copa Caborca, amistosos o torneos independientes. Tampoco cambia las reglas, resultados o estadísticas existentes.

## Selección y revisión de cada estadística

El panel muestra casillas independientes para puntos, triples, equipo más ofensivo, equipo más defensivo, equipo más triplero, mejor defensa de triples, Fair Play y registro individual de faltas. Se puede incluir o excluir cada reconocimiento. El selector «Clasificación que quieres revisar» muestra la tabla completa, buscador y un botón para previsualizar su tarjeta, antes de elegir los MVP.

Los cinco rankings de equipos reutilizan los promedios de la liga y excluyen forfeits en ambos lados. Su mínimo de juegos es independiente del mínimo individual. Los reconocimientos de triples y faltas de equipos requieren hojas disponibles para esa estadística; no se consideran ceros las hojas ausentes. Se preservan los empates.

Durante la temporada, «Revisar tarjetas» y «Ver tarjeta de este reconocimiento» permiten generar imágenes marcadas como provisionales. No pueden guardarse ni publicarse como premios oficiales. La publicación definitiva requiere terminar la fase regular y confirmar la revisión.
