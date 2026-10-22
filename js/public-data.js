(function(root){
 'use strict';
 const base=new URL('../',document.currentScript.src);
 const requests=new Map();
 async function json(name,optional=false){
  if(!/^data\/public\/[a-zA-Z0-9_./-]+\.json$/.test(name))throw Error('Ruta pública inválida.');
  if(!requests.has(name))requests.set(name,(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),optional?2500:9000);
   // El índice siempre se revalida. Cada paquete tiene una ruta nueva al
   // cambiar los datos: reutilizarlo no puede ocultar capturas recientes.
   const immutable=/^data\/public\/[a-f0-9]{24}\//.test(name);
   try{const response=await fetch(new URL(name,base).href,{cache:immutable?'force-cache':'no-cache',signal:controller.signal});if(!response.ok)throw Error('No se pudo cargar '+name);return await response.json();}
   finally{clearTimeout(timer);}
  })().catch(error=>{requests.delete(name);throw error;}));
  return requests.get(name);
 }
 async function load(options){
  let index;try{index=await json('data/public/index.json',true);}catch{return null;}
  if(index?.schema!==1||!index.revision||!Array.isArray(index.files?.['data/temporadas.json']?.temporadas)||!index.seasons||!index.summaries)return null;
  const revision=index.revision,seasonList=index.files['data/temporadas.json'].temporadas;
  const active=seasonList.find(s=>String(s.activa)==='true')?.id||[...seasonList].sort((a,b)=>b.id.localeCompare(a.id))[0]?.id;
  const selected=options.temporada==='activa'||(options.temporada&&!seasonList.some(s=>s.id===options.temporada))?active:options.temporada;
  const mode=options.publico,loaded=new Map(),metrics={};let roster,profile,dashboard;
  const valid=value=>{if(value.schema!==1||value.revision!==revision)throw Error('La publicación cambió durante la consulta. Recarga para consultar la versión actual.');return value;};
  async function season(id){
   if(!loaded.has(id)){
    const path=(mode==='resumen'?index.summaries:index.seasons)[id];
    if(!path)return null;
    const value=valid(await json(path));loaded.set(id,value);if(value.metrics)metrics[id]=value.metrics;
   }
   return loaded.get(id);
  }
  // El roster y los partidos son independientes; no esperar a descargar
  // toda la temporada para comenzar a pedir los nombres y las fotos.
  const rosterRequest=options.roster!==false&&mode!=='jugador'?json(index.roster):Promise.resolve();
  rosterRequest.catch(()=>{});
  try{
   if(mode==='jugador'){
    const encoded=new TextEncoder().encode(options.jugador||''),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoded)),b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
    profile=valid(await json(index.profileRoot+hash+'/index.json'));
    const first=selected||active;
    if(profile.seasons[first])loaded.set(first,valid(await json(profile.seasons[first])));
   }else if(mode==='dashboard')dashboard=valid(await json(index.dashboard));
   else if(mode==='playoffs'){}
   else await Promise.all((selected?[selected]:seasonList.map(s=>s.id)).map(season));
   roster=await rosterRequest;
  }catch{return null;}
  async function read(name,fallback){
   if(Object.hasOwn(index.files,name))return index.files[name];
   if(name==='data/roster.json'){
    if(profile)return {jugadores:[{...profile.player,membresias:profile.memberships}]};
    return roster??=(await json(index.roster));
   }
   if(name==='data/amistosos.json'){
    if(profile)return {equipos:profile.friendlyTeams||[],jugadores:profile.aliases||[],juegos:[...loaded.values()].flatMap(s=>s.games||[]).filter(g=>g.fase==='amistoso'||g.ambito==='amistoso')};
    if(dashboard)return {equipos:[],jugadores:[],juegos:[]};
    if(!selected)return await json(index.friendly);
    const bundles=await Promise.all((selected?[selected]:seasonList.map(s=>s.id)).map(season));
    const teams=new Map(),players=new Map();for(const b of bundles.filter(Boolean)){for(const t of b.friendly.equipos)teams.set(t.id,t);for(const p of b.friendly.jugadores)players.set(p.id,p);}
    return {equipos:[...teams.values()],jugadores:[...players.values()],juegos:bundles.filter(Boolean).flatMap(b=>b.friendly.juegos)};
   }
   const match=name.match(/^data\/juegos_([^/]+)\/([^/]+)\.json$/);
   if(match){
    if(mode==='playoffs')return {juegos:[]};
    if(profile)return {juegos:[...(loaded.get(match[2])?.games||[])].filter(g=>g.categoria_id===match[1]&&g.fase!=='amistoso'&&g.ambito!=='amistoso').map(({categoria_id,...g})=>g)};
    if(dashboard)return {juegos:dashboard.games.filter(g=>g.categoria_id===match[1]&&g.temporada===match[2]).map(({categoria_id,...g})=>g)};
    return (await season(match[2]))?.files[name]||fallback;
   }
   return fallback;
  }
  return {read,profile,index,metrics,dashboardLeaders:dashboard?.leaders,profileLoaded:()=>[...loaded.keys()],
   async friendlySeason(id){return (await season(id))?.friendly;},
   async profileSeason(id){if(!profile?.seasons[id]||loaded.has(id))return [];const value=valid(await json(profile.seasons[id]));loaded.set(id,value);return value.games;}
  };
 }
 root.LMBCPublic={load,async directory(){try{const index=await json('data/public/index.json',true);if(index?.schema!==1||!index.directory)return null;const data=await json(index.directory);return [{equipos:data.equipos},{jugadores:data.jugadores},data.categorias,{temporadas:data.temporadas}];}catch{return null;}}};
})(window);
