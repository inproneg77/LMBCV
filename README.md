# LMBC — Sitio de la Liga

Sitio listo para publicar en Netlify. No necesita servidor ni base de datos:
los datos viven en archivos JSON dentro de `data/` y se editan desde un panel
de administración en `/admin` (sin tocar código).

## Estructura
```
index.html              → Calendario de juegos (pestañas por categoría)
standing/index.html     → Tabla de posiciones por categoría
admin/                  → Panel de administración (Decap CMS)
data/categorias.json    → Las 3 categorías (no se edita seguido)
data/sedes.json         → Gimnasio Municipal y Duela del Polifuncional
data/equipos.json       → Equipos, categoría y logo de cada uno
data/juegos.json        → Rol de juegos y resultados
img/equipos/            → Logos de los equipos
```

## Paso 1 — Sube el sitio a GitHub (sin usar comandos)
1. Entra a tu repositorio vacío en GitHub (el que creaste, ej. `lmbc-liga`).
2. Botón **"Add file" → "Upload files"**.
3. Arrastra **todo el contenido** de esta carpeta (no la carpeta en sí, sino lo
   que está adentro: `index.html`, `css/`, `js/`, `data/`, `img/`, `admin/`,
   `netlify.toml`).
4. Baja y da clic en **"Commit changes"**.

## Paso 2 — Conecta con Netlify
1. En [netlify.com](https://netlify.com), **"Add new site" → "Import an existing project"**.
2. Elige **GitHub** y selecciona tu repositorio.
3. Deja **build command vacío** y **publish directory** en `.` (un punto).
4. Clic en **Deploy**. En un minuto te da una URL tipo `algo-random.netlify.app`.
   (Puedes cambiarla en Site settings → Site details → Change site name).

## Paso 3 — Activa el panel de administración
1. En el dashboard de Netlify de tu sitio: **Site configuration → Identity → Enable Identity**.
2. En **Registration preferences**, elige **Invite only** (así nadie más puede crear cuenta).
3. Baja a **Identity → Services → Git Gateway → Enable Git Gateway**.
4. Ve a la pestaña **Identity** del sitio → **Invite users** → escribe tu correo.
5. Revisa tu correo, acepta la invitación y crea tu contraseña.
6. Entra a `tusitio.netlify.app/admin` con ese correo y contraseña.

Ya puedes:
- **Equipos** → agregar/editar equipos y subir su logo (arrastra la imagen).
- **Juegos** → crear el rol de la siguiente jornada, y al día siguiente cambiar
  "Estatus" a **Jugado** y capturar el marcador.
- **Sedes** → ya vienen cargadas Gimnasio Municipal y Duela del Polifuncional.

Cada vez que guardas en `/admin`, Netlify vuelve a publicar el sitio solo
(tarda entre 30 segundos y 2 minutos).

## Cómo capturar un juego, paso a paso
1. Entra a `/admin` → **Rol de Juegos** → **Juegos**.
2. Clic en **"+ Add juegos"** dentro de la lista (o edita uno existente).
3. Llena: ID único (ej. `j-016`), Categoría, Fecha, Hora, Sede.
4. En **"ID del equipo local"** y **"ID del equipo visitante"**, escribe el ID
   exacto del equipo (lo ves entrando primero a la sección **Equipos**, ej. `v40-05`).
5. Mientras no se juegue, deja Estatus = **Programado** y marcador vacío.
6. Al día siguiente de jugarse, entra, cambia Estatus a **Jugado** y llena
   ambos marcadores. El standing se recalcula solo.
7. **Publish**.

## Sobre las categorías configuradas
- **Varonil 40 y más** — 12 equipos, sábados.
- **Femenil 40 y más** — 5 equipos, sábados.
- **Varonil 49 y más** — juega domingos (playoffs/finales pueden ser entre semana:
  solo pon la fecha real, el sitio no restringe el día).

## Logos
Cuando tengas los logos reales mañana, súbelos desde `/admin → Equipos`,
edita cada equipo y reemplaza el logo de marcador de posición. También puedes
subirlos directo a la carpeta `img/equipos/` en GitHub si prefieres.
