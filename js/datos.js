// Carga los archivos de datos del sitio. Equipos y juegos viven separados
// por categoría (así el panel /admin solo ofrece equipos de esa categoría).
// RUTA_IMG: prefijo relativo hacia la raíz del sitio. La página principal
// no necesita nada (''), pero standing/index.html está una carpeta adentro
// y necesita '../' para que las imágenes de equipo/patrocinador carguen bien.
const RUTA_IMG = window.RUTA_IMG || '';

async function cargarDatos() {
  const CATS = ['var40', 'fem40', 'var49'];

  const [categorias, sedesData, patrociniosData, ...resto] = await Promise.all([
    fetch('data/categorias.json').then(r => r.json()),
    fetch('data/sedes.json').then(r => r.json()),
    fetch('data/patrocinadores.json').then(r => r.json()).catch(() => ({ patrocinadores: [] })),
    ...CATS.map(c => fetch(`data/equipos_${c}.json`).then(r => r.json())),
    ...CATS.map(c => fetch(`data/juegos_${c}.json`).then(r => r.json())),
  ]);

  const equiposPorCat = resto.slice(0, CATS.length);
  const juegosPorCat = resto.slice(CATS.length);

  const sedes = sedesData.sedes ?? sedesData;
  const patrocinadores = patrociniosData.patrocinadores ?? patrociniosData ?? [];

  // Reinyectamos categoria_id (implícito por el archivo de origen) para que
  // el resto del sitio funcione igual que antes.
  const equipos = CATS.flatMap((cat, i) =>
    (equiposPorCat[i].equipos ?? []).map(e => ({ ...e, categoria_id: cat }))
  );
  const juegos = CATS.flatMap((cat, i) =>
    (juegosPorCat[i].juegos ?? []).map(j => ({ ...j, categoria_id: cat }))
  );

  const equiposPorId = Object.fromEntries(equipos.map(e => [e.id, e]));
  const sedesPorId = Object.fromEntries(sedes.map(s => [s.id, s]));

  return { categorias, sedes, equipos, juegos, patrocinadores, equiposPorId, sedesPorId };
}

function renderPatrocinadores(patrocinadores) {
  const cont = document.getElementById('patrocinadores');
  if (!cont || !patrocinadores || patrocinadores.length === 0) { if (cont) cont.innerHTML = ''; return; }
  cont.innerHTML = `
    <div class="patrocinadores__label">Con el apoyo de</div>
    <div class="patrocinadores__grid">
      ${patrocinadores.map(p => `
        <a href="${p.url || '#'}" target="_blank" rel="noopener">
          <img src="${RUTA_IMG}${p.logo}" alt="${p.nombre}" loading="lazy">
        </a>
      `).join('')}
    </div>
  `;
}

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatearFecha(fechaISO) {
  const [y,m,d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return {
    diaSemana: DIAS[fecha.getDay()],
    texto: `${d} de ${MESES[m - 1]}`,
    fecha
  };
}
