# Crecimiento de LMBC VETERANOS en GitHub

Los JSON actuales siguen siendo la fuente de verdad. La captura con token, sus rutas, validaciones de guardado y conflictos de SHA no cambian. No hay base de datos externa, credenciales nuevas ni cambios en Copa Caborca.

## Lectura pública

- La temporada activa sigue siendo la selección inicial; un enlace explícito conserva su temporada histórica.
- Inicio, calendario, equipos y comparador leen paquetes de temporada con las estadísticas originales completas. Hojas, PDF, imágenes y jornadas usan esos datos completos.
- Standings, líderes y rendimiento leen resúmenes generados con las funciones actuales de la liga. Los forfeits mantienen su efecto administrativo y quedan fuera de los promedios conforme a las reglas existentes.
- Los perfiles conservan los totales de carrera y MVP de toda la trayectoria. Inicialmente leen las participaciones de la temporada activa; los botones de historial cargan temporadas anteriores sin duplicar juegos. Liga y amistosos permanecen separados.
- El directorio público usa nombres e identificadores compactos. Playoffs conserva las series originales y no necesita descargar estadísticas de jugadores.
- El calendario presenta todos los programados (también pendientes antiguos), todas las fechas futuras y doce fechas de resultados pasados por bloque. La impresión incluye todo el historial de la selección y vuelve al bloque anterior al terminar.

## Publicación consistente

Ejecutar Node 24: `node scripts/build-public-data.cjs`. Genera únicamente `data/public/`; nunca escribe los JSON de captura. La revisión depende de todos los archivos fuente consumidos y de las reglas de cálculo. El índice apunta a paquetes con esa misma revisión; cada publicación incorpora las capturas de su propio checkout. No se usan commits automáticos de datos derivados que puedan sobrescribir capturas nuevas.

Los archivos derivados no se versionan. El despliegue debe generarlos **antes de subir los archivos estáticos**, en cada cambio de main. Se incluye configuración de Wrangler para despliegues directos. Si Workers Builds omite custom builds, configurar su campo Build command con `node scripts/build-public-data.cjs`; no basta con que el workflow de validación los genere en otra máquina.

Una publicación no está comprobada hasta que el dominio sirve `data/public/index.json`, su revisión coincide con el compilador del commit desplegado y sus paquetes corresponden a los datos fuente. No se cambian dominio ni DNS.

## Compatibilidad y recuperación

Si falta el índice, una descarga falla o su revisión no coincide, la lectura inicial vuelve a los JSON originales. Los errores al pedir un capítulo histórico permiten reintentar. Las pantallas de administración y captura no solicitan el índice público.

Revertir el commit de interfaz restituye la lectura anterior sin restaurar ni sobrescribir datos de juegos. La verificación de integridad compara las fuentes antes y después de compilar. Los archivos fuera de las rutas canónicas permanecen intactos.

## Validación

- `node scripts/test.cjs`: reglas de liga, amistosos, torneos, tokens, conflictos, logos, exportaciones y pruebas específicas de lectura optimizada.
- `node scripts/check-site.cjs`: enlaces y JSON fuente; excluye salidas derivadas, probadas por separado.
- Las pruebas contrastan standings, líderes y rendimiento de todas las categorías y temporadas contra los cálculos originales, así como la trayectoria de todos los jugadores e invitados.
- Prueban sedes, paginación e impresión, fallo y reintento, índice inválido, paquetes desfasados, cambios de captura y cincuenta temporadas archivadas sin aumentar las peticiones iniciales.

Las medidas de transferencia de las pruebas corresponden a JSON local sin compresión HTTP. No representan tiempos reales en un celular ni prometen un porcentaje constante de velocidad.
