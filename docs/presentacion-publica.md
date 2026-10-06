# Presentación pública de LMBC
La renovación usa verde profundo, verde claro y superficies blancas. La copa Piensa en Grande conserva su espacio y su identidad guinda.
## Componentes
- Tarjeta de partido: competencia, equipos y marcador, luego fecha/hora/sede. Las acciones para compartir están fuera del enlace y del resumen desplegable.
- Perfil: controles de liga/amistosos con aria-pressed y secciones independientes. Al imprimir se incluyen ambas.
- Podio: reproduce los tres primeros registros de la misma tabla; no recalcula ni modifica posiciones.
- Imagen de resultado: PNG 1080 × 1080 generado bajo demanda a partir del marcador capturado, categoría, temporada, logos, MVP vinculado y hasta tres logos de patrocinadores. Los logos fallidos se omiten. Descargar y compartir requieren una acción del visitante.
## Datos
No hay escrituras a GitHub, lectura de tokens ni cambios de reglas en arena-core.js o arena.js. Los JSON de producción no forman parte de esta publicación.
## Accesibilidad y rendimiento
Controles utilizables con teclado, foco visible heredado, estado anunciado durante generación de imagen, movimiento reducido y medidas reservadas para logos. El calendario conserva la carga diferida de hojas estadísticas.
## Validación
18 pruebas pasan: modelos de tarjetas, alternancia de perfiles, carga de scripts, cálculos oficiales, amistosos, forfeits y filtros del calendario. Todos los scripts compilan. La captura visual automatizada no pudo completarse en este equipo por errores de captura de ventana y del proceso de Chrome.
