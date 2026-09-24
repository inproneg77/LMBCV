# LMBC — Liga Municipal de Básquetbol Caborca

## Amistosos e invitados

1. En `/agregar-juego/`, elige categoría, temporada, equipos y **Fase: Amistoso**.
2. En `/nuevo-jugador/`, selecciona **Solo para amistosos**, la categoría,
   temporada, encuentro y uno de sus equipos. Puedes crear una persona o
   seleccionar una existente. Repite la asignación para invitarla a otro juego.
3. En `/captura/`, selecciona el encuentro marcado **[Amistoso]** y captura
   marcador, puntos, triples, faltas y MVP como siempre. El roster se lee desde
   GitHub para disponer de los invitados recién guardados.
4. El calendario muestra el amistoso, su resultado y su hoja de estadísticas.
   El perfil individual presenta sus participaciones amistosas en una sección
   separada. No suman a standing, líderes, MVP oficial, rankings, estadísticas
   de equipos, enfrentamientos oficiales ni métricas del dashboard.

Se conserva el mismo token personal y el guardado directo a `main`. El token
vive en `localStorage` (`lmbc_gh_token`), no debe incluirse en ningún JSON.

### Edición directa de JSON

Los juegos siguen en `data/juegos_{categoria}/{temporada}.json`, con
`fase: "amistoso"` y su `temporada`. Las ramas están representadas por
`var40`, `fem40` y `var49`. El ID del juego debe ser único y estable.

En `data/roster.json`, un invitado puede tener esta forma (IDs ilustrativos):

```json
{
  "id": "INVITADO01",
  "nombre": "Jugador invitado",
  "numero": "12",
  "membresias": [],
  "participaciones_amistosos": [
    {
      "categoria_id": "var40",
      "temporada": "2026-2",
      "equipo_id": "ID_EQUIPO",
      "juego_id": "ID_AMISTOSO"
    }
  ]
}
```

`equipo_id` debe ser local o visitante de ese encuentro. Sus estadísticas usan
el mismo ID de persona en `estadisticas_local` o `estadisticas_visita`. Una
invitación nunca crea una membresía oficial; para inscribirlo en la liga usa
el modo **Liga** y agrega una membresía a la persona existente.

Los jugadores con membresía oficial en ese equipo/categoría/temporada también
pueden jugar amistosos. El formulario valida participantes y MVP antes de
guardar y evita que una persona figure en ambos equipos. Las modificaciones
directas en GitHub o Decap deben respetar estas relaciones: no hay servidor
que valide manualmente el contenido de los JSON.

Un amistoso con invitados no puede cambiar de equipos/fase ni eliminarse desde
la agenda hasta retirar sus `participaciones_amistosos` del roster; así no se
reasignan invitados accidentalmente. Se puede cambiar fecha, hora y sede.

### Separación de estadísticas y pruebas

`js/amistosos.js` centraliza la elegibilidad. `cargarDatos()` expone `juegos`
para el calendario, `juegosOficiales` para la liga y `juegosAmistosos` para la
sección independiente del perfil. Los juegos antiguos sin `fase` conservan
el tratamiento de temporada regular. Playoffs y finales mantienen sus reglas.
No se migran ni se eliminan resultados existentes.

Pruebas sin dependencias, con Node.js 22 o posterior:

```sh
node --test --test-isolation=none tests/amistosos.test.cjs
```

Las pruebas simulan lecturas/escrituras; no usan tokens ni modifican GitHub.

Sitio estático (HTML/CSS/JS, sin build ni base de datos). Los datos viven en
archivos JSON dentro de `data/` y se editan desde `/admin` (Decap CMS) o desde
dos herramientas rápidas fuera del panel (`/captura/` y `/nuevo-jugador/`).

**Sitio en vivo:** https://caborcavets.online
**Repo:** https://github.com/inproneg77/LMBCV

---

## Cómo está armado (las 3 piezas)

