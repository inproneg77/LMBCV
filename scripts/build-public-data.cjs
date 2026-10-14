const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const digest = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0,24);
function build(root = path.resolve(__dirname,'..')) {
  const inputs = {}, read = (name, fallback) => {
    const file = path.join(root,name);
    if (!fs.existsSync(file)) return fallback;
    const bytes = fs.readFileSync(file,'utf8'); inputs[name] = bytes;
    return JSON.parse(bytes);
  };
  const categories = read('data/categorias.json',[]);
  const seasons = read('data/temporadas.json',{temporadas:[]}).temporadas;
  const teams = read('data/equipos.json',{equipos:[]});
  const roster = read('data/roster.json',{jugadores:[]});
  const friendly = read('data/amistosos.json',{equipos:[],jugadores:[],juegos:[]});
  const files = {
    'data/categorias.json':categories,
    'data/temporadas.json':{temporadas:seasons},
    'data/equipos.json':teams,
    'data/sedes.json':read('data/sedes.json',{sedes:[]}),
    'data/patrocinadores.json':read('data/patrocinadores.json',{patrocinadores:[]}),
  };
  const games = [], bySeason = {};
  for (const cat of categories) {
    files[`data/playoffs_${cat.id}.json`] = read(`data/playoffs_${cat.id}.json`,{series:[]});
    for (const season of seasons) {
      const name = `data/juegos_${cat.id}/${season.id}.json`;
      const data = read(name,{juegos:[]});
      (bySeason[season.id] ??= {})[name] = data;
      games.push(...(data.juegos||[]).map(g=>({...g,categoria_id:cat.id})));
    }
  }
  games.push(...(friendly.juegos||[]).map(g=>({...g,fase:'amistoso'})));
  inputs['@compiler']=fs.readFileSync(__filename,'utf8');
  for(const name of ['amistosos','datos','fan-core','lideres','rankings','jugador','dashboard'])inputs['@rules/'+name]=fs.readFileSync(path.join(root,'js/'+name+'.js'),'utf8');
  const sourceDigest = digest(Object.entries(inputs).sort(([a],[b])=>a.localeCompare(b)));
  const prefix = `data/public/${sourceDigest}/`;
  const output = new Map();
  const put = (name,data) => { const destination=prefix+name; output.set(destination,JSON.stringify(data)); return destination; };
  const allTeams = teams.equipos.flatMap(e=>(e.categorias||[]).map(categoria_id=>({...e,categoria_id})));
  const state = {categorias:categories,temporadas:seasons,equipos:allTeams,juegos:games,
    juegosOficiales:games.filter(g=>g.fase!=='amistoso'&&g.ambito!=='amistoso'),juegosAmistosos:games.filter(g=>g.fase==='amistoso'||g.ambito==='amistoso'),
    equiposPorId:Object.fromEntries([...(friendly.equipos||[]),...allTeams].map(e=>[e.id,e])),
    jugadoresPorId:Object.fromEntries([...(friendly.jugadores||[]),...roster.jugadores].map(p=>[p.id,p])),
  };
  // Reuse the published league rules rather than maintaining a second scoring implementation.
  const rules = {window:{},URLSearchParams,console,FanCore:require(path.join(root,'js/fan-core.js'))};
  vm.createContext(rules);
  for(const name of ['amistosos','datos','lideres','rankings','jugador','dashboard']) {
    const code=fs.readFileSync(path.join(root,`js/${name}.js`),'utf8').replace(/^iniciar(?:Lideres|Rankings|Jugador|Dashboard)\(\);\s*$/gm,'');
    vm.runInContext(code,rules);
  }
  rules.state=state;
  vm.runInContext('ESTADO_L=state;ESTADO_R=state;ESTADO_J=state;ESTADO_D=state;',rules);
  const thin = g => {
    const {estadisticas_local,estadisticas_visita,estadisticas,...rest}=g;
    return {...rest,estadisticas_disponibles:!!((estadisticas_local??estadisticas??[]).length+(estadisticas_visita??[]).length),
      public_mvp_line:[...(estadisticas_local??estadisticas??[]),...(estadisticas_visita??[])].find(e=>e.jugador===g.mvp_jugador&&String(e.asistio)!=='false')||null};
  };
  const thinGames=games.map(thin), summaries={}, seasonPaths={}, summaryPaths={};
  for (const season of seasons) {
    const metrics={};
    for(const cat of categories){
      rules.cat=cat.id;rules.season=season.id;
      vm.runInContext('categoriaActivaL=cat;temporadaActivaL=season;categoriaActivaR=cat;temporadaActivaR=season;',rules);
      const official=(bySeason[season.id][`data/juegos_${cat.id}/${season.id}.json`].juegos||[]).map(g=>({...g,categoria_id:cat.id})).filter(g=>g.temporada===season.id&&g.fase!=='amistoso'&&g.ambito!=='amistoso');
      rules.scoped={...state,juegosOficiales:official};vm.runInContext('ESTADO_L=scoped;ESTADO_R=scoped;',rules);
      metrics[cat.id]={
        standings:rules.calcularTablaLiga(allTeams.filter(t=>t.categoria_id===cat.id),official.filter(g=>g.estatus==='jugado'&&(g.fase??'regular')==='regular')).map(({equipo,...r})=>({...r,equipoId:equipo.id})),
        leaders:rules.acumularEstadisticas().map(({jugador,equipo,...r})=>({...r,jugadorId:jugador.id,equipoId:equipo?.id})),
        performance:rules.calcularEstadisticasEquipos().map(({equipo,...r})=>({...r,equipoId:equipo.id})),
      };
    }
    summaries[season.id]=metrics;
    const bundle = list => ({schema:1,revision:sourceDigest,season:season.id,files:Object.fromEntries(categories.map(cat=>[
      `data/juegos_${cat.id}/${season.id}.json`,{juegos:(bySeason[season.id][`data/juegos_${cat.id}/${season.id}.json`].juegos||[]).map(g=>list===games?g:thin({...g,categoria_id:cat.id})).map(({categoria_id,...g})=>g)}
    ])),friendly:{equipos:(friendly.equipos||[]).filter(t=>list.some(g=>g.temporada===season.id&&(g.local===t.id||g.visita===t.id))),jugadores:(friendly.jugadores||[]).filter(p=>list.some(g=>g.temporada===season.id&&[...(g.estadisticas_local||[]),...(g.estadisticas_visita||[])].some(e=>e.jugador===p.id))),juegos:(friendly.juegos||[]).filter(g=>g.temporada===season.id).map(g=>list===games?{...g,fase:'amistoso'}:thin({...g,fase:'amistoso'}))}});
    seasonPaths[season.id]=put('season/'+digest(season.id)+'.json',bundle(games));
    summaryPaths[season.id]=put('summary/'+digest(season.id)+'.json',{...bundle(thinGames),metrics});
  }
  const profiles={};
  for(const [id,player] of Object.entries(state.jugadoresPorId)){
    rules.playerId=id;
    const official=rules.bitacoraDe(id),friends=rules.bitacoraDe(id,state.juegosAmistosos);
    const groups=[...rules.agruparPorTemporada(official).map(g=>({...g,kind:'oficial'})),...rules.agruparPorTemporada(friends).map(g=>({...g,kind:'amistosos'}))];
    const totals=official.reduce((a,f)=>({jj:a.jj+1,puntos:a.puntos+f.puntos,triples:a.triples+f.triples,faltas:a.faltas+f.faltas}),{jj:0,puntos:0,triples:0,faltas:0});
    const seasonFiles={};
    for(const season of new Set(groups.map(g=>g.temporadaId))){
      const rows=[...official,...friends].filter(f=>f.juego.temporada===season);
      const unique=new Map(rows.map(f=>[JSON.stringify([f.juego.categoria_id,f.juego.temporada,f.juego.id]),f.juego]));
      // A player chapter needs their own participation, not every opponent's roster.
      const own=(e,g)=>(g.fase==='amistoso'||g.ambito==='amistoso')?rules.mismoRegistroAmistoso(e.jugador,id,state.jugadoresPorId):e.jugador===id;
      seasonFiles[season]=put('player/'+digest(id)+'/'+digest(season)+'.json',{schema:1,revision:sourceDigest,games:[...unique.values()].map(g=>({...g,
        estadisticas_local:(g.estadisticas_local??g.estadisticas??[]).filter(e=>own(e,g)),estadisticas_visita:(g.estadisticas_visita??[]).filter(e=>own(e,g)),estadisticas:undefined}))});
    }
    profiles[id]=put('player/'+digest(id)+'/index.json',{schema:1,revision:sourceDigest,player,totals,mvp:rules.contarMVP(id),
      memberships:roster.jugadores.find(p=>p.id===id)?.membresias||[],aliases:Object.values(state.jugadoresPorId).filter(p=>rules.mismoRegistroAmistoso(p.id,id,state.jugadoresPorId)),friendlyTeams:(friendly.equipos||[]).filter(t=>friends.some(f=>f.juego.local===t.id||f.juego.visita===t.id)),seasons:seasonFiles,
      groups:groups.map(({filas,...g})=>g)});
  }
  
  const latestByCategory={};
  for(const cat of categories){const latest=[...state.juegosOficiales].filter(g=>g.categoria_id===cat.id&&g.estatus==='jugado').sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)))[0];if(latest)latestByCategory[cat.id]=latest.temporada;}
  const index={schema:1,revision:sourceDigest,files,directory:put('directory.json',{equipos:teams.equipos,jugadores:roster.jugadores.map(p=>({id:p.id,nombre:p.nombre})),categorias:categories,temporadas:seasons}),roster:put('roster.json',roster),friendly:put('friendly.json',friendly),seasons:seasonPaths,summaries:summaryPaths,profileRoot:prefix+'player/',latestByCategory,
    dashboard:put('dashboard.json',{schema:1,revision:sourceDigest,games:thinGames.filter(g=>g.estatus==='programado'||g.temporada===latestByCategory[g.categoria_id]),leaders:Object.fromEntries(categories.map(c=>[c.id,rules.liderPuntos(c.id)]))})};
  output.set('data/public/index.json',JSON.stringify(index));
  for(const [name,content] of output){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
  return {revision:sourceDigest,files:output.size,seasons:seasons.length,games:games.length,players:Object.keys(profiles).length,output};
}
module.exports={build,digest};
if(require.main===module){const {output,...report}=build();console.log(JSON.stringify(report));}
