# ADR 001: Torneos independientes en documentos JSON

Estado: aceptado para la implementación inicial, 2026-09-24.

## Contexto

LMBCV es un sitio estático publicado desde GitHub. Sus herramientas de captura escriben JSON con un token del administrador. Los torneos necesitan nombre, categorías y ramas libres, equipos compartidos entre categorías, rosters independientes y eliminación a un partido, sin alterar las estadísticas de liga.

## Decisión

Mantener un JSON por torneo, un catálogo y logos separados. Separar identidad del equipo de su inscripción en una categoría y rama. Un módulo de dominio valida resultados, calcula tablas y construye rol y llaves; la interfaz y el adaptador de almacenamiento son independientes del motor.

Guardar documento, catálogo y logos mediante una sola transacción de Git: blobs, árbol, commit y actualización de referencia sin force. Comparar el SHA del documento abierto antes de guardar. Reintentar una vez un cambio ajeno en main; rechazar cambios concurrentes en el mismo torneo. Conservar borradores locales y una papelera de registros.

## Alternativas

Una API con base de datos ofrecería permisos por torneo, autenticación delegada y operaciones concurrentes más pequeñas. Requiere alojamiento, migración y mantenimiento adicional. Se pospone hasta que la concurrencia o el tamaño hagan insuficiente el modelo actual. Reutilizar temporadas y archivos de liga se descarta porque mezclaría reglas, plantillas y estadísticas.

## Consecuencias

Se conserva el despliegue y acceso actual; el torneo es portable y verificable. Los cambios públicos esperan al despliegue de Pages. El repositorio y sus borradores son públicos: no es un almacén de información privada. El token sigue en localStorage, con el alcance de escritura configurado por el administrador; no se añade autenticación por usuario ni roles por torneo. El archivo completo se reescribe al guardar, por lo que torneos muy grandes o captura simultánea frecuente justificarían migrar a una API.
