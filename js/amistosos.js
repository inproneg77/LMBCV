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
