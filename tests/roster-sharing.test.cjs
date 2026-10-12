const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('Team image actions preserve official and friendly scopes, exact team/category/season links and all roster rows',()=>{
 const mounts=[],element={addEventListener(){},innerHTML:''};
 const context={URL,URLSearchParams,location:{href:'https://caborcavets.online/equipos/'},document:{getElementById:()=>element},RUTA_IMG:'../',escaparHTML:v=>v,linkJugador:(id,name)=>name,esAmistoso:()=>false,ArenaUI:{switches:()=>''},LMBCDownloads:{mount:m=>mounts.push(m)}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/equipos.js'),'utf8').replace('iniciarEquipos();',''),context);
 vm.runInContext("ESTADO_E={equiposPorId:{a:{id:'a',nombre:'Equipo A',logo:'img/a.png'}},juegosOficiales:[],juegosAmistosos:[],categorias:[{id:'f40',nombre:'Femenil 40'}],temporadas:[{id:'2026-2',nombre:'Temporada activa'}],patrocinadores:[]};categoriaActivaE='f40';temporadaActivaE='2026-2';renderDetalleEquipo('a');",context);
 assert.equal(mounts.length,2);assert.equal(mounts[0].tableSelector,'#profile-oficial .standing-table');assert.equal(mounts[1].tableSelector,'#profile-amistosos .standing-table');
 for(const m of mounts){assert.equal(m.category,'Femenil 40');assert.equal(m.season,'Temporada activa');const link=new URL(m.page);assert.equal(link.searchParams.get('equipo'),'a');assert.equal(link.searchParams.get('categoria'),'f40');assert.equal(link.searchParams.get('temporada'),'2026-2');}
 const rows=Array.from({length:30},(_,i)=>({cells:['Jugadora '+i,'2','10','1','3'],logos:[]}));const model={headers:['Jugador','JJ','Pts','3pt','Faltas'],rows};const before=JSON.stringify(model),result=mounts[0].prepare(model);
 assert.equal(result.rows.length,32);assert.equal(result.rows[0].logos[0],'https://caborcavets.online/img/a.png');assert.equal(result.rows[30].cells[0],'Jugadora 29');assert.deepEqual(Array.from(result.rows.at(-1).cells),['Total','—','300','30','90']);assert.equal(JSON.stringify(model),before);assert.match(mounts[1].note,/independientes/);assert.match(element.innerHTML,/Exportar a PDF/);
});
