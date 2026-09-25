# Portal LMBC: navegación y presentación

Inicio muestra próxima jornada, resultados, favoritos, líderes por categoría y torneos publicados. El calendario completo ahora está en /calendario/; todas las herramientas de captura conservan sus rutas.

- /estadisticas/ organiza posiciones, líderes, rankings, comparación y resumen.
- /administrar/ es la entrada común a liga, amistosos y torneos. El contexto elegido se pasa a las herramientas; el panel de contenido mantiene su autenticación existente.
- /sedes/ muestra canchas y patrocinadores. Las ubicaciones enlazan a una búsqueda de Maps; no se inventan coordenadas.
- Mi equipo recuerda únicamente el ID de un equipo oficial en localStorage. El buscador encuentra equipos y jugadores del registro de liga. Cada torneo conserva su directorio propio.

Arquitectura: site.js comparte navegación, pie, búsqueda, preferencias y mensajes de carga; modern.css comparte estilos y adaptación móvil; portal-core.js contiene filtros y cálculos sin DOM; portal.js construye portada y panel. El cargador cargarDatos acepta una temporada opcional para reducir peticiones en portada. Los perfiles y el calendario mantienen carga histórica para no perder juegos anteriores. No se cambian JSON, reglas deportivas, credenciales ni endpoints de guardado.

En móvil hay menú desplegable, accesos inferiores, formularios en una columna y primera columna fija en tablas desplazables. Se incluyen foco visible, etiquetas de controles y reducción de movimiento.

Verificación: node --test --test-isolation=none tests/amistosos.test.cjs tests/torneos.test.cjs tests/redesign.test.cjs
