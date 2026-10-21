const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../nuevo-jugador/index.html'),'utf8');
function fixture({currentName='JUAN PEREZ',fail=false}={}){
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{value:'',disabled:false,hidden:false,style:{},className:'',textContent:'',dataset:{},classList:{remove(){},add(){}},querySelectorAll(){return [];},addEventListener(){}});
    return nodes.get(id);
  };
  node('sel-modo').value='existente'; node('sel-alcance').value='amistoso';
  node('in-nombre-existente').value='JUAN PÉREZ GARCÍA';
  const fresh={sha:'fresh-sha',contenido:{version:4,jugadores:[{id:'JPEREZ',nombre:currentName,foto:'img/jugadores/juan.png',numero:'12',membresias:[{equipo_id:'a',categoria_id:'v40',temporada:'2026-2'},{equipo_id:'b',categoria_id:'v50',temporada:'2026-2'}],participaciones_amistosos:[{juego_id:'amistoso-1'}],extra:{keep:true}},{id:'OTRO',nombre:'OTRO JUGADOR'}]}};
  const original=JSON.stringify(fresh),writes=[];
  const ctx={document:{getElementById:node,querySelectorAll:()=>[]},window:{LMBCAuth:{get:()=> 'fixture-token'},CaptureGuard:{persist(){},setBusy(){}}},localStorage:{getItem:()=>null}};
  vm.createContext(ctx);
  vm.runInContext(html.match(/<script>\s*(const OWNER[\s\S]*?)<\/script>/)[1].replace(/iniciar\(\);\s*$/,''),ctx);
  ctx.fresh=fresh;
  ctx.write=async(path,sha,body,message)=>{if(fail)throw Error('Conflicto (409)');writes.push({path,sha,body:JSON.parse(JSON.stringify(body)),message});};
  vm.runInContext("jugadorExistenteElegido={id:'JPEREZ',nombre:'JUAN PEREZ'};ghFetch=async()=>fresh;ghGuardar=write;",ctx);
  return {ctx,node,fresh,original,writes};
}
test('Rename saves only the selected name using a fresh SHA, preserving photo, ID, all memberships and other players',async()=>{
  const f=fixture();
  await vm.runInContext('guardarNombre()',f.ctx);
  assert.equal(f.writes.length,1);
  const write=f.writes[0],before=JSON.parse(f.original).contenido;
  assert.equal(write.path,'data/roster.json');assert.equal(write.sha,'fresh-sha');
  before.jugadores[0].nombre='JUAN PÉREZ GARCÍA';assert.deepEqual(write.body,before);
  assert.equal(vm.runInContext('jugadorExistenteElegido.nombre',f.ctx),'JUAN PÉREZ GARCÍA');
  assert.match(f.node('msg-nombre').textContent,/Nombre guardado/);
  assert.equal(f.node('btn-guardar-nombre').disabled,true);
});
test('Name correction works without category, season, team or friendly game selection',()=>{
  const f=fixture();vm.runInContext('validarFormulario()',f.ctx);
  assert.equal(f.node('btn-guardar-nombre').disabled,false);
  assert.equal(f.node('btn-guardar').disabled,true);
});
test('Empty or unchanged names never write',async()=>{
  for(const value of ['   ','JUAN PEREZ']){
    const f=fixture();f.node('in-nombre-existente').value=value;
    await vm.runInContext('guardarNombre()',f.ctx);assert.equal(f.writes.length,0);
  }
});
test('Concurrent name change or deleted player is rejected without writing',async()=>{
  for(const deleted of [false,true]){
    const f=fixture({currentName:'NOMBRE CORREGIDO POR OTRO'});
    if(deleted)f.fresh.contenido.jugadores.shift();
    await vm.runInContext('guardarNombre()',f.ctx);
    assert.equal(f.writes.length,0);assert.equal(f.node('msg-nombre').className,'cap-msg error');
  }
});
test('Conflicting GitHub write keeps entered correction for retry and reports failure',async()=>{
  const f=fixture({fail:true});await vm.runInContext('guardarNombre()',f.ctx);
  assert.equal(f.node('in-nombre-existente').value,'JUAN PÉREZ GARCÍA');
  assert.equal(f.node('msg-nombre').className,'cap-msg error');
  assert.equal(vm.runInContext('jugadorExistenteElegido.nombre',f.ctx),'JUAN PEREZ');
  assert.equal(vm.runInContext('guardandoJugador',f.ctx),false);
});
test('Searching another player clears the name editor and double submits are blocked',async()=>{
  const f=fixture();vm.runInContext("guardandoJugador=true",f.ctx);
  await vm.runInContext('guardarNombre()',f.ctx);assert.equal(f.writes.length,0);
  vm.runInContext("guardandoJugador=false;document.getElementById('in-buscar').value='';buscarJugadorExistente()",f.ctx);
  assert.equal(f.node('editar-nombre-existente').hidden,true);assert.equal(f.node('in-nombre-existente').value,'');
});
