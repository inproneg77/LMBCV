let ESTADO_S = null;
let categoriaActivaS = null;

async function iniciarStanding() {
  ESTADO_S = await cargarDatos();
  const cats = [...ESTADO_S.categorias].sort((a,b) => a.orden - b.orden);
  categoriaActivaS = cats[0]?.id;
  renderPatrocinadores(ESTADO_S.patrocinadores);

  const tabs = document.getElementById('tabs');
  tabs.innerHTML = cats.map(c => `
    <button class="tab ${c.id === categoriaActivaS ? 'is-active' : ''}" data-cat="${c.id}">${c.nombre}</button>
  `).join('');

  tabs.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      categoriaActivaS = btn.dataset.cat;
      tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b === btn));
      renderStanding();
    });
  });

  renderStanding();
}

function calcularStanding(categoriaId) {
  const equipos = ESTADO_S.equipos.filter(e => e.categoria_id === categoriaId);
  const tabla = Object.fromEntries(equipos.map(e => [e.id, {
    equipo: e, jj:0, jg:0, jp:0, pf:0, pc:0
  }]));

  ESTADO_S.juegos
    .filter(j => j.categoria_id === categoriaId && j.estatus === 'jugado')
    .forEach(j => {
      const local = tabla[j.local];
      const visita = tabla[j.visita];
      if (!local || !visita) return;

      local.jj++; visita.jj++;
      local.pf += j.marcador_local; local.pc += j.marcador_visita;
      visita.pf += j.marcador_visita; visita.pc += j.marcador_local;

      if (j.marcador_local > j.marcador_visita) { local.jg++; visita.jp++; }
      else { visita.jg++; local.jp++; }
    });

  return Object.values(tabla).sort((a,b) =>
    b.jg - a.jg || (b.pf - b.pc) - (a.pf - a.pc) || b.pf - a.pf
  );
}

function renderStanding() {
  const cont = document.getElementById('contenido');
  const filas = calcularStanding(categoriaActivaS);

  if (filas.length === 0) {
    cont.innerHTML = `<div class="empty">No hay equipos registrados en esta categoría todavía.</div>`;
    return;
  }

  cont.innerHTML = `
    <table class="standing-table">
      <thead>
        <tr>
          <th>#</th><th>Equipo</th><th>JJ</th><th>JG</th><th>JP</th><th>PF</th><th>PC</th><th>Dif</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map((f, i) => `
          <tr>
            <td class="rank">${i + 1}</td>
            <td>
              <div class="equipo-cell">
                <img src="${f.equipo.logo}" alt="${f.equipo.nombre}" loading="lazy">
                <span>${f.equipo.nombre}</span>
              </div>
            </td>
            <td>${f.jj}</td>
            <td>${f.jg}</td>
            <td>${f.jp}</td>
            <td>${f.pf}</td>
            <td>${f.pc}</td>
            <td class="mono">${f.pf - f.pc >= 0 ? '+' : ''}${f.pf - f.pc}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

iniciarStanding();
