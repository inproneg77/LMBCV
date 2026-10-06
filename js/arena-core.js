(function(root){
 'use strict';
 const plain=v=>String(v??'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
 function gameModel(g,state){
  const a=state.equiposPorId[g.local]||{},b=state.equiposPorId[g.visita]||{};
  const kind=g.fase==='amistoso'?'Amistoso':g.fase==='playoffs'?'Playoffs':g.fase==='final'?'Final':'Liga';
  const p=state.jugadoresPorId[g.mvp_jugador];
  return {id:g.id,date:g.fecha,time:g.hora,category:plain(state.categorias.find(c=>c.id===g.categoria_id)?.nombre||g.categoria_id),
   season:plain(state.temporadas.find(t=>t.id===g.temporada)?.nombre||g.temporada),kind,
   played:g.estatus==='jugado',forfeit:['local','visita'].includes(g.forfeit),local:plain(a.nombre||'Por definir'),visitor:plain(b.nombre||'Por definir'),
   localLogo:a.logo||'',visitorLogo:b.logo||'',localScore:g.marcador_local,visitorScore:g.marcador_visita,
   venue:plain(state.sedesPorId[g.sede_id]?.nombre||'Sede por definir'),mvp:p?plain(p.nombre):'',
   sponsors:(state.patrocinadores||[]).slice(0,3).map(s=>({name:plain(s.nombre),logo:s.logo||''})),
   query:new URLSearchParams({juego:g.id,categoria:g.categoria_id,temporada:g.temporada}).toString()};
 }
 const api={plain,gameModel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArenaCore=api;
})(typeof window!=='undefined'?window:this);

