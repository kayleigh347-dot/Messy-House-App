// Move Kitchen laundry into its dedicated page without deleting completion history.
const laundryName=text=>/laundry|washing machine|dryer|wash\s+uniform/i.test(text||'');
export function migrateKitchenLaundry(state){
 state.settings||=[];
 const kitchen=state.rooms?.filter(room=>/^kitchen$/i.test(room.name)).map(room=>room.id)||[];
 const roots=(state.tasks||[]).filter(task=>!task.parentId&&(kitchen.includes(task.roomId)||/^kitchen$/i.test(task.area)||task.area==='Laundry')&&laundryName(task.text));
 const ids=new Set(roots.map(task=>task.id));let more=true;
 while(more){more=false;for(const task of state.tasks||[])if(ids.has(task.parentId)&&!ids.has(task.id)){ids.add(task.id);more=true}}
 if(!ids.size)return false;
 if(!state.rooms.some(room=>room.id==='room-laundry'))state.rooms.push({id:'room-laundry',name:'Laundry',order:state.rooms.length,archived:true});
 for(const task of state.tasks.filter(task=>ids.has(task.id))){
  if(!state.settings.some(item=>item.id===task.id))state.settings.push({...task,roomId:'room-laundry',area:'Laundry',doingNow:false,laundryImported:true,...(!task.parentId?{[/wash\s+uniform/i.test(task.text)?'laundryUniform':'laundryTask']:true}:{})});
 }
 state.tasks=state.tasks.filter(task=>!ids.has(task.id));
 if(ids.has(state.current))state.current=null;
 state.notifications=(state.notifications||[]).filter(notice=>!ids.has(notice.taskId));
 for(const task of state.templates||[])if((kitchen.includes(task.roomId)||/^kitchen$/i.test(task.area))&&laundryName(task.text)){task.roomId='room-laundry';task.area='Laundry'}
 return true;
}
