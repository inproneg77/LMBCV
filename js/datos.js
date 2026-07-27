// Carga los archivos de datos del sitio. Todo es JSON estático editable
// desde el panel /admin (Decap CMS) o directamente en el repositorio.
async function cargarDatos() {
  const [categorias, sedesData, equiposData, juegosData, patrociniosData] = await Promise.all([
    fetch('data/categorias.json').then(r => r.json()),
    fetch('data/sedes.json').then(r => r.json()),
    fetch('data/equipos.json').then(r => r.json()),
    fetch('data/juegos.json').then(r => r.json()),
    fetch('data/patrocinadores.json').then(r => r.json()).catch(() => ({ patrocinadores: [] })),
  ]);

  // Decap CMS guarda cada colección envuelta en un objeto: {"equipos":[...]}
  const sedes = sedesData.sedes ?? sedesData;
  const equipos = equiposData.equipos ?? equiposData;
  const juegos = juegosData.juegos ?? juegosData;
  const patrocinadores = patrociniosData.patrocinadores ?? patrociniosData ?? [];

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
          <img src="${p.logo}" alt="${p.nombre}" loading="lazy">
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
