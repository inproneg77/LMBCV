(function(root){
 'use strict';
 const text=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function filterGames(games,{category='',season='',team='',state='',kind='',query=''}={},teams={}){return games.filter(g=>(!category||g.categoria_id===category)&&(!season||g.temporada===season)&&(!team||g.local===team||g.visita===team)&&(!state||g.estatus===state)&&(!kind||(kind==='amistoso'?(g.fase==='amistoso'||g.ambito==='amistoso'):g.fase!=='amistoso'&&g.ambito!=='amistoso'))&&(!query||text([teams[g.local]?.nombre,teams[g.visita]?.nombre].join(' ')).includes(text(query))));}
 const upcoming=(games,today)=>games.filter(g=>g.estatus==='programado'&&g.fecha>=today).sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.hora||'').localeCompare(b.hora||''));
 const recent=games=>games.filter(g=>g.estatus==='jugado').sort((a,b)=>b.fecha.localeCompare(a.fecha)||(b.hora||'').localeCompare(a.hora||''));
 function leaders(games,players){const totals={};for(const g of games.filter(g=>g.estatus==='jugado'&&g.fase!=='amistoso'&&g.ambito!=='amistoso'))for(const s of [...(g.estadisticas_local??g.estadisticas??[]),...(g.estadisticas_visita??[])]){if(String(s.asistio)==='false')continue;const p=players[s.jugador];if(!p)continue;const t=totals[s.jugador]??={id:s.jugador,name:p.nombre,points:0,threes:0,games:0};t.points+=Number(s.puntos)||0;t.threes+=Number(s.triples)||0;t.games++;}return Object.values(totals);}
 const api={filterGames,upcoming,recent,leaders,text};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PortalCore=api;
})(typeof window!=='undefined'?window:this);
