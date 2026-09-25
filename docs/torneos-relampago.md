# Torneos relámpago

Entra desde **Torneos → Administrar torneos**. También hay acceso desde Agregar Juego, Captura y Nuevo Jugador. Usa el mismo token de GitHub que utilizas en captura.

1. **Crear torneo:** pon el nombre que desees, fechas y logo. En Configuración puedes cambiar estos datos y publicar, finalizar o archivar el torneo.
2. **Crear categoría y rama:** cada combinación tiene sus propios grupos, inscripciones, resultados y estadísticas. Define uno o dos clasificados por grupo.
3. **Equipos y rosters:** crea un equipo con su logo, o copia uno de la liga. Para usar el mismo equipo en otra categoría, selecciona esa categoría y pulsa Inscribir equipo. Puedes copiar el roster o comenzar vacío; las estadísticas no se comparten. Editar nombre y logo actualiza la identidad del equipo en todas sus categorías de este torneo.
4. **Grupos y standing:** distribuye de tres a seis equipos por grupo. El standing usa puntos de victoria/derrota/forfeit configurables, enfrentamientos entre empatados, diferencia y puntos a favor. Un empate exacto exige indicar el orden y motivo antes de clasificar.
5. **Agregar Juego / Rol:** genera todos contra todos con fechas, canchas, duración e intervalo de descanso. Revisa la vista previa y aplica el rol. También puedes agregar, reprogramar, cancelar o eliminar partidos de grupos.
6. **Capturar resultados:** marca quién jugó, captura puntos, triples, faltas y MVP. Puedes guardar marcador con estadísticas pendientes. Al marcar completas, la suma individual debe coincidir con el marcador. El forfeit registra 20–0 sin participación individual.
7. **Llaves:** después de terminar los grupos, confirma clasificados y cruces. Se generan cuartos, semifinales y final según la cantidad de equipos, con pases libres cuando correspondan. Cada partido se decide a un juego. Asigna fechas y canchas mediante Editar horario. El ganador avanza automáticamente.
8. **Correcciones:** puedes corregir resultados; si cambia una clasificación, retira primero la llave. Si cambia un ganador con rondas posteriores jugadas, reabre esos resultados. La papelera conserva los registros retirados para restaurarlos.

El público consulta rol, resultados, hojas individuales, rosters, standing, llaves, líderes y comparación de equipos dentro del torneo y categoría seleccionados. Imprimir / PDF utiliza la impresión del navegador; Exportar datos descarga una copia JSON.

Los formularios guardan al confirmar cuando hay token. Si falla la conexión, queda un borrador local recuperable. El botón Guardar cambios permite reintentar. La web pública se actualiza cuando termina el despliegue de GitHub Pages. Si otra persona editó el mismo torneo, el sistema rechaza sobrescribirlo: exporta el borrador y abre la versión guardada antes de reconciliar tus cambios.

Los borradores y archivados se ocultan del catálogo público, pero sus archivos siguen siendo públicos en GitHub. No guardes información privada de jugadores. El token permanece en este navegador, en la misma clave utilizada por captura; Cerrar acceso lo elimina de ese navegador.

## Estructura y aislamiento

- `data/torneos/index.json`: catálogo.
- `data/torneos/tor-<id>.json`: un documento por torneo.
- `img/torneos/tor-<id>/`: logos convertidos a PNG, hasta 512 píxeles.
- `teams`: identidad compartida de los equipos dentro de un torneo.
- `entries`: inscripción independiente por equipo y categoría/rama, con roster y grupo propios.
- `games`: partidos que apuntan a inscripciones de la misma categoría/rama.

Copiar un equipo o roster de la liga crea una copia independiente. No modifica sus registros oficiales. Ningún cargador de la liga incorpora estos archivos a sus estadísticas ni a sus playoffs de dos de tres.

## Validación

Ejecutar desde la raíz: `node --test --test-isolation=none tests/amistosos.test.cjs tests/torneos.test.cjs`.
Las pruebas del almacenamiento simulan GitHub; las pruebas de navegador utilizan un servidor local con datos temporales. No se crean torneos de prueba en producción.
