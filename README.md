# LMBC — Liga Municipal de Básquetbol Caborca

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
