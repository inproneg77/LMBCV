let ESTADO_V = null;
let categoriaActivaV = null;
let temporadaActivaV = null;

async function iniciarValiosos() {
  ESTADO_V = await cargarDatos();
  renderPatrocinadores(ESTADO_V.patrocinadores);

  iniciarSelectorTemporada(ESTADO_V.temporadas, (temp) => {
    temporadaActivaV = temp;
    renderValiosos();
  });

  iniciarTabs(ESTADO_V.categorias, (cat) => {
    categoriaActivaV = cat;
    renderValiosos();
  });
}

function renderValiosos() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaV) return;

  const juegos = ESTADO_V.juegos.filter(j =>
    j.categoria_id === categoriaActivaV &&
    j.estatus === 'jugado' &&
    (!temporadaActivaV || j.temporada === temporadaActivaV)
  );

  const conteo = {};
  juegos.forEach(j => {
    const nombre = nombreMVP(j, ESTADO_V.jugadoresPorId);
    if (!nombre) return;
    conteo[nombre] = (conteo[nombre] ?? 0) + 1;
  });

  const filas = Object.entries(conteo)
    .map(([nombre, veces]) => ({ nombre, veces }))
    .sort((a,b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre));

  const etiqueta = ESTADO_V.categorias.find(c => c.id === categoriaActivaV)?.etiqueta_mvp ?? 'Jugador Más Valioso';

  if (filas.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no hay jugadores destacados capturados para esta categoría/temporada.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="table-scroll"><table class="standing-table">
      <thead>
        <tr><th>#</th><th>${etiqueta}</th><th>Veces reconocido</th></tr>
      </thead>
      <tbody>
        ${filas.map((f,i) => `
          <tr>
            <td class="rank">${i+1}</td>
            <td style="text-align:left; font-weight:600; color:var(--navy);">${f.nombre}</td>
            <td class="mono" style="font-weight:700;">${f.veces}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
    <p style="color:var(--text-dim); font-size:12px; margin-top:14px;">
      Se cuenta cada vez que un jugador fue reconocido como ${etiqueta.toLowerCase()} en un juego capturado
      (usando el selector "Jugador Destacado" del panel).
    </p>
  `;
}

iniciarValiosos();
