let onRoute;
export function navigate(page,room=null,{replace=false}={}){
 const route={mc:true,page,room};
 if(!replace&&history.state?.mc&&history.state.page===page&&history.state.room===room)return;
 history[replace?'replaceState':'pushState'](route,'');onRoute?.(route);
}
export function initNavigation(render,initial='house'){
 onRoute=render;
 window.addEventListener('popstate',e=>{
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  document.querySelector('#setup')?.classList.add('hide');
  const route=e.state?.mc?e.state:{mc:true,page:'house',room:null};
  onRoute(route);
 });
 if(history.state?.mc)onRoute(history.state);
 else{navigate('house',null,{replace:true});if(initial!=='house')navigate(initial)}
}