| Pieza | Qué hace | Dónde se configura |
|---|---|---|
| **GitHub Pages** | Aloja el sitio. Cada push a `main` lo publica solo. | Repo → Settings → Pages |
| **Cloudflare** | DNS del dominio `caborcavets.online`, apunta a GitHub Pages. | dash.cloudflare.com |
| **DecapBridge** | Da login con GitHub al panel `/admin` (sin esto, Decap CMS no sabe quién eres ni puede guardar cambios). | decapbridge.com + `admin/config.yml` |

No usamos Netlify para nada. Si ves instrucciones de Netlify en algún lado de
este proyecto (versiones viejas del README, un `netlify.toml` suelto en el
repo), ignóralas o bórralas — no aplican.

---

## Estructura del repo

```
index.html                    → Calendario (página raíz)
standing/                     → Tabla de posiciones
equipos/                      → Ficha de equipos
dashboard/                    → Resumen por categoría + playoffs en vivo
rankings/                     → MVP y Campeón por temporada
comparar/                     → Comparador de jugadores
playoffs/                     → Brackets
lideres/                      → Líderes de estadísticas
noticias/                     → Noticias del sitio
jugador/                      → Perfil individual (?id=X)
admin/                        → Panel Decap CMS
captura/                      → Captura rápida de resultados (sin Decap)
nuevo-jugador/                → Alta rápida de jugadores (sin Decap)

css/style.css                 → Todo el estilo del sitio
js/datos.js                   → Carga y combina todos los JSON (cargarDatos())
js/*.js                       → Un archivo por página

data/equipos.json             → Equipos (unificado, multi-categoría)
data/roster.json              → Jugadores (unificado, con membresías)
data/categorias.json          → var40 / fem40 / var49
data/temporadas.json          → Lista de temporadas + cuál está activa
data/sedes.json                data/patrocinadores.json                data/noticias.json
data/juegos_{categoria}/{temporada}.json   → Juegos, un archivo chico por combinación
data/playoffs_{categoria}.json             → Bracket de playoffs por categoría

img/equipos/                  → Logos de equipos y patrocinadores
```

---

## Paso a paso: cómo llegar a un sitio funcional desde cero

Esto es para el día que necesites reconstruir el setup completo (ej. el repo
se pierde, o quieres clonarlo para otra liga). Si el sitio ya está en línea y
solo vas a editar contenido, sáltate a la sección **"Editar contenido del día
a día"** más abajo.

### 1. Sube el código a GitHub
1. Crea un repo (o usa uno existente).
2. Sube todo el contenido de esta carpeta tal cual está: `index.html`, `css/`,
   `js/`, `data/`, `img/`, `admin/`, y las carpetas de cada página
   (`standing/`, `equipos/`, etc.).
3. **No subas** `netlify.toml` — no se usa.

### 2. Activa GitHub Pages
1. En el repo: **Settings → Pages**.
2. **Source**: `Deploy from a branch`.
3. **Branch**: `main`, carpeta `/ (root)`.
4. Guarda. GitHub te da una URL tipo `inproneg77.github.io/LMBCV` — ya
   funciona ahí, aunque todavía sin dominio propio.

### 3. Conecta el dominio propio (Cloudflare)
1. El dominio (`caborcavets.online`) debe estar dado de alta en Cloudflare
   (Cloudflare como DNS, sin importar dónde lo compraste).
