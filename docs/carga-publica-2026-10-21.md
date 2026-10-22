# Corrección de carga pública — 21 de octubre de 2026

La portada solicitaba datos públicos optimizados, pero no incluía `public-data.js`; usaba la ruta de respaldo de 13 peticiones JSON. Las otras nueve páginas públicas sí lo incluían, aunque cargaban dependencias con scripts que bloqueaban el análisis de HTML.

Cambios: conectar el cargador en Inicio; usar `defer` en las dependencias públicas manteniendo su orden; iniciar roster y temporada en paralelo; reutilizar caché solamente en paquetes con una revisión de 24 dígitos hexadecimales en su ruta. El índice se revalida. Cada publicación de datos obtiene nuevas rutas; las capturas con token siguen leyendo y guardando los originales.

Medición con datos del dominio el 21 de octubre: lectura de temporada activa de 13 a 3 peticiones, de 347494 a 192953 bytes JSON descomprimidos. Se conservaron 89 juegos, 84 oficiales, y 34 fotografías. Una muestra de red dio 765 ms antes y 252 ms después para esa lectura; no representa un tiempo garantizado de carga visual ni de todas las conexiones. Los dos JSON auxiliares de navegación y torneos siguen aparte.

Validación: 168 pruebas; comparación de reglas, temporadas históricas, separación de amistosos y datos originales; nuevo control que exige incluir el cargador en todas las páginas públicas antes de datos.js y mantener las capturas fuera de esa ruta. Comprobación de portada, selector histórico, standing y generación de imagen de estadísticas en navegador. Sin cambios en contenido, colores, diseños de tarjetas ni archivos de captura.
