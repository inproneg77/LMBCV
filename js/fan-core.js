(function(root){
 'use strict';
 const official=g=>g.fase!=='amistoso'&&g.ambito!=='amistoso';
 const regular=g=>official(g)&&(g.fase??'regular')==='regular';
 const forfeit=g=>['local','visita'].includes(g.forfeit);
 const score=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 function hour(v){const s=String(v??'').trim(),m=s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);if(!m)return s||'Por confirmar';let h=+m[1];if(+m[2]>59||h>23||(m[3]&&(h<1||h>12)))return 'Por confirmar';if(m[3])h=h%12+(/pm/i.test(m[3])?12:0);return String(h).padStart(2,'0')+':'+m[2];}
 const order=(a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))||hour(a.hora).localeCompare(hour(b.hora))||String(a.id).localeCompare(String(b.id));
 const winner=g=>g.forfeit==='local'?g.visita:g.forfeit==='visita'?g.local:score(g.marcador_local)===null||score(g.marcador_visita)===null?null:Number(g.marcador_local)>Number(g.marcador_visita)?g.local:Number(g.marcador_visita)>Number(g.marcador_local)?g.visita:null;
 const favoriteKey=(category,season)=>'lmbc_favorite:'+encodeURIComponent(season)+':'+encodeURIComponent(category);
 function seriesModel(s){let a=0,b=0,invalid=false;const used=new Set();const games=[];for(const j of [...(s.juegos??[])].sort((x,y)=>Number(x.numero)-Number(y.numero))){if(String(j.jugado)!=='true')continue;const n=Number(j.numero);if(!Number.isInteger(n)||n<1||n>3||used.has(n)){invalid=true;continue;}used.add(n);const x=score(j.marcador_a),y=score(j.marcador_b);if(x===null||y===null||x<0||y<0||x===y||a===2||b===2){invalid=true;continue;}x>y?a++:b++;games.push(j);}return {a,b,invalid,games,winner:!invalid?(a===2?s.equipoA:b===2?s.equipoB:null):null};}
 function seriesAllowsGame(g,series=[]){if(!['playoffs','final'].includes(g.fase))return true;return !series.some(s=>s.categoria_id===g.categoria_id&&s.temporada===g.temporada&&(s.ronda==='Final')===(g.fase==='final')&&[s.equipoA,s.equipoB].includes(g.local)&&[s.equipoA,s.equipoB].includes(g.visita)&&seriesModel(s).winner);}
 function teamModel(state,category,season,teamId,today,table){
  const teams=state.equipos.filter(e=>e.categoria_id===category),team=teams.find(e=>e.id===teamId);if(!team)return null;
  const scope=state.juegos.filter(g=>g.categoria_id===category&&g.temporada===season&&official(g)),reg=scope.filter(g=>regular(g)&&g.estatus==='jugado'),rows=table(teams,reg),position=rows.findIndex(r=>r.equipo.id===teamId),standing=rows[position];
  const mine=scope.filter(g=>g.local===teamId||g.visita===teamId),played=mine.filter(g=>g.estatus==='jugado').sort(order).reverse(),court=reg.filter(g=>!forfeit(g)&&(g.local===teamId||g.visita===teamId)&&score(g.marcador_local)!==null&&score(g.marcador_visita)!==null).sort(order).reverse();
  let pf=0,pc=0;for(const g of court){pf+=Number(g.local===teamId?g.marcador_local:g.marcador_visita);pc+=Number(g.local===teamId?g.marcador_visita:g.marcador_local);}
  let streak=0;const first=winner(court[0]??{});if(first)for(const g of court){if(winner(g)!==first)break;streak++;}
  let featured=null;for(const g of played.filter(g=>!forfeit(g))){const side=g.local===teamId?'local':'visita',line=(g['estadisticas_'+side]??[]).find(x=>x.jugador===g.mvp_jugador&&String(x.asistio)!=='false'),player=state.jugadoresPorId[g.mvp_jugador];if(line&&player){featured={player,game:g,points:Number(line.puntos)||0,threes:Number(line.triples)||0,label:'MVP del partido',scope:g.fecha};break;}}
  const totals={};for(const g of court){const side=g.local===teamId?'local':'visita';for(const l of g['estadisticas_'+side]??[]){const p=state.jugadoresPorId[l.jugador];if(!p||String(l.asistio)==='false')continue;const t=totals[l.jugador]??={player:p,points:0,threes:0,games:0};t.points+=Number(l.puntos)||0;t.threes+=Number(l.triples)||0;t.games++;}}
  const leaders=Object.values(totals).sort((a,b)=>b.points-a.points||a.player.nombre.localeCompare(b.player.nombre));
  const journey=(state.playoffs??[]).filter(s=>s.categoria_id===category&&s.temporada===season&&(s.equipoA===teamId||s.equipoB===teamId)).sort((a,b)=>['Cuartos de Final','Semifinal','Final'].indexOf(a.ronda)-['Cuartos de Final','Semifinal','Final'].indexOf(b.ronda)).map(s=>({series:s,...seriesModel(s)}));
  const next=mine.filter(g=>g.estatus==='programado'&&g.fecha>=today&&seriesAllowsGame(g,state.playoffs)).sort(order)[0];
  return {team,standing,position:standing?.jj?position+1:null,played,next,court,pf,pc,offense:court.length?pf/court.length:null,defense:court.length?pc/court.length:null,streak,streakWon:first===teamId,featured,leaders,journey};
 }
 const api={official,regular,forfeit,score,hour,order,winner,favoriteKey,seriesModel,seriesAllowsGame,teamModel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FanCore=api;
})(typeof window!=='undefined'?window:this);
