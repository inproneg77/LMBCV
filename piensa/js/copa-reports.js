(function(root){
 'use strict';
 const C=typeof module!=='undefined'&&module.exports?require('./torneos-core.js'):root.Torneo;
 const titles={summary:'Informe de la edición',calendar:'Calendario de juegos',results:'Resultados y hojas de estadísticas',teams:'Equipos, rosters y estadísticas',standings:'Standing por grupo',leaders:'Líderes individuales',rankings:'Rankings de equipos',bracket:'Llaves de eliminación',game:'Hoja de estadísticas del partido',team:'Informe del equipo',player:'Perfil y estadísticas del jugador',compare:'Comparación de equipos'};
 const value=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/[–—]/g,'-').replace(/★/g,'*');
 const num=v=>Number(v??0),average=(total,count)=>count?(num(total)/count).toFixed(1):'0.0';
 const table=(heading,columns,rows,widths)=>({heading,columns,rows,widths});
 function model(t,{kind='summary',divisionId='',entryId='',playerId='',gameId='',phase='',groupId='',compareIds=[]}={}){
  if(!titles[kind])throw Error('Reporte desconocido.');
  C.validate(t);let ds=t.divisions.filter(d=>!divisionId||d.id===divisionId);
  if(divisionId&&!ds.length)throw Error('Categoría no encontrada.');
  const entry=id=>t.entries.find(e=>e.id===id),team=e=>t.teams.find(x=>x.id===e.teamId),name=id=>C.teamName(t,id),court=id=>t.venues.find(v=>v.id===id)?.name||'Por definir';
  let targetEntry,targetGame;
  if(['team','player'].includes(kind)){targetEntry=entry(entryId);if(!targetEntry||divisionId&&targetEntry.divisionId!==divisionId)throw Error('Equipo fuera de esta categoría.');ds=t.divisions.filter(d=>d.id===targetEntry.divisionId);}
  if(kind==='game'){targetGame=t.games.find(g=>g.id===gameId&&!g.bye);if(!targetGame||divisionId&&targetGame.divisionId!==divisionId)throw Error('Partido fuera de esta categoría.');ds=t.divisions.filter(d=>d.id===targetGame.divisionId);}
  if(kind==='compare'&&(compareIds.length!==2||compareIds[0]===compareIds[1]||!compareIds.every(id=>ds.length===1&&entry(id)?.divisionId===ds[0].id)))throw Error('Elige dos equipos diferentes de la misma categoría.');
  const sections=[],add=(heading,paragraphs=[],tables=[],image='')=>sections.push({heading,paragraphs,tables,image});
  const statsCache=new Map(),stats=d=>{if(!statsCache.has(d.id))statsCache.set(d.id,C.stats(t,d.id,{phase,groupId}));return statsCache.get(d.id);};
  const scopedGames=d=>t.games.filter(g=>g.divisionId===d.id&&!g.bye&&(!phase||g.phase===phase)&&(!groupId||g.groupId===groupId)).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.time||'').localeCompare(b.time||'')||a.id.localeCompare(b.id));
  const stage=(d,g)=>g.phase==='knockout'?C.roundName(t,g):d.groups.find(x=>x.id===g.groupId)?.name||'Sin grupo';
  const opponent=(g,side)=>g[side]?name(g[side]):'Ganador por definir';
  const gameRows=(d,games)=>games.map(g=>[g.date||'Por definir',g.time||'--:--',stage(d,g),opponent(g,'home'),g.status==='jugado'?g.homeScore+' - '+g.awayScore:g.status,opponent(g,'away'),court(g.venueId)]);
  const gamesTable=(d,games,title)=>table(title,['Fecha','Hora','Grupo / fase','Local','Resultado / estado','Visitante','Sede'],gameRows(d,games),[14,8,14,18,14,18,14]);
  function sheet(d,g){
   const notes=[(g.date||'Fecha por definir')+' '+(g.time||'')+' | '+court(g.venueId)+' | '+stage(d,g),g.status==='jugado'?(g.forfeit!=='ninguno'?'FORFEIT: cuenta para posiciones, excluido del rendimiento.':g.statsComplete?'Estadísticas completas.':'Estadísticas pendientes: las participaciones pueden estar incompletas.'):'Partido '+g.status];
   const tables=['home','away'].map(side=>table(name(g[side]),['#','Jugador','Puntos','Triples','Faltas','Destacado'],(g[side+'Stats']??[]).map(line=>{const p=entry(g[side])?.roster.find(p=>p.id===line.playerId);return [p?.number,p?.name??'Jugador',line.points,line.threes,line.fouls,g.mvp===line.playerId?'MVP':''];}),[7,45,12,12,12,12]));
   add(opponent(g,'home')+' '+(g.status==='jugado'?g.homeScore+' - '+g.awayScore:'vs')+' '+opponent(g,'away'),notes,tables);
  }
  function teamReport(d,e){
   const s=stats(d),r=s.teams.find(x=>x.entryId===e.id),games=scopedGames(d).filter(g=>[g.home,g.away].includes(e.id)),played=games.filter(g=>g.status==='jugado'),wins=played.filter(g=>C.winner(g)===e.id).length;
   const players=table('Roster y estadísticas',['#','Jugador','Estado','JJ','Pts','3pt','Faltas','Pts/J','MVP'],e.roster.map(p=>{const x=s.players.find(x=>x.id===p.id&&x.entryId===e.id);return [p.number,p.name,p.active===false?'Baja':'Activo',x?.played??0,x?.points??0,x?.threes??0,x?.fouls??0,average(x?.points,x?.played),x?.mvp??0];}),[6,29,11,7,9,8,10,10,10]);
   add(team(e).name,[d.name+' | '+d.branch+' | '+(d.groups.find(g=>g.id===e.groupId)?.name||'Sin grupo'),played.length+' juegos terminados | '+wins+' ganados | '+(played.length-wins)+' perdidos (incluye forfeits).',(r?.played??0)+' juegos en cancha | '+average(r?.pf,r?.played)+' PF/J | '+average(r?.pc,r?.played)+' PC/J. Rendimiento sin forfeits.'],[players,gamesTable(d,games,'Historial y calendario del equipo')],team(e).logo);
  }
  for(const d of ds){
   const games=scopedGames(d),s=stats(d),es=C.divisionEntries(t,d.id).filter(e=>!groupId||e.groupId===groupId),label=d.name+' | '+d.branch;
   add(label,[es.length+' equipos | '+es.reduce((n,e)=>n+e.roster.length,0)+' jugadores | '+games.filter(g=>g.status==='jugado').length+' partidos terminados']);
   const parts=kind==='summary'?['calendar','standings','leaders','rankings']: [kind];
   for(const part of parts){
    if(part==='calendar')add('Calendario',[],[gamesTable(d,games,'Partidos')]);
    if(part==='results'){const played=games.filter(g=>g.status==='jugado');add('Resultados',[],[gamesTable(d,played,'Marcadores finales')]);played.forEach(g=>sheet(d,g));}
    if(part==='game')sheet(d,targetGame);
    if(part==='teams')es.forEach(e=>teamReport(d,e));
    if(part==='team')teamReport(d,targetEntry);
    if(part==='standings')for(const group of d.groups.filter(g=>!groupId||g.id===groupId)){const rows=C.standings(t,d.id,group.id);add('Standing - '+group.name,[d.win+' puntos por victoria; '+d.loss+' por derrota; '+d.forfeit+' por forfeit. Incluye forfeits.'],[table('Posiciones',['#','Equipo','JJ','JG','JP','PF','PC','Dif','Pts'],rows.map((r,i)=>[(i+1)+(r.tied?' *':''),r.name,r.played,r.won,r.lost,r.pf,r.pc,r.pf-r.pc,r.points]),[6,31,9,9,9,9,9,9,9])]);if(rows.some(x=>x.tied))sections.at(-1).paragraphs.push('* Empate exacto: orden provisional.');}
    if(part==='leaders'){const columns=['Jugador','Equipo','JJ','Pts','3pt','Faltas','Pts/J','3pt/J','MVP'],rows=ps=>ps.map(p=>[p.name,p.team,p.played,p.points,p.threes,p.fouls,average(p.points,p.played),average(p.threes,p.played),p.mvp]);add('Estadísticas individuales',['Solo participaciones registradas. Sin forfeits.'],[table('Todos los jugadores',columns,rows([...s.players].sort((a,b)=>b.points-a.points)),[24,20,7,8,8,9,9,9,6])]);for(const [title,key] of [['Líderes en puntos','points'],['Líderes en triples','threes'],['Más veces MVP','mvp']])add(title,[],[table(title,['#','Jugador','Equipo',title==='Más veces MVP'?'MVP':title==='Líderes en triples'?'Triples':'Puntos'],[...s.players].sort((a,b)=>b[key]-a[key]||a.name.localeCompare(b.name)).slice(0,10).map((p,i)=>[i+1,p.name,p.team,p[key]]),[8,42,36,14])]);}
    if(part==='rankings'){for(const [title,key,asc] of [['Rendimiento ofensivo','pf',false],['Rendimiento defensivo','pc',true],['Triples anotados','threes',false],['Defensa de triples','againstThrees',true],['Fair play - faltas','fouls',true]])add(title,['Promedios por juego en cancha. Los forfeits no suman totales ni partidos.'],[table(title,['#','Equipo','JJ en cancha','Total','Promedio'],[...s.teams].filter(x=>x.played>0).sort((a,b)=>(asc?1:-1)*(a[key]/a.played-b[key]/b.played)||a.name.localeCompare(b.name)).map((x,i)=>[i+1,x.name,x.played,x[key],average(x[key],x.played)]),[8,42,18,16,16])]);}
    if(part==='bracket'){const ko=t.games.filter(g=>g.divisionId===d.id&&g.phase==='knockout').sort((a,b)=>a.round-b.round);for(const round of [...new Set(ko.map(g=>g.round))]){const gs=ko.filter(g=>g.round===round);add(C.roundName(t,gs[0]),['Eliminación sencilla: un solo partido.'],[table('Cruces',['Local','Visitante','Estado / marcador','Ganador'],gs.map(g=>[opponent(g,'home'),opponent(g,'away'),g.bye?'Pase libre':g.status==='jugado'?g.homeScore+' - '+g.awayScore:g.status,C.winner(g)?name(C.winner(g)):'Por definir']),[28,28,22,22])]);}if(!ko.length)add('Llaves',['Todavía no se ha generado una llave.']);}
    if(part==='player'){const p=targetEntry.roster.find(p=>p.id===playerId);if(!p)throw Error('Jugador ajeno al roster.');const x=s.players.find(x=>x.id===playerId&&x.entryId===targetEntry.id),rows=games.filter(g=>g.status==='jugado'&&g.forfeit==='ninguno').flatMap(g=>['home','away'].filter(side=>g[side]===targetEntry.id).flatMap(side=>(g[side+'Stats']??[]).filter(l=>l.playerId===p.id).map(l=>[g.date,g.time,name(g[side==='home'?'away':'home']),g.homeScore+' - '+g.awayScore,l.points,l.threes,l.fouls,g.mvp===p.id?'MVP':''])));add(p.name,[team(targetEntry).name+' | #'+(p.number||'-')+' | '+(p.active===false?'Baja':'Activo'),(x?.played??0)+' JJ | '+(x?.points??0)+' puntos | '+(x?.threes??0)+' triples | '+average(x?.points,x?.played)+' puntos por juego | '+(x?.mvp??0)+' MVP'],[table('Participaciones',['Fecha','Hora','Rival','Marcador','Pts','3pt','Faltas','MVP'],rows,[15,10,25,15,9,8,10,8])],p.photo);}
    if(part==='compare'){const a=s.teams.find(x=>x.entryId===compareIds[0]),b=s.teams.find(x=>x.entryId===compareIds[1]);add('Comparación de rendimiento',['Sin forfeits.'],[table('Equipos',['Métrica',name(compareIds[0]),name(compareIds[1])],[['Juegos en cancha',a?.played??0,b?.played??0],['Puntos por juego',average(a?.pf,a?.played),average(b?.pf,b?.played)],['Puntos recibidos por juego',average(a?.pc,a?.played),average(b?.pc,b?.played)],['Triples por juego',average(a?.threes,a?.played),average(b?.threes,b?.played)],['Faltas por juego',average(a?.fouls,a?.played),average(b?.fouls,b?.played)]],[44,28,28])]);}
   }
  }
  return {title:titles[kind],edition:t.name,logo:t.logo,simulation:!!t.isSimulation,scope:ds.length===1?ds[0].name+' | '+ds[0].branch:'Todas las categorías y ramas',filters:[phase==='groups'?'Fase de grupos':phase==='knockout'?'Eliminatorias':'',groupId?'Grupo: '+(ds[0]?.groups.find(g=>g.id===groupId)?.name||groupId):''].filter(Boolean).join(' | '),sections,filename:['copa',t.name,titles[kind],ds.length===1?ds[0].name+'-'+ds[0].branch:'todas',targetEntry?team(targetEntry).name:'',kind==='player'?targetEntry.roster.find(p=>p.id===playerId)?.name:'',kind==='game'?gameId:''].filter(Boolean).join('-').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').slice(0,180).toLowerCase()};
 }
 let loading;
 async function library(){if(root.jspdf?.jsPDF)return root.jspdf.jsPDF;if(!loading)loading=new Promise((ok,no)=>{const script=document.createElement('script');script.src=new URL('js/vendor/jspdf.umd.min.js',root.CopaConfig.assetBase).href;script.onload=()=>root.jspdf?.jsPDF?ok(root.jspdf.jsPDF):no(Error('No se pudo cargar el generador PDF.'));script.onerror=()=>{loading=null;script.remove();no(Error('No se pudo cargar el generador PDF. Revisa la conexión y reintenta.'));};document.head.append(script);});return loading;}
 async function picture(path,resolve){if(!path)return null;try{return await new Promise(ok=>{const image=new Image();image.crossOrigin='anonymous';const timer=setTimeout(()=>{image.onload=image.onerror=null;ok(null);},4000);image.onerror=()=>{clearTimeout(timer);ok(null);};image.onload=()=>{clearTimeout(timer);try{const cv=document.createElement('canvas'),scale=Math.min(1,300/Math.max(image.naturalWidth,image.naturalHeight));cv.width=Math.max(1,Math.round(image.naturalWidth*scale));cv.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(image,0,0,cv.width,cv.height);ok({data:cv.toDataURL('image/jpeg',.86),ratio:cv.width/cv.height});}catch{ok(null);}};image.src=resolve(path);});}catch{return null;}}
 function createPDF(report,JsPDF,images={}){
  const doc=new JsPDF({unit:'pt',format:'a4',compress:true,putOnlyUsedFonts:true}),W=595.28,H=841.89,margin=36,width=W-margin*2,bottom=H-42;let y=0;
  const text=(s,x,yy,size=10,bold=false,color='#321923')=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(color);doc.text(value(s),x,yy);};
  const lines=(s,w,size)=>{doc.setFont('helvetica','normal');doc.setFontSize(size);return doc.splitTextToSize(value(s),w);};
  function image(path,x,yy,maxW,maxH){const im=images[path];if(!im)return false;const w=Math.min(maxW,maxH*im.ratio),h=w/im.ratio;doc.addImage(im.data,'JPEG',x,yy,w,h);return true;}
  function newPage(first=false){if(!first)doc.addPage();doc.setFillColor('#751b3c');doc.rect(0,0,W,99,'F');doc.setFillColor('#f8e9a7');doc.rect(0,99,W,4,'F');const logo=!!images[report.logo],avail=width-(logo?65:0);text('CABORCA PIENSA EN GRANDE',margin,26,10,true,'#f8e9a7');const titleLines=lines(report.edition,avail,13).slice(0,2);titleLines.forEach((l,i)=>text(l,margin,46+i*15,13,true,'#fff'));text(report.title,margin,86,11,false,'#fff');if(logo)image(report.logo,W-margin-50,25,50,50);y=122;
   const scopeLines=lines(report.scope+(report.filters?' | '+report.filters:''),width,9);scopeLines.forEach(l=>{text(l,margin,y,9);y+=12;});if(report.simulation){text('SIMULACIÓN - Datos ficticios para demostración',margin,y+2,9,true,'#751b3c');y+=16;}y+=8;
  }
  const ensure=h=>{if(y+h>bottom)newPage();};
  function paragraph(s){const ls=lines(s,width,9);for(const l of ls){ensure(13);text(l,margin,y,9);y+=13;}y+=5;}
  function heading(s){const ls=lines(s,width,13);ensure(ls.length*17+45);for(const l of ls){text(l,margin,y,13,true,'#751b3c');y+=17;}y+=6;}
  function renderTable(t){
   
   const units=t.widths||t.columns.map(()=>1),sum=units.reduce((a,b)=>a+b,0),widths=units.map(n=>width*n/sum),font=8.5,lineH=11;
   const headerCells=t.columns.map((c,i)=>lines(c,widths[i]-10,font)),headerH=Math.max(...headerCells.map(x=>x.length))*lineH+12;
   const firstRow=t.rows[0]||['Sin registros'];const firstHeight=Math.max(...t.columns.map((_,i)=>lines(firstRow[i]??'',widths[i]-10,font).length))*lineH+12;ensure((t.heading?17:0)+headerH+Math.min(firstHeight,100));if(t.heading){text(t.heading,margin,y,10,true);y+=17;}   function header(){ensure(headerH+25);doc.setFillColor('#f8e9a7');doc.rect(margin,y,width,headerH,'F');let x=margin;headerCells.forEach((ls,i)=>{ls.forEach((l,j)=>text(l,x+5,y+11+j*lineH,font,true,'#751b3c'));x+=widths[i];});y+=headerH;}
   header();
   const rows=t.rows.length?t.rows:[t.columns.map((_,i)=>i===0?'Sin registros':'')];
   for(const [ri,row] of rows.entries()){
    const cells=t.columns.map((_,i)=>lines(row[i]??'',widths[i]-10,font)),count=Math.max(...cells.map(x=>x.length));let offset=0;
    while(offset<count){if(y+lineH+12>bottom){newPage();header();}let take=Math.max(1,Math.floor((bottom-y-12)/lineH));if(offset===0&&count>take&&count*lineH+12<bottom-170-headerH){newPage();header();take=Math.max(1,Math.floor((bottom-y-12)/lineH));}take=Math.min(take,count-offset);const h=take*lineH+12;doc.setFillColor(ri%2?'#fffdf8':'#f9f3f5');doc.rect(margin,y,width,h,'F');let x=margin;cells.forEach((ls,i)=>{ls.slice(offset,offset+take).forEach((l,j)=>text(l,x+5,y+11+j*lineH,font));x+=widths[i];});y+=h;offset+=take;if(offset<count){newPage();header();}}
   }y+=18;
  }
  newPage(true);for(const section of report.sections){heading(section.heading);if(section.image&&images[section.image]){ensure(80);image(section.image,margin,y,68,68);y+=78;}section.paragraphs.forEach(paragraph);section.tables.forEach(renderTable);y+=8;}
  const total=doc.getNumberOfPages();for(let page=1;page<=total;page++){doc.setPage(page);doc.setDrawColor('#eadde2');doc.line(margin,H-31,W-margin,H-31);text('caborcavets.online/piensa',margin,H-17,8);text(page+' / '+total,W-margin-40,H-17,8);}
  doc.setProperties({title:report.edition+' - '+report.title,subject:report.scope,author:'Caborca Piensa en Grande',creator:'Sistema de la copa'});return doc;
 }
 function csv(report){const quote=s=>'"'+value(s).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const rows=[[report.edition],[report.title],[report.scope],...(report.simulation?[['SIMULACIÓN - Datos ficticios']]:[])];for(const s of report.sections){rows.push([], [s.heading],...s.paragraphs.map(p=>[p]));for(const t of s.tables)rows.push([t.heading],t.columns,...t.rows);}return '\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n');}
 function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 async function download(t,options,resolve,format='pdf'){
  const report=model(t,options);if(format==='csv'){downloadBlob(new Blob([csv(report)],{type:'text/csv;charset=utf-8'}),report.filename+'.csv');return;}
  const JsPDF=await library(),paths=[...new Set([report.logo,...report.sections.map(s=>s.image)].filter(Boolean))],images={};for(let i=0;i<paths.length;i+=4){const batch=await Promise.all(paths.slice(i,i+4).map(async p=>[p,await picture(p,resolve)]));batch.forEach(([p,img])=>{if(img)images[p]=img;});}
  const doc=createPDF(report,JsPDF,images);downloadBlob(doc.output('blob'),report.filename+'.pdf');
 }
 const api={titles,model,createPDF,csv,download};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CopaReports=api;
})(typeof window!=='undefined'?window:this);
