// Only applies to the league agenda; restoring uses the file's current SHA.
(function(){
  const button=document.getElementById('abrir-papelera'),host=document.getElementById('juegos-papelera');if(!button)return;
  button.onclick=async()=>{
    const cat=document.getElementById('sel-categoria').value,season=document.getElementById('sel-temporada').value;
    if(!cat||!season){host.textContent='Selecciona categoría y temporada en la agenda.';return;}
    button.disabled=true;host.textContent='Cargando papelera…';
    try{const file=await ghFetch('data/juegos_'+cat+'/'+season+'.json');const rows=file?.contenido.papelera??[];host.replaceChildren();
      if(!rows.length)host.textContent='No hay juegos eliminados en esta categoría y temporada.';
      for(const item of rows){const row=document.createElement('p'),restore=document.createElement('button');restore.type='button';restore.className='secondary-link';restore.textContent='Recuperar '+item.juego.local+' vs '+item.juego.visita+' · '+item.juego.fecha;
        restore.onclick=async()=>{restore.disabled=true;try{const path='data/juegos_'+cat+'/'+season+'.json',fresh=await ghFetch(path),saved=fresh.contenido.papelera.find(x=>x.juego.id===item.juego.id);if(!saved)throw new Error('El juego ya fue recuperado. Actualiza la papelera.');if(fresh.contenido.juegos.some(x=>x.id===saved.juego.id))throw new Error('Ese identificador ya existe; revisa el juego actual antes de recuperar.');fresh.contenido.juegos.push(saved.juego);fresh.contenido.papelera=fresh.contenido.papelera.filter(x=>x.juego.id!==saved.juego.id);await ghGuardar(path,fresh.sha,fresh.contenido,'Recuperar juego: '+saved.juego.id);row.textContent='Juego recuperado en GitHub. Conserva su programación y resultado.';await cargarJuegosProgramados();}catch(err){row.append(document.createTextNode(' '+err.message));restore.disabled=false;}};
        row.append(restore);host.append(row);
      }
    }catch(err){host.textContent=err.message;}finally{button.disabled=false;}
  };
})();
