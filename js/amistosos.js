function esAmistoso(juego) { return juego.fase === 'amistoso'; }
function esJuegoOficial(juego) { return ['regular', 'playoffs', 'final'].includes(juego.fase ?? 'regular'); }
function jugadorElegible(jugador, juego, equipoId, categoriaId) {
  if (!jugador || ![juego.local, juego.visita].includes(equipoId)) return false;
  const coincide = m => m.categoria_id === categoriaId && m.equipo_id === equipoId && m.temporada === juego.temporada;
  return (jugador.membresias ?? []).some(coincide) ||
    (esAmistoso(juego) && (jugador.participaciones_amistosos ?? []).some(m => coincide(m) && m.juego_id === juego.id));
}
function validarParticipaciones(juego, jugadores, categoriaId) {
  const vistos = new Set();
  for (const [equipo, lista] of [[juego.local, juego.estadisticas_local ?? []], [juego.visita, juego.estadisticas_visita ?? []]]) {
    for (const linea of lista) {
      const jugador = jugadores.find(j => j.id === linea.jugador);
      if (!jugadorElegible(jugador, juego, equipo, categoriaId)) throw new Error('Jugador no autorizado para este juego: ' + linea.jugador);
      if (vistos.has(linea.jugador)) throw new Error('Un jugador no puede participar en ambos equipos.');
      vistos.add(linea.jugador);
    }
  }
  if (juego.mvp_jugador && !vistos.has(juego.mvp_jugador)) throw new Error('El MVP debe haber participado en este juego.');
}
function escaparHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function ordenarConDesempates(filas, juegos) {
  const porPuntos = {};
  filas.forEach(f => { (porPuntos[f.pts] ??= []).push(f); });

  const puntosOrdenados = Object.keys(porPuntos).map(Number).sort((a,b) => b - a);
  let resultado = [];

  puntosOrdenados.forEach(pts => {
    const grupo = porPuntos[pts];

    if (grupo.length === 1) {
      resultado.push(...grupo);
      return;
    }

    if (grupo.length === 2) {
      const [a, b] = grupo;
      const entreElios = juegos.filter(j =>
        (j.local === a.equipo.id && j.visita === b.equipo.id) ||
        (j.local === b.equipo.id && j.visita === a.equipo.id)
      );
      let victoriasA = 0, victoriasB = 0;
      entreElios.forEach(j => {
        const aEsLocal = j.local === a.equipo.id;
        const marcadorA = aEsLocal ? j.marcador_local : j.marcador_visita;
        const marcadorB = aEsLocal ? j.marcador_visita : j.marcador_local;
        if (marcadorA > marcadorB) victoriasA++;
        else if (marcadorB > marcadorA) victoriasB++;
      });

      if (victoriasA > victoriasB) resultado.push(a, b);
      else if (victoriasB > victoriasA) resultado.push(b, a);
      else resultado.push(...[...grupo].sort((x,y) => (y.pf - y.pc) - (x.pf - x.pc)));
      return;
    }

    // 3 o más equipos empatados en puntos -> diferencial de puntos
    resultado.push(...[...grupo].sort((x,y) => (y.pf - y.pc) - (x.pf - x.pc)));
  });

  return resultado;
}


function calcularTablaLiga(equipos, juegos) {
  const tabla = Object.fromEntries(equipos.map(e => [e.id, {
    equipo: e, jj:0, jg:0, jp:0, pf:0, pc:0, pts:0
  }]));



  juegos.forEach(j => {
    const local = tabla[j.local];
    const visita = tabla[j.visita];
    if (!local || !visita) return;

    local.jj++; visita.jj++;
    local.pf += j.marcador_local; local.pc += j.marcador_visita;
    visita.pf += j.marcador_visita; visita.pc += j.marcador_local;

    const forfeit = j.forfeit ?? 'ninguno';

    if (forfeit === 'local') {
      // Local no se presentó: visita gana (2 pts), local pierde por forfeit (0 pts)
      visita.jg++; visita.pts += 2;
      local.jp++;  local.pts += 0;
    } else if (forfeit === 'visita') {
      local.jg++; local.pts += 2;
      visita.jp++; visita.pts += 0;
    } else if (j.marcador_local > j.marcador_visita) {
      local.jg++; local.pts += 2;
      visita.jp++; visita.pts += 1;
    } else if (j.marcador_visita > j.marcador_local) {
      visita.jg++; visita.pts += 2;
      local.jp++; local.pts += 1;
    }
    // empate en el marcador no debería pasar en básquetbol, se ignora
  });

  return ordenarConDesempates(Object.values(tabla), juegos);
}


function fechaLocalISO() {
  const parts = new Intl.DateTimeFormat("en-US", {timeZone:"America/Hermosillo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const v = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
