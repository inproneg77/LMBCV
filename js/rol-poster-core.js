(function(root){
'use strict';
const F=typeof module!=='undefined'&&module.exports?require('./fan-core.js'):root.FanCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function layout(value,width,size,maxLines,measure){
 const s=String(value??'').trim(),widthOf=(v,n)=>measure?measure(v,n):Array.from(v).reduce((a,c)=>a+(/[MWÁÉÓ]/.test(c)?.82:/[ilI.,' ]/.test(c)?.28:.56)*n,0);
 function wrap(n){const lines=[];let line='';for(const word of s.split(/\s+/)){if(widthOf(word,n)>width){if(line){lines.push(line);line='';}for(const c of word){if(line&&widthOf(line+c,n)>width){lines.push(line);line='';}line+=c;}}else if(line&&widthOf(line+' '+word,n)>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
 let font=size,lines=wrap(font);while(lines.length>maxLines&&font>10){font--;lines=wrap(font);}return {font,lines};
}
function model({games,teams,categories,seasons,venues,category,season,date}){
 const cat=categories.find(c=>c.id===category),temp=seasons.find(s=>s.id===season);
 if(!cat||!temp||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Selecciona categoría, temporada y una fecha válida.');
 const rows=games.filter(g=>g.temporada===season&&(!g.categoria_id||g.categoria_id===category)&&g.fecha===date&&F.regular(g)&&!g.torneo_id&&g.ambito!=='torneo'&&['programado','jugado'].includes(g.estatus)).slice().sort(F.order);
 if(!rows.length)throw Error('No hay juegos regulares guardados para esta fecha, categoría y rama. Guarda los partidos o elige otra fecha.');
 const ids=new Set(),find=id=>{const team=teams.find(t=>t.id===id);if(!team||!(team.categorias||[]).includes(category))throw Error('Revisa los equipos del rol: falta un registro de esta categoría.');return {id:team.id,name:team.nombre,logo:team.logo||''};};
 return {date,categoryId:category,seasonId:season,category:cat.nombre,branch:cat.rama||'',season:temp.nombre,dateLabel:new Intl.DateTimeFormat('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')),games:rows.map(g=>{
  if(!g.id||ids.has(g.id)||g.local===g.visita)throw Error('Revisa el rol: hay un ID repetido o un equipo contra sí mismo.');ids.add(g.id);
  const venue=venues.find(s=>s.id===g.sede_id)?.nombre||g.sede||g.sede_nombre||'Sede por confirmar';
  return {id:g.id,local:find(g.local),visitor:find(g.visita),time:F.hour(g.hora),venue,played:g.estatus==='jugado'};
 })};
}
function svg(m,assets={},measure){
 const ink='#26332F',gold='#A7834C',muted='#647169',top=314,row=158,height=Math.max(1350,top+m.games.length*row+120),width=1080;
 const image=(src,x,y,w,h)=>/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(src||'')?'<image href="'+src+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>':'';
 const text=(v,x,y,size=24,fill=ink,extra='',w=980,lines=1)=>{const a=layout(v,w,size,lines,measure);return '<text x="'+x+'" y="'+y+'" font-size="'+a.font+'" fill="'+fill+'" '+extra+'>'+a.lines.map((s,i)=>'<tspan x="'+x+'" dy="'+(i?a.font*1.12:0)+'">'+esc(s)+'</tspan>').join('')+'</text>';};
 let out='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="'+height+'" viewBox="0 0 1080 '+height+'"><defs><linearGradient id="foil" x2="1" y2="1"><stop stop-color="#9B794B"/><stop offset=".4" stop-color="#F0DEB3"/><stop offset="1" stop-color="#AD8951"/></linearGradient></defs><g font-family="Arial,sans-serif"><rect width="1080" height="'+height+'" fill="#F8F4EB"/><path d="M25 28V'+(height-28)+'M1055 28V'+(height-28)+'" stroke="url(#foil)" stroke-width="2"/><g opacity=".045">'+image(assets.league,190,Math.max(310,(height-780)/2),950,950)+'</g>';
 out+=image(assets.league,49,41,90,100)+text('LMBC VETERANOS',161,78,30,ink,'font-weight="900" letter-spacing="2"',860)+text(m.season,161,116,21,gold,'letter-spacing="1"',800);
 out+=text('JORNADA',44,195,65,ink,'font-family="Impact,Arial Black,Arial,sans-serif" font-weight="900" letter-spacing="2"',650)+text('ROL REGULAR',1034,182,16,gold,'text-anchor="end" font-weight="700" letter-spacing="2"',300);
 out+=text(m.category+(m.branch&&!m.category.toLowerCase().includes(m.branch.toLowerCase())?' · '+m.branch:''),46,239,29,ink,'font-weight="700"',990);
 out+=text(m.dateLabel,46,282,25,muted,'',850)+text(m.games.length+' PARTIDOS',1034,282,16,gold,'text-anchor="end" font-weight="700"',180);
 m.games.forEach((g,i)=>{const y=top+i*row,initials=t=>t.name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('');
  out+='<rect x="44" y="'+y+'" width="992" height="144" rx="10" fill="#FFFFFF" fill-opacity=".66" stroke="#E4DFD3"/>';
  out+=assets.teams?.[g.local.id]?image(assets.teams[g.local.id],65,y+22,86,80):text(initials(g.local),108,y+74,30,gold,'text-anchor="middle" font-weight="900"',82);
  out+=assets.teams?.[g.visitor.id]?image(assets.teams[g.visitor.id],929,y+22,86,80):text(initials(g.visitor),972,y+74,30,gold,'text-anchor="middle" font-weight="900"',82);
  out+=text(g.local.name,169,y+52,27,ink,'font-weight="900"',295,2)+text(g.visitor.name,911,y+52,27,ink,'text-anchor="end" font-weight="900"',295,2)+text('VS',540,y+65,25,gold,'text-anchor="middle" font-weight="700"',70);
  if(g.played)out+=text('YA JUGADO',540,y+87,10,muted,'text-anchor="middle" letter-spacing="1"',100);
  out+='<path d="M169 '+(y+99)+'H911" stroke="#DFD6C5"/>';
  out+=text(g.time+' · '+g.venue,540,y+128,22,ink,'text-anchor="middle"',910);
 });
 out+='<path d="M44 '+(height-77)+'H1036" stroke="url(#foil)"/>';
 out+=text('LA CANCHA NOS UNE',46,height-39,15,gold,'letter-spacing="3"',500)+text('caborcavets.online',1034,height-39,18,muted,'text-anchor="end"',400);
 return out+'</g></svg>';
}
function filename(m){const safe=v=>String(v).replace(/[^a-zA-Z0-9_-]/g,'-');return ['LMBC','Rol',m.seasonId,m.categoryId,m.date].map(safe).join('-')+'.png';}
const api={model,svg,filename};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LMBCRolPoster=api;
})(typeof window!=='undefined'?window:globalThis);
