# Operación y validación de LMBC

## Antes de publicar código

Con Node 24 ejecutar `node scripts/test.cjs` y `node scripts/check-site.cjs` desde la raíz. El primer comando falla si no encuentra pruebas. GitHub Actions repite ambas validaciones en cada PR y actualización de main. Esperar el resultado del PR antes de integrarlo. El workflow no cambia la configuración ni los permisos del alojamiento.

La publicación existente de GitHub Pages se conserva. Para exigir automáticamente las pruebas a cualquier colaborador, el propietario debe configurar la regla de main para requerir `regression` antes de integrar PR. No se debe confundir una prueba aprobada con un despliegue terminado: comprobar el estado de Pages y comparar los archivos públicos con el commit integrado. Una captura guardada en GitHub puede estar todavía en publicación.

## Recorridos de aceptación en Chrome

- Entrada nueva y navegador con preferencias antiguas: temporada activa. Enlace histórico explícito: temporada del enlace.
- Elegir favorito por temporada/categoría/rama, pasar al calendario y usar Mi equipo. Cambiar de temporada y categoría; no reutilizar un favorito de otro ámbito.
- Comparar y Rankings: comprobar el mismo equipo con un resultado normal y un forfeit. Promedios solo de juegos en cancha; victorias y standing conservan el resultado oficial.
- Abrir resultado y MVP, descargar PNG y compartir. Logos transparentes y foto se componen directamente; sin placas blancas ni nota del reconocimiento. Probar nombres largos, sin foto y un logo ausente.
- Series 1–0 y 1–1: no confirmar avance. Series 2–0 y 2–1: avance confirmado. Duplicados o marcadores inválidos: revisión. Tercer juego de una serie 2–0: innecesario.
- Captura de liga: números negativos, decimales, empate, triples incompatibles y suma incorrecta marcada completa deben rechazarse. Las estadísticas pendientes siguen permitidas con advertencia.
- Dos sesiones del mismo juego: la segunda no pisa cambios ajenos. Fallo de red: borrador conservado, sin credenciales ni archivos. Al recuperar un borrador sobre datos nuevos, revisar y conciliar antes de guardar.
- Agenda: editar fecha/sede sin perder estadísticas. Eliminar manda el juego a papelera; Recuperar restaura programación y resultado. En juegos disputados se preservan equipos y fase.
- Amistosos y torneos no afectan estadísticas oficiales. Un torneo oculto no aparece ni se abre por enlace público.
- Fotos: WebP con transparencia y original conservado en el mismo commit que el perfil. Fallo de escritura no fuerza main.
- Probar celular y escritorio; hoja de juego, PDF, enlaces, filtros, menús y controles visibles sin solaparse.

## Respaldo y recuperación

El respaldo completo de código y archivos antes de esta actualización es el ZIP del commit `91603566e6eb896aef2870040f06c44003b504b7`. Se ha extraído y comparado su contenido con el árbol Git de esa versión. Incluye datos e imágenes y conserva cualquier contenido montado existente. No incluye credenciales externas, configuración privada de Cloudflare ni tokens del navegador: estos nunca deben guardarse en el repositorio.

Para obtener un respaldo nuevo, descargar **Code → Download ZIP** de main o el ZIP de un commit concreto. Guardar también el identificador del commit y la configuración del dominio/Pages por separado. Para probar una restauración, extraer en otra carpeta, servirla con un servidor estático y revisar los recorridos anteriores sin guardar capturas reales.

Para revertir un problema de código, revertir únicamente los archivos de código del cambio mediante PR. Conservar los JSON e imágenes añadidos posteriormente; restaurar un ZIP antiguo completo sobre main perdería las nuevas capturas. Si se requiere recuperar datos, comparar el archivo actual con el respaldo y restaurar únicamente los registros afectados. Nunca hacer force push ni restaurar /piensa/ como parte de un arreglo de liga.

## Módulos y reglas compartidas

`fan-core.js` concentra contexto, rendimiento sin forfeits y series a ganar dos de tres. `datos.js` obtiene categorías del catálogo, carga la temporada elegida y obtiene historia bajo demanda; una carga fallida no se presenta como una tabla válida vacía. `amistosos.js` mantiene elegibilidad, validación de captura y detección de conflicto del mismo juego. `capture-guard.js` conserva borradores locales. `access.js` permite acceso por sesión y recordar explícitamente el token. `arena.js` genera carteles solo al solicitarlos.

Los diez originales de fotos existentes permanecen intactos; `image-variants.js` utiliza derivados WebP para visualización. Las cargas nuevas conservan original y versión WebP. La corrección de bordes blancos rectangulares de logos se aplica únicamente a la copia del cartel; no reemplaza logos, no elimina blancos encerrados del diseño y no se aplica a fotos.

La CSP requiere un trabajo separado de cabeceras del alojamiento y migración de scripts inline; imponer una política estricta sin esa migración rompería las herramientas actuales. El CMS queda fijado a una versión exacta. Revisar periódicamente sus actualizaciones antes de cambiarla.

## Datos históricos que requieren revisión humana

Se conservan las discrepancias conocidas de sumas/series y el forfeit histórico 0–0, pendientes de las hojas originales. Esta actualización no corrige ni recalcula esos registros. No comparar archivos de datos con una versión antigua para decidir que hay un error nuevo: las capturas legítimas posteriores deben conservarse.
