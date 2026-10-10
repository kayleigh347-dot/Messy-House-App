// Hold to pick up; any part of another task card is a nesting target.
export function enableTaskDrag(card,save){
 let timer,frame,active=false,x,y,startX,startY,target=null,ready=false,detach=false,before=null,container,root,groupBlocked=false;
 const point=e=>e.touches?.[0]||e;
 const canReorder=node=>!node.classList.contains('completed-task')&&(!card.dataset.orderGroup||!node.dataset.orderGroup||node.dataset.orderGroup===card.dataset.orderGroup);
 function clearTarget(){target?.classList.remove('nest-hover','nest-ready','drop-before','drop-after');target=null;ready=false}
 function locate(){
  const sub=card.closest('.subtask-list');detach=!!sub&&(x<sub.getBoundingClientRect().left-8||y<sub.getBoundingClientRect().top-25||y>sub.getBoundingClientRect().bottom+25);
  container=detach?root:card.parentElement;card.dataset.dragHint=detach?'Release to make standalone':'Move to an edge to reorder';
  const hit=document.elementsFromPoint(x,y).map(n=>n.closest('.task[data-task-id]')).find(n=>n&&n!==card&&!card.contains(n)&&root.contains(n));
  groupBlocked=!!hit&&!!card.dataset.orderGroup&&!!hit.dataset.orderGroup&&card.dataset.orderGroup!==hit.dataset.orderGroup;
  if(hit&&hit.contains(card)){
   clearTarget();detach=false;container=card.parentElement;
   const peers=[...container.children].filter(n=>n.matches('.task[data-task-id]')&&n!==card);
   before=peers[0]||null;target=before;target?.classList.add('drop-before');card.dataset.dragHint='Release to move to top of subtasks';return;
  }
  if(hit&&!hit.classList.contains('completed-task')){
   const bounds=hit.getBoundingClientRect(),edge=Math.min(32,Math.max(15,bounds.height*.24));
   if(y>=bounds.top+edge&&y<=bounds.bottom-edge){clearTarget();target=hit;ready=true;groupBlocked=false;target.classList.add('nest-ready');card.dataset.dragHint='Release to add as a subtask';before=null;return}
   if(hit.parentElement===container&&canReorder(hit)){clearTarget();const peers=[...container.children].filter(n=>n.matches('.task[data-task-id]')&&n!==card&&canReorder(n));before=y<bounds.top+edge?hit:peers[peers.indexOf(hit)+1]||null;target=before||peers.at(-1);target?.classList.add(before?'drop-before':'drop-after');card.dataset.dragHint=before?'Release between tasks':'Release at end of list';return}
  }
  clearTarget();const peers=[...container.children].filter(n=>n.matches('.task[data-task-id]')&&n!==card&&canReorder(n));before=peers.find(n=>y<n.getBoundingClientRect().top+n.offsetHeight/2)||null;
  const marker=before||peers.at(-1);if(marker){target=marker;target.classList.add(before?'drop-before':'drop-after')}
  card.dataset.dragHint=groupBlocked?`Stays in ${card.dataset.orderGroupLabel}; reorder within this group`:before?'Release between tasks':'Release at end of list';
 }
 function tick(){if(!active)return;const top=75,bottom=innerHeight-95,speed=y<top?-Math.min(18,(top-y)/3):y>bottom?Math.min(18,(y-bottom)/3):0;if(speed){clearTarget();window.scrollBy(0,speed)}locate();frame=requestAnimationFrame(tick)}
 function down(e){if(e.type==='pointerdown'&&e.pointerType==='touch')return;if(e.button>0||e.target.closest('.task')!==card||e.target.closest('button,input,select,textarea,summary,a'))return;
  const p=point(e);x=startX=p.clientX;y=startY=p.clientY;root=card.parentElement;while(root.closest('.task'))root=root.closest('.task').parentElement;
  timer=setTimeout(()=>{active=true;card.classList.add('dragging');document.body.classList.add('task-drag-active');navigator.vibrate?.(25);tick()},400);
  const touch=e.type==='touchstart',moveName=touch?'touchmove':'pointermove',endName=touch?'touchend':'pointerup',cancelName=touch?'touchcancel':'pointercancel';
  function move(e){const p=point(e);x=p.clientX;y=p.clientY;if(!active){if(Math.hypot(x-startX,y-startY)>10)clearTimeout(timer);return}if(e.cancelable)e.preventDefault();locate()}
  function end(e){clearTimeout(timer);cancelAnimationFrame(frame);document.removeEventListener(moveName,move);document.removeEventListener(endName,end);document.removeEventListener(cancelName,end);document.removeEventListener('visibilitychange',abortOnHide);if(active){active=false;card.dataset.suppressClick='true';setTimeout(()=>delete card.dataset.suppressClick,500);card.classList.remove('dragging');document.body.classList.remove('task-drag-active');delete card.dataset.dragHint;const parentId=ready?target?.dataset.taskId:null;clearTarget();if(!e.type.includes('cancel')){if(!parentId){if(before)container.insertBefore(card,before);else container.append(card)}save({parentId,detach,groupBlocked,ids:[...container.children].filter(n=>n.matches('.task[data-task-id]')).map(n=>n.dataset.taskId)})}}}
  const abortOnHide=()=>{if(document.hidden)end({type:'visibilitycancel'})};document.addEventListener(moveName,move,{passive:false});document.addEventListener(endName,end);document.addEventListener(cancelName,end);document.addEventListener('visibilitychange',abortOnHide);
 }
 card.addEventListener('pointerdown',down);card.addEventListener('touchstart',down,{passive:true});card.addEventListener('contextmenu',e=>e.preventDefault());
}
