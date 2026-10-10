// Add each room's starter library once, so edited or deleted suggestions stay that way.
const chores={
 bathroom:['Clean the sink','Clean the toilet','Clean the bath or shower','Wipe the mirror','Mop the floor','Replace towels'],
 kitchen:['Clean the sink','Wash the dishes','Wipe the worktops','Clean the hob','Empty the bin','Mop the floor'],
 bedroom:['Change the bedding','Put clothes away','Dust surfaces','Vacuum the floor','Clear the bedside table'],
 living:['Dust surfaces','Vacuum the floor','Clear the coffee table','Tidy the sofa'],
 cats:['Scoop the litter tray','Replace cat litter','Wash food bowls','Refill water bowls'],
 other:['Dust surfaces','Vacuum the floor','Put things away','Wipe door handles']
};
export function seedCommonTasks(state){
 state.settings||=[];state.templates||=[];
 for(const room of state.rooms||[]){if(room.archived)continue;const id='starter-tasks:'+room.id;if(state.settings.some(x=>x.id===id))continue;
 const name=room.name.toLowerCase(),category=/bathroom/.test(name)?'bathroom':/kitchen/.test(name)?'kitchen':/bedroom/.test(name)?'bedroom':/living/.test(name)?'living':/cat/.test(name)?'cats':'other';
 for(const [i,text] of chores[category].entries())if(!state.templates.some(t=>t.roomId===room.id&&!t.parentTemplateId&&t.text.trim().toLowerCase()===text.toLowerCase()))state.templates.push({id:`common:${room.id}:${category}:${i}`,builtinKey:`${category}:${i}`,sourceId:`common:${category}:${i}`,text,roomId:room.id,area:room.name,priority:'mid',messImpact:'normal',order:state.templates.length});
 state.settings.push({id});
 }
}
