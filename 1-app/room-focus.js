import {roomActiveTasks,addToDoingNow} from './task-flow.js';

export function focusRoomTasks(state,roomId,now=Date.now()){
 if(!state.rooms.some(room=>room.id===roomId&&!room.archived)||roomId==='room-laundry')return [];
 return roomActiveTasks(state,roomId,now).slice().sort((a,b)=>(a.order??0)-(b.order??0));
}

export function selectFocusTasks(state,roomId,ids,now=Date.now()){
 const eligible=new Map(focusRoomTasks(state,roomId,now).map(task=>[task.id,task]));
 const tasks=[...new Set(ids)].map(id=>eligible.get(id));
 if(tasks.some(task=>!task))throw Error('A selected task changed. Choose your room tasks again.');
 for(const task of tasks)addToDoingNow(task,state.tasks);
 return tasks.map(task=>task.id);
}
