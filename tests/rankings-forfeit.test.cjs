const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const game=(extra={})=>({categoria_id:'var40',temporada:'2026-2',estatus:'jugado',fase:'regular',local:'A',visita:'B',marcador_local:60,marcador_visita:40,estadisticas_local:[{triples:6,faltas:8}],estadisticas_visita:[{triples:4,faltas:10}],...extra});
function setup(juegos){
 const node={innerHTML:'',querySelectorAll:()=>[]};
 const c=vm.createContext({document:{getElementById:()=>node},RUTA_IMG:''});
 for(const p of ['amistosos','rankings','standing'])vm.runInContext(fs.readFileSync(path.join(root,'js',p+'.js'),'utf8').replace(/^iniciar(?:Rankings|Standing)\(\);\s*$/gm,''),c);
 c.state={equipos:['A','B','C'].map(id=>({id,nombre:id,categoria_id:'var40'})),juegosOficiales:juegos};
 const run=s=>vm.runInContext(s,c);
 run('ESTADO_R=state;ESTADO_S=state;categoriaActivaR=categoriaActivaS="var40";temporadaActivaR=temporadaActivaS="2026-2";tipoActivoR="ofensivo"');
 return {run,node,c};
}
test('both forfeit sides leave all five averages and counted games unchanged',()=>{
 const regular=[game(),game({marcador_local:70,marcador_visita:50})];
 const baseline=JSON.stringify(setup(regular).run('calcularEstadisticasEquipos()'));
 for(const forfeit of ['local','visita']){
  const games=[...regular,game({forfeit,marcador_local:forfeit==='local'?0:20,marcador_visita:forfeit==='local'?20:0,estadisticas_local:[{triples:999,faltas:999}],estadisticas_visita:[{triples:999,faltas:999}]})];
  const before=JSON.stringify(games),{run}=setup(games);
  assert.equal(JSON.stringify(run('calcularEstadisticasEquipos()')),baseline);
  assert.equal(run('calcularEstadisticasEquipos()[0].promPF'),65);
  assert.equal(run('calcularEstadisticasEquipos()[0].jj'),2);
  assert.equal(JSON.stringify(games),before);
 }
});
test('forfeit-only teams are unranked and show explanatory text in every team ranking',()=>{
 const {run,node}=setup([game({forfeit:'visita',marcador_local:20,marcador_visita:0})]);
 assert.equal(run('calcularEstadisticasEquipos().length'),0);
 for(const tipo of ['ofensivo','defensivo','tripleros','defensa3','fairplay']){
  run('tipoActivoR='+JSON.stringify(tipo)+';renderRankings()');
  assert.match(node.innerHTML,/se excluyen forfeits de ambos equipos/);
  assert.match(node.innerHTML,/Sin juegos disputados \(fuera del ranking\):/);
  assert.doesNotMatch(node.innerHTML,/NaN|Infinity|0\.0/);
 }
});
test('standing retains administrative scores, played games, wins and classification points',()=>{
 for(const forfeit of ['local','visita']){
  const {run}=setup([game({forfeit,marcador_local:forfeit==='local'?0:20,marcador_visita:forfeit==='local'?20:0})]);
  const standings=run('calcularStanding()');
  const winner=standings.find(s=>s.equipo.id===(forfeit==='local'?'B':'A'));
  const loser=standings.find(s=>s.equipo.id===(forfeit==='local'?'A':'B'));
  assert.equal(winner.jj,1);assert.equal(winner.jg,1);assert.equal(winner.pf,20);assert.equal(winner.pc,0);assert.equal(winner.pts,2);
  assert.equal(loser.jj,1);assert.equal(loser.jp,1);assert.equal(loser.pf,0);assert.equal(loser.pc,20);assert.equal(loser.pts,0);
 }
});
test('real 20-0 scores count without a forfeit flag; filters retain category, season and regular phase',()=>{
 const {run}=setup([game({marcador_local:20,marcador_visita:0}),game({forfeit:'ninguno'}),game({categoria_id:'fem40'}),game({temporada:'2025'}),game({fase:'playoffs'}),game({estatus:'programado'})]);
 assert.equal(run('calcularEstadisticasEquipos()[0].jj'),2);
 assert.equal(run('calcularEstadisticasEquipos()[0].promPF'),40);
});
