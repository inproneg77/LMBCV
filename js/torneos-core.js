(function(root){
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const id = p => p+'-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
  const fail = message => { throw new Error(message); };
  const integer = (v,label,min=0,max=100000) => { const n=Number(v); if(!Number.isSafeInteger(n)||n<min||n>max)fail(label+': valor inválido.');return n; };
  const name = v => { const s=String(v??'').trim();if(!s||s.length>100)fail('Escribe un nombre de 1 a 100 caracteres.');return s; };
  const date = v => /^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  const minutes = v => { if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))fail('Usa una hora de 24 horas, por ejemplo 17:30.');return +v.slice(0,2)*60 + +v.slice(3); };
  const time = n => String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  function create(title){return {schema:1,id:id('tor'),name:name(title),status:'borrador',logo:'',start:'',end:'',timezone:'America/Hermosillo',venues:[],teams:[],entries:[],divisions:[],games:[],trash:[],history:[]};}
  function division(title,branch){return {id:id('div'),name:name(title),branch:name(branch),groups:[],qualify:2,win:2,loss:1,forfeit:0,tieOrder:[],bracketSeeds:[]};}
  const divisionEntries=(t,d)=>t.entries.filter(e=>e.divisionId===d);
  const teamName=(t,e)=>t.teams.find(x=>x.id===t.entries.find(x=>x.id===e)?.teamId)?.name??'Por definir';
  function assertUnique(items,label){const s=new Set();items.forEach(x=>{if(!x.id||s.has(x.id))fail('ID duplicado o vacío en '+label);s.add(x.id);});}
  function validate(t){
    if(t.schema!==1||!/^tor-[a-f0-9]+$/.test(t.id))fail('Formato de torneo inválido.');name(t.name);
    if(!['borrador','publicado','finalizado','archivado'].includes(t.status))fail('Estado de torneo inválido.');
    if(t.start&&!date(t.start)||t.end&&!date(t.end)||t.start&&t.end&&t.end<t.start)fail('Revisa las fechas del torneo.');
    try{new Intl.DateTimeFormat('es',{timeZone:t.timezone}).format();}catch{fail('Zona horaria inválida.');}
    for(const k of ['teams','entries','divisions','games','venues','trash']){if(!Array.isArray(t[k]))fail('Falta '+k);assertUnique(t[k],k);}
    t.teams.forEach(x=>name(x.name));t.venues.forEach(x=>name(x.name));
    const entryKeys=new Set();
    for(const d of t.divisions){name(d.name);name(d.branch);integer(d.qualify,'Clasificados',1,2);for(const k of ['win','loss','forfeit'])integer(d[k],'Puntos');assertUnique(d.groups,'grupos');d.groups.forEach(g=>name(g.name));}
    for(const e of t.entries){const d=t.divisions.find(d=>d.id===e.divisionId);if(!d||!t.teams.some(x=>x.id===e.teamId))fail('Inscripción sin equipo o división.');if(e.groupId&&!d.groups.some(g=>g.id===e.groupId))fail('Grupo de otra división.');const k=e.teamId+'|'+e.divisionId;if(entryKeys.has(k))fail('El equipo ya está inscrito en esta categoría y rama.');entryKeys.add(k);assertUnique(e.roster,'roster');e.roster.forEach(p=>name(p.name));}
    for(const g of t.games){if(!t.divisions.some(d=>d.id===g.divisionId))fail('Partido sin división.');if(!['groups','knockout'].includes(g.phase))fail('Fase inválida.');if(!['programado','jugado','cancelado'].includes(g.status))fail('Estado de partido inválido.');
      for(const side of ['home','away'])if(g[side]&&!t.entries.some(e=>e.id===g[side]&&e.divisionId===g.divisionId))fail('Un partido no puede cruzar categorías o ramas.');
      if(g.home&&g.home===g.away)fail('Un equipo no puede jugar contra sí mismo.');if(g.date&&!date(g.date))fail('Fecha inválida.');if(g.time)minutes(g.time);
      if(g.venueId&&!t.venues.some(v=>v.id===g.venueId))fail('Sede inexistente.');
      if(g.phase==='groups'&&(!g.home||!g.away||![g.home,g.away].every(e=>t.entries.find(x=>x.id===e)?.groupId===g.groupId)))fail('El partido debe pertenecer a su grupo.');
      for(const side of ['homeSource','awaySource'])if(g[side]&&!t.games.some(x=>x.id===g[side]&&x.divisionId===g.divisionId&&x.phase==='knockout'&&x.round<g.round))fail('Referencia de llave inválida.');
      if(g.status==='jugado'&&!g.bye)validateResult(t,g);
    }return t;
  }
  function validateResult(t,g){
    if(!g.home||!g.away)fail('Faltan participantes de este partido.');
    integer(g.homeScore,'Marcador local');integer(g.awayScore,'Marcador visitante');
    if(g.homeScore===g.awayScore)fail('Un partido terminado de básquetbol necesita un ganador.');
    if(!['ninguno','home','away'].includes(g.forfeit))fail('Forfeit inválido.');
    if(g.forfeit!=='ninguno'&&(g.homeScore!==(g.forfeit==='home'?0:20)||g.awayScore!==(g.forfeit==='away'?0:20)))fail('El forfeit debe quedar 20–0.');
    const seen=new Set();for(const side of ['home','away']){const roster=t.entries.find(e=>e.id===g[side]).roster;const lines=g[side+'Stats']??[];if(g.forfeit!=='ninguno'&&lines.length)fail('Un forfeit no lleva estadísticas individuales.');let sum=0;
      for(const line of lines){if(!roster.some(p=>p.id===line.playerId)||seen.has(line.playerId))fail('Jugador duplicado o ajeno al roster.');seen.add(line.playerId);sum+=integer(line.points,'Puntos');integer(line.threes,'Triples');integer(line.fouls,'Faltas');if(line.threes*3>line.points)fail('Los triples superan los puntos del jugador.');}
      if(g.statsComplete&&g.forfeit==='ninguno'&&sum!==g[side+'Score'])fail('La suma individual de '+teamName(t,g[side])+' ('+sum+') no coincide con el marcador ('+g[side+'Score']+'). Puedes guardar con estadísticas pendientes.');
    }if(g.mvp&&!seen.has(g.mvp))fail('El MVP debe tener participación registrada.');
  }
  function standings(t,divisionId,groupId){
    const d=t.divisions.find(d=>d.id===divisionId);if(!d)return [];
    const games=t.games.filter(g=>g.divisionId===divisionId&&g.groupId===groupId&&g.phase==='groups'&&g.status==='jugado');
    const rows=divisionEntries(t,divisionId).filter(e=>e.groupId===groupId).map(e=>({entryId:e.id,name:teamName(t,e.id),played:0,won:0,lost:0,pf:0,pc:0,points:0,tied:false}));
    const by=Object.fromEntries(rows.map(r=>[r.entryId,r]));for(const g of games){const h=by[g.home],a=by[g.away];if(!h||!a)continue;h.played++;a.played++;h.pf+=g.homeScore;h.pc+=g.awayScore;a.pf+=g.awayScore;a.pc+=g.homeScore;const hwin=g.homeScore>g.awayScore;const w=hwin?h:a,l=hwin?a:h;w.won++;l.lost++;w.points+=d.win;l.points+=g.forfeit==='ninguno'?d.loss:d.forfeit;}
    const buckets={};rows.forEach(r=>(buckets[r.points]??=[]).push(r));const result=[];
    for(const pts of Object.keys(buckets).sort((a,b)=>b-a)){const bucket=buckets[pts],ids=new Set(bucket.map(r=>r.entryId));const mini={};bucket.forEach(r=>mini[r.entryId]={pts:0,diff:0});for(const g of games.filter(g=>ids.has(g.home)&&ids.has(g.away))){const win=g.homeScore>g.awayScore;mini[win?g.home:g.away].pts+=d.win;mini[win?g.away:g.home].pts+=g.forfeit==='ninguno'?d.loss:d.forfeit;mini[g.home].diff+=g.homeScore-g.awayScore;mini[g.away].diff+=g.awayScore-g.homeScore;}
      const cmp=(a,b)=>mini[b.entryId].pts-mini[a.entryId].pts||mini[b.entryId].diff-mini[a.entryId].diff||(b.pf-b.pc)-(a.pf-a.pc)||b.pf-a.pf;
      bucket.sort((a,b)=>cmp(a,b)||((d.tieOrder??[]).indexOf(a.entryId)<0?999:(d.tieOrder??[]).indexOf(a.entryId))-((d.tieOrder??[]).indexOf(b.entryId)<0?999:(d.tieOrder??[]).indexOf(b.entryId))||a.name.localeCompare(b.name));
      bucket.forEach(r=>{r.tied=bucket.some(x=>x!==r&&cmp(r,x)===0)&&!(d.tieOrder??[]).includes(r.entryId);result.push(r);});
    }return result;
  }
  function roundRobin(entries){const list=[...entries];if(list.length%2)list.push(null);const rounds=[];for(let r=0;r<list.length-1;r++){const matches=[];for(let i=0;i<list.length/2;i++){const a=list[i],b=list[list.length-1-i];if(a&&b)matches.push(r%2?[b,a]:[a,b]);}rounds.push(matches);list.splice(1,0,list.pop());}return rounds;}
  function groupGames(t,divisionId){const d=t.divisions.find(d=>d.id===divisionId);if(!d?.groups.length)fail('Crea los grupos primero.');if(t.games.some(g=>g.divisionId===divisionId&&g.phase==='groups'))fail('Ya hay un rol de grupos. Edita sus partidos o retíralo antes de regenerar.');const entries=divisionEntries(t,divisionId);if(entries.some(e=>!e.groupId))fail('Asigna un grupo a todos los equipos.');const rounds=d.groups.map(group=>{const es=entries.filter(e=>e.groupId===group.id);if(es.length<3||es.length>6)fail(group.name+': se requieren de 3 a 6 equipos.');return {group,rounds:roundRobin(es.map(e=>e.id))};});const out=[];for(let r=0;r<5;r++)for(const x of rounds)for(const pair of x.rounds[r]??[])out.push({id:id('game'),divisionId,groupId:x.group.id,phase:'groups',round:r+1,home:pair[0],away:pair[1],date:'',time:'',venueId:'',status:'programado',forfeit:'ninguno',homeScore:0,awayScore:0,homeStats:[],awayStats:[],statsComplete:false});return out;}
  function schedule(t,games,config){
    const {start,end,venues}=config;if(!date(start)||!date(end)||end<start)fail('Revisa las fechas del rol.');const from=minutes(config.from),to=minutes(config.to),duration=integer(config.duration,'Duración',1,300),gap=integer(config.gap,'Intervalo',0,120),rest=integer(config.rest,'Descanso',0,720);if(from+duration>to)fail('La ventana horaria no alcanza para un juego.');if(!venues.length)fail('Selecciona al menos una cancha.');
    const planned=clone(games),occupied=t.games.filter(g=>g.status!=='cancelado'&&!g.bye&&g.date&&g.time&&!planned.some(x=>x.id===g.id)).map(g=>({...g,duration:g.duration??duration}));const unscheduled=[];
    for(const g of planned){let found=false;for(let day=start;day<=end&&!found;){for(let m=from;m+duration<=to&&!found;m+=duration+gap){for(const venue of venues){const conflict=occupied.some(o=>{if(o.date!==day)return false;const om=minutes(o.time),oe=om+(o.duration??duration);if(o.venueId===venue&&m<oe+gap&&m+duration+gap>om)return true;return [g.home,g.away].filter(Boolean).some(e=>[o.home,o.away].includes(e))&&m<oe+rest&&m+duration+rest>om;});if(!conflict){Object.assign(g,{date:day,time:time(m),venueId:venue,duration});occupied.push(g);found=true;break;}}}const next=new Date(day+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);day=next.toISOString().slice(0,10);}if(!found)unscheduled.push(g.id);}
    if(unscheduled.length)fail('No caben '+unscheduled.length+' partidos. Amplía las fechas, canchas u horarios; no se guardó un rol incompleto.');return planned;
  }
  function qualifiers(t,did){const d=t.divisions.find(d=>d.id===did);if(!d?.groups.length)fail('Faltan grupos.');const selected=[];for(const group of d.groups){const es=divisionEntries(t,did).filter(e=>e.groupId===group.id),games=t.games.filter(g=>g.divisionId===did&&g.groupId===group.id&&g.phase==='groups');if(es.length<3||games.length!==es.length*(es.length-1)/2||games.some(g=>g.status!=='jugado'))fail('Completa todos los partidos del grupo '+group.name+' antes de confirmar clasificados.');const pairs=new Set(games.map(g=>[g.home,g.away].sort().join('|')));if(pairs.size!==games.length)fail('Hay cruces repetidos en '+group.name);const rows=standings(t,did,group.id);if(rows.some(r=>r.tied))fail('Resuelve los empates exactos del grupo '+group.name+' antes de clasificar.');selected.push(rows.slice(0,d.qualify).map(r=>r.entryId));}const out=[];for(let i=0;i<d.qualify;i++)for(const group of selected)if(group[i])out.push(group[i]);if(out.length<2)fail('Se necesitan al menos dos clasificados para una eliminatoria.');return out;}
  function bracket(t,did,seeds){
    const allowed=qualifiers(t,did);if(seeds.length!==allowed.length||new Set(seeds).size!==seeds.length||seeds.some(s=>!allowed.includes(s)))fail('La llave debe incluir una vez a cada clasificado.');
    if(t.games.some(g=>g.divisionId===did&&g.phase==='knockout'))fail('Ya existe una llave.');
    let size=2;while(size<seeds.length)size*=2;let order=[1,2];while(order.length<size)order=order.flatMap(n=>[n,order.length*2+1-n]);let slots=order.map(n=>seeds[n-1]??null);
    const group=e=>t.entries.find(x=>x.id===e)?.groupId;
    for(let i=0;i<slots.length;i+=2)if(slots[i]&&slots[i+1]&&group(slots[i])===group(slots[i+1])){for(let j=i+3;j<slots.length;j+=2)if(slots[j]&&group(slots[i])!==group(slots[j])&&group(slots[j-1])!==group(slots[i+1])){[slots[i+1],slots[j]]=[slots[j],slots[i+1]];break;}}
    const all=[];let prev=[];for(let i=0;i<size;i+=2){const g={id:id('game'),divisionId:did,phase:'knockout',round:1,home:slots[i],away:slots[i+1],bye:!slots[i]||!slots[i+1],date:'',time:'',venueId:'',status:'programado',forfeit:'ninguno',homeStats:[],awayStats:[]};all.push(g);prev.push(g);}
    let round=2;while(prev.length>1){const next=[];for(let i=0;i<prev.length;i+=2){const g={id:id('game'),divisionId:did,phase:'knockout',round,home:null,away:null,homeSource:prev[i].id,awaySource:prev[i+1].id,date:'',time:'',venueId:'',status:'programado',forfeit:'ninguno',homeStats:[],awayStats:[]};all.push(g);next.push(g);}prev=next;round++;}const copy={...t,games:[...t.games,...all]};resolve(copy);return all;
  }
  function winner(g){if(g.bye)return g.home||g.away||null;if(g.status!=='jugado')return null;return g.homeScore>g.awayScore?g.home:g.away;}
  function resolve(t){for(const g of [...t.games].filter(g=>g.phase==='knockout').sort((a,b)=>a.round-b.round))for(const side of ['home','away'])if(g[side+'Source']){const parent=t.games.find(x=>x.id===g[side+'Source']);const w=parent?winner(parent):null;if(g.status==='jugado'&&g[side]!==w)fail('La corrección cambia un participante de una eliminatoria ya jugada. Reabre los partidos afectados primero.');g[side]=w;}}
  function result(t,gid,values){const next=clone(t),g=next.games.find(g=>g.id===gid);if(!g||g.bye)fail('No hay un partido capturable.');Object.assign(g,values,{status:'jugado'});validateResult(next,g);if(g.phase==='groups'&&next.games.some(x=>x.divisionId===g.divisionId&&x.phase==='knockout')){const d=next.divisions.find(d=>d.id===g.divisionId),qs=qualifiers(next,d.id);if(qs.join('|')!==(d.bracketSeeds??[]).join('|'))fail('Esta corrección cambia los clasificados o sus posiciones. Retira la llave desde Llaves antes de corregir los grupos.');}resolve(next);validate(next);return next;}
  function descendants(t,gid){const found=new Set([gid]);let changed=true;while(changed){changed=false;for(const g of t.games)if(!found.has(g.id)&&(found.has(g.homeSource)||found.has(g.awaySource))){found.add(g.id);changed=true;}}return t.games.filter(g=>found.has(g.id));}
  function reopen(t,gid){const next=clone(t),game=next.games.find(g=>g.id===gid);if(game.phase==='groups'&&next.games.some(g=>g.divisionId===game.divisionId&&g.phase==='knockout'))fail('Retira primero la llave de esta división para reabrir un partido de grupos.');for(const g of descendants(next,gid)){if(g.status==='jugado')next.trash.push({id:id('undo'),kind:'result',value:clone(g),at:new Date().toISOString()});Object.assign(g,{status:'programado',homeScore:0,awayScore:0,homeStats:[],awayStats:[],mvp:'',statsComplete:false});}resolve(next);return next;}
  function stats(t,did,{groupId='',phase=''}={}){const rows={},teams={};const games=t.games.filter(g=>g.divisionId===did&&g.status==='jugado'&&!g.bye&&(!groupId||g.groupId===groupId)&&(!phase||g.phase===phase));for(const g of games)for(const side of ['home','away']){const eid=g[side],entry=t.entries.find(e=>e.id===eid),other=side==='home'?'away':'home';if(!entry)continue;const a=teams[eid]??={entryId:eid,name:teamName(t,eid),played:0,won:0,pf:0,pc:0,threes:0,againstThrees:0,fouls:0};a.played++;a.won+=winner(g)===eid?1:0;a.pf+=g[side+'Score'];a.pc+=g[other+'Score'];a.againstThrees+=(g[other+'Stats']??[]).reduce((n,x)=>n+x.threes,0);
      for(const line of g[side+'Stats']??[]){const p=entry.roster.find(p=>p.id===line.playerId);if(!p)continue;const r=rows[p.id]??={id:p.id,entryId:eid,name:p.name,number:p.number,team:teamName(t,eid),played:0,points:0,threes:0,fouls:0,mvp:0};r.played++;r.points+=line.points;r.threes+=line.threes;r.fouls+=line.fouls;r.mvp+=g.mvp===p.id?1:0;a.threes+=line.threes;a.fouls+=line.fouls;}}
    return {players:Object.values(rows),teams:Object.values(teams),games};}
  const roundName=(t,g)=>{const max=Math.max(...t.games.filter(x=>x.divisionId===g.divisionId&&x.phase==='knockout').map(x=>x.round));return ({0:'Final',1:'Semifinal',2:'Cuartos de final',3:'Octavos de final'})[max-g.round]??'Ronda '+g.round;};
  const api={clone,id,name,integer,date,minutes,time,create,division,validate,validateResult,divisionEntries,teamName,standings,roundRobin,groupGames,schedule,qualifiers,bracket,winner,resolve,result,descendants,reopen,stats,roundName};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Torneo=api;
})(typeof window!=='undefined'?window:this);