2. En Cloudflare, agrega estos registros DNS apuntando a GitHub Pages:
   - Tipo `A`, nombre `@`, apuntando a las 4 IPs de GitHub Pages
     (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`)
   - Tipo `CNAME`, nombre `www`, apuntando a `inproneg77.github.io`
   - Modo de proxy: puede estar en "DNS only" (nube gris) o "Proxied" (nube
     naranja) — si usas Proxied, en SSL/TLS de Cloudflare pon el modo en
     **Full** (no Flexible, para evitar loops de redirección con GitHub Pages).
3. De vuelta en GitHub: **Settings → Pages → Custom domain**, escribe
   `caborcavets.online` y guarda. Esto crea automáticamente el archivo
   `CNAME` en la raíz del repo con ese contenido — no lo edites a mano.
4. Marca **Enforce HTTPS** en la misma pantalla (tarda unos minutos en
   activarse la primera vez).

### 4. Activa el panel de administración (DecapBridge)
Decap CMS por sí solo no sabe autenticar usuarios contra GitHub — necesita un
puente. Este proyecto usa **DecapBridge** para eso.
1. Entra a [decapbridge.com](https://decapbridge.com) y da de alta el sitio,
   conectándolo a este repo (`inproneg77/LMBCV`) y a tu cuenta de GitHub.
2. DecapBridge te da un `identity_url` y `gateway_url` únicos para tu sitio —
   ya están puestos en `admin/config.yml` (bloque `backend:` al inicio del
   archivo). Si alguna vez recreas el sitio en DecapBridge desde cero, esos
   dos valores cambian y hay que actualizarlos ahí.
3. Entra a `caborcavets.online/admin`, inicia sesión con GitHub. Ya puedes
   editar equipos, jugadores, juegos, playoffs, sedes, temporadas y noticias.

### 5. Las herramientas rápidas (`/captura/` y `/nuevo-jugador/`)
Estas dos páginas no pasan por Decap ni por DecapBridge — escriben
directo al repo usando un token personal de GitHub que se guarda en el
navegador (no en el servidor, no es un secreto compartido).
1. En GitHub: **Settings de tu cuenta → Developer settings → Fine-grained
   tokens → Generate new token**.
2. Dale acceso solo al repo `inproneg77/LMBCV`, permiso de **Contents:
   Read and write**.
3. Entra a `caborcavets.online/captura/` (o `/nuevo-jugador/`), pega el
   token una sola vez — queda guardado en ese navegador para la próxima.

---

## Editar contenido del día a día

**Capturar un resultado recién jugado (rápido):**
1. `caborcavets.online/captura/`
2. Elige el juego programado, llena marcador y estadísticas, guarda.

**Dar de alta un jugador nuevo:**
1. `caborcavets.online/nuevo-jugador/`
2. El formulario detecta nombres parecidos antes de guardar (evita duplicados).

**Todo lo demás (equipos, sedes, temporadas, playoffs, noticias, o capturar
desde cero sin usar /captura/):**
1. `caborcavets.online/admin`
2. Entra con tu cuenta de GitHub.

**Abrir una temporada nueva:**
1. `/admin` → **Temporadas** → agrega el nuevo ID (ej. `2027-1`) y nombre.
2. Los archivos de juegos de esa temporada (`data/juegos_{cat}/2027-1.json`)
   se crean solos la primera vez que capturas un juego ahí — no hace falta
   tocar `admin/config.yml`.

Cada guardado en `/admin`, `/captura/` o `/nuevo-jugador/` hace commit directo
a `main`, y GitHub Pages republica el sitio solo (1-2 minutos).
# Capturar un amistoso que surge al momento

Abre `/captura/?modo=amistoso` con el mismo token de captura. También puedes elegir **Amistosos — crear y capturar aquí** en el selector Tipo de captura.

1. Elige categoría/rama y temporada. Fecha y hora se proponen con el momento actual.
2. Escribe el nombre de cada equipo y pulsa **Crear equipo local/visitante**. Puedes reutilizar un equipo de amistosos o copiar un equipo de liga con su plantilla de esa categoría y temporada.
3. Pulsa **Agregar jugador** en cada lado: captura nombre, número, asistencia, puntos, triples y faltas. No necesitas registrar previamente al equipo ni al jugador en la liga.
4. Captura marcador, estatus y destacado; pulsa **Guardar amistoso**. Para completar o corregir después, selecciona el encuentro en **Partido** dentro de este mismo ambiente.

Equipos, jugadores, convocatorias y partidos se guardan juntos en `data/amistosos.json`. Las copias de liga reciben identidades propias: no crean inscripciones ni cambian el roster oficial. El calendario muestra resultados y hojas de estadísticas; los perfiles invitados muestran su historial amistoso. Standing, líderes, rankings y totales oficiales usan exclusivamente juegos oficiales. El guardado conserva el SHA del archivo y rechaza conflictos para no sobrescribir otra captura. Los amistosos anteriores conservan su captura existente en «Liga y juegos agendados».

