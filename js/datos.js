// Carga los archivos de datos del sitio. Todo es JSON estático editable
// desde el panel /admin (Decap CMS) o directamente en el repositorio.
async function cargarDatos() {
  const [categorias, sedes, equipos, juegos] = await Promise.all([
    fetch('data/categorias.json').then(r => r.json()),
    fetch('data/sedes.json').then(r => r.json()),
    fetch('data/equipos.json').then(r => r.json()),
    fetch('data/juegos.json').then(r => r.json()),
  ]);

  const equiposPorId = Object.fromEntries(equipos.map(e => [e.id, e]));
  const sedesPorId = Object.fromEntries(sedes.map(s => [s.id, s]));

  return { categorias, sedes, equipos, juegos, equiposPorId, sedesPorId };
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
