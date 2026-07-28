// Carga los archivos de datos del sitio. Equipos, juegos y playoffs viven
// separados por categoría (así el panel /admin solo ofrece equipos de esa
// categoría, y cada bracket de playoffs es independiente).

// RUTA_IMG: prefijo relativo hacia la raíz del sitio. La página principal
// no necesita nada (''), pero las páginas en subcarpetas (standing/,
// playoffs/, valiosos/) necesitan '../' para que las imágenes carguen bien.
const RUTA_IMG = window.RUTA_IMG || '';

async function cargarDatos() {
  const CATS = ['var40', 'fem40', 'var49'];

  const [categorias, sedesData, patrociniosData, temporadasData, ...resto] = await Promise.all([
    fetch('data/categorias.json').then(r => r.json()),
    fetch('data/sedes.json').then(r => r.json()),
    fetch('data/patrocinadores.json').then(r => r.json()).catch(() => ({ patrocinadores: [] })),
    fetch('data/temporadas.json').then(r => r.json()).catch(() => ({ temporadas: [] })),
    ...CATS.map(c => fetch(`data/equipos_${c}.json`).then(r => r.json())),
    ...CATS.map(c => fetch(`data/juegos_${c}.json`).then(r => r.json())),
    ...CATS.map(c => fetch(`data/playoffs_${c}.json`).then(r => r.json()).catch(() => ({ series: [] }))),
  ]);

  const temporadas = temporadasData.temporadas ?? [];

  const equiposPorCat = resto.slice(0, CATS.length);
  const juegosPorCat = resto.slice(CATS.length, CATS.length * 2);
  const playoffsPorCat = resto.slice(CATS.length * 2);

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
  const playoffs = CATS.flatMap((cat, i) =>
    (playoffsPorCat[i].series ?? []).map(s => ({ ...s, categoria_id: cat }))
  );

  const equiposPorId = Object.fromEntries(equipos.map(e => [e.id, e]));
  const sedesPorId = Object.fromEntries(sedes.map(s => [s.id, s]));

  return { categorias, sedes, equipos, juegos, playoffs, temporadas, patrocinadores, equiposPorId, sedesPorId };
}

// Genera un selector de temporada (<select>) dentro de #temporada-selector.
// callback(temporadaId) se llama al iniciar (con la temporada marcada como
// activa, o la más reciente si ninguna lo está) y cada vez que cambie.
function iniciarSelectorTemporada(temporadas, callback) {
  const cont = document.getElementById('temporada-selector');
  if (!cont) return () => null;

  if (!temporadas || temporadas.length === 0) {
    cont.innerHTML = '';
    callback(null);
    return () => null;
  }

  const ordenadas = [...temporadas].sort((a,b) => b.id.localeCompare(a.id));
  const porDefecto = ordenadas.find(t => String(t.activa) === 'true')?.id ?? ordenadas[0].id;

  cont.innerHTML = `
    <select id="temporada-select" class="temporada-select">
      ${ordenadas.map(t => `<option value="${t.id}" ${t.id === porDefecto ? 'selected' : ''}>${t.nombre}</option>`).join('')}
    </select>
  `;

  const select = document.getElementById('temporada-select');
  select.addEventListener('change', () => callback(select.value));
  callback(porDefecto);
  return () => select.value;
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

// Genera las pestañas de categoría y engancha el cambio de pestaña activa.
// callback(categoriaId) se llama al iniciar y cada vez que cambian de pestaña.
function iniciarTabs(categorias, callback) {
  const cats = [...categorias].sort((a,b) => a.orden - b.orden);
  let activa = cats[0]?.id;

  const tabs = document.getElementById('tabs');
  tabs.innerHTML = cats.map(c => `
    <button class="tab ${c.id === activa ? 'is-active' : ''}" data-cat="${c.id}">${c.nombre}</button>
  `).join('');

  tabs.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activa = btn.dataset.cat;
      tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b === btn));
      callback(activa);
    });
  });

  callback(activa);
  return () => activa;
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
