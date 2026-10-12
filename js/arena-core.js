(function(root){
 'use strict';
 const plain=v=>String(v??'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
 function gameModel(g,state){
  const a=state.equiposPorId[g.local]||{},b=state.equiposPorId[g.visita]||{};
  const kind=g.fase==='amistoso'?'Amistoso':g.fase==='playoffs'?'Playoffs':g.fase==='final'?'Final':'Liga';
  const p=state.jugadoresPorId[g.mvp_jugador];
  return {id:g.id,date:g.fecha,time:typeof FanCore!=='undefined'?FanCore.hour(g.hora):g.hora,category:plain(state.categorias.find(c=>c.id===g.categoria_id)?.nombre||g.categoria_id),
   season:plain(state.temporadas.find(t=>t.id===g.temporada)?.nombre||g.temporada),kind,
   played:g.estatus==='jugado',forfeit:['local','visita'].includes(g.forfeit),local:plain(a.nombre||'Por definir'),visitor:plain(b.nombre||'Por definir'),
   localLogo:a.logo||'',visitorLogo:b.logo||'',localScore:g.marcador_local,visitorScore:g.marcador_visita,
   venue:plain(state.sedesPorId[g.sede_id]?.nombre||'Sede por definir'),mvp:p?plain(p.nombre):'',mvpPhoto:p?.foto||'',
   mvpLine:p?[...(g.estadisticas_local??[]),...(g.estadisticas_visita??[])].find(l=>l.jugador===g.mvp_jugador&&String(l.asistio)!=='false')||null:null,
   sponsors:(state.patrocinadores||[]).slice(0,3).map(s=>({name:plain(s.nombre),logo:s.logo||''})),
   query:new URLSearchParams({juego:g.id,categoria:g.categoria_id,temporada:g.temporada}).toString()};
 }
 const gameKind=g=>g.fase==='amistoso'||g.ambito==='amistoso'?'Amistosos':'Liga';
 function jornadaScopes(games){
  const groups=new Map();for(const g of games){if(!['programado','jugado'].includes(g.estatus))continue;const scope={date:g.fecha,category:g.categoria_id,season:g.temporada,kind:gameKind(g)};groups.set(JSON.stringify(scope),scope);}return [...groups.values()];
 }
 function jornadaModels(games,state,scope){
  if(!scope.date||!scope.category||!scope.season||!scope.kind)throw Error('Selecciona fecha, categoría y temporada.');
  const selected=games.filter(g=>g.fecha===scope.date&&g.categoria_id===scope.category&&g.temporada===scope.season&&gameKind(g)===scope.kind&&['programado','jugado'].includes(g.estatus)).sort((a,b)=>(a.hora||'').localeCompare(b.hora||'')||String(a.id).localeCompare(String(b.id)));
  const category=plain(state.categorias.find(c=>c.id===scope.category)?.nombre||scope.category),season=plain(state.temporadas.find(t=>t.id===scope.season)?.nombre||scope.season);
  const page=new URLSearchParams({dia:scope.date,categoria:scope.category,temporada:scope.season,tipo:scope.kind==='Liga'?'liga':'amistoso'}).toString();
  const common={category,season,generated:new Date().toLocaleString('es-MX',{timeZone:'America/Hermosillo',hour12:false}),sponsors:state.patrocinadores||[],page:'https://caborcavets.online/calendario/?'+page};
  const rows=(list,result)=>list.map((g,i)=>{const m=gameModel(g,state);return {cells:result?[String(i+1),m.local,String(m.localScore)+' – '+String(m.visitorScore)+(m.forfeit?' · Forfeit':''),m.visitor,m.venue]:[String(i+1),m.local,m.visitor,m.time||'Por definir',m.venue],logos:result?['',m.localLogo,'',m.visitorLogo,'']:['',m.localLogo,m.visitorLogo,'','']};});
  const played=selected.filter(g=>g.estatus==='jugado');
  return {kind:scope.kind,rol:{...common,title:'Rol · '+scope.date,headers:['#','Local','Visitante','Hora','Sede'],rows:rows(selected,false),note:scope.kind+' · Todos los encuentros de esta categoría y rama en la fecha indicada. Horario de 24 horas.'},results:{...common,title:'Resultados · '+scope.date,headers:['#','Local','Marcador','Visitante','Sede'],rows:rows(played,true),note:scope.kind+' · '+played.length+' de '+selected.length+' encuentros con resultado capturado. Los partidos pendientes no se presentan como resultados.'}};
 }
 function statisticsModel(g,state){
  const m=gameModel(g,state),rows=[],all=[];
  for(const [name,logo,list] of [[m.local,m.localLogo,g.estadisticas_local??g.estadisticas??[]],[m.visitor,m.visitorLogo,g.estadisticas_visita??[]]]){
   rows.push({cells:['',name,'','',''],logos:['',logo,'','','']});
   if(!list.length){rows.push({cells:['','Sin estadísticas capturadas.','','',''],logos:[]});continue;}
   const totals=[0,0,0];list.forEach((e,i)=>{const player=plain(state.jugadoresPorId[e.jugador]?.nombre||e.jugador||'Sin nombre'),values=[e.puntos??0,e.triples??0,e.faltas??0];values.forEach((v,k)=>totals[k]+=Number(v));rows.push({cells:[String(i+1),player,...values.map(String)],logos:[]});all.push({...e,nombre:player});});
   rows.push({cells:['','Total de '+name,...totals.map(String)],logos:[]});
  }
  const leaders=[];for(const [key,label] of [['puntos','Más puntos'],['triples','Más triples'],['faltas','Más faltas']]){const first=[...all].sort((a,b)=>(Number(b[key])||0)-(Number(a[key])||0))[0];if(first&&(key==='puntos'||Number(first[key])>0))leaders.push(label+': '+first.nombre+' ('+(first[key]??0)+')');}
  return {title:'Estadísticas del juego',category:m.category,season:m.season,subtitle:m.local+' '+m.localScore+' – '+m.visitorScore+' '+m.visitor+' · '+m.date+' · '+m.time+' · '+m.venue+' · '+m.kind+(m.forfeit?' · Forfeit':''),headers:['#','Jugador / equipo','Pts','3pt','Faltas'],rows,generated:new Date().toLocaleString('es-MX',{timeZone:'America/Hermosillo',hour12:false}),sponsors:m.sponsors,page:'https://caborcavets.online/calendario/?'+m.query,note:leaders.join(' · ')};
 }
 const api={plain,gameModel,jornadaScopes,jornadaModels,statisticsModel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArenaCore=api;
})(typeof window!=='undefined'?window:this);


