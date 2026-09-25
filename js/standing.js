let ESTADO_S = null;
let categoriaActivaS = null;
let temporadaActivaS = null;

async function iniciarStanding() {
  ESTADO_S = await cargarDatos();
  renderPatrocinadores(ESTADO_S.patrocinadores);

  iniciarSelectorTemporada(ESTADO_S.temporadas, (temp) => {
    temporadaActivaS = temp;
    renderStanding();
  });

  iniciarTabs(ESTADO_S.categorias, (cat) => {
    categoriaActivaS = cat;
    renderStanding();
  });
}

// Juegos de temporada regular, jugados, de la categoría y temporada activas.
function juegosRegularesVigentes() {
  return ESTADO_S.juegosOficiales.filter(j =>
    j.categoria_id === categoriaActivaS &&
    j.estatus === 'jugado' &&
    (j.fase ?? 'regular') === 'regular' &&
    (!temporadaActivaS || j.temporada === temporadaActivaS)
  );
}

// Reglas de la liga:
//  - Equipo que gana: 2 puntos
//  - Equipo que pierde: 1 punto
//  - Equipo que pierde por forfeit (no se presenta): 0 puntos
function calcularStanding() {
  return calcularTablaLiga(ESTADO_S.equipos.filter(e => e.categoria_id === categoriaActivaS), juegosRegularesVigentes());
}

// Orden oficial: 1) puntos. Empates: 2 equipos -> quien ganó el enfrentamiento
// directo entre ellos; si se dividieron los juegos, o son 3+ equipos ->
// diferencial de puntos (PF-PC).

function renderStanding() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaS) return;
  const filas = calcularStanding();

  if (filas.length === 0) {
    cont.innerHTML = `<div class="empty">No hay equipos registrados en esta categoría todavía.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="table-scroll"><table class="standing-table">
      <thead>
        <tr>
          <th>#</th><th>Equipo</th><th>JJ</th><th>JG</th><th>JP</th><th>PF</th><th>PC</th><th>Dif</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map((f, i) => `
          <tr>
            <td class="rank">${i + 1}</td>
            <td>
              <div class="equipo-cell">
                <img src="${RUTA_IMG}${f.equipo.logo}" alt="${f.equipo.nombre}" loading="lazy">
                <span>${f.equipo.nombre}</span>
              </div>
            </td>
            <td>${f.jj}</td>
            <td>${f.jg}</td>
            <td>${f.jp}</td>
            <td>${f.pf}</td>
            <td>${f.pc}</td>
            <td class="mono">${f.pf - f.pc >= 0 ? '+' : ''}${f.pf - f.pc}</td>
            <td class="mono" style="font-weight:700;">${f.pts}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
    <p style="color:var(--text-dim); font-size:12px; margin-top:14px;">
      Victoria = 2 pts · Derrota = 1 pt · Derrota por forfeit = 0 pts.
      En caso de empate en puntos: entre 2 equipos decide el resultado entre ellos;
      con 3 o más equipos empatados decide el diferencial de puntos.
    </p>
  `;
}

iniciarStanding();
