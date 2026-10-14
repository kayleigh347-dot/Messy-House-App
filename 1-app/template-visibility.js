// Personal visibility never mutates the household's saved definitions or tasks.
export function templateFamilyIds(templates,template,allRooms=false){
 const ids=new Set(templates.filter(item=>allRooms&&template.groupId?item.groupId===template.groupId:item.id===template.id).map(item=>item.id));
 let changed=true;while(changed){changed=false;for(const item of templates)if(ids.has(item.parentTemplateId)&&!ids.has(item.id)){ids.add(item.id);changed=true;}}
 return [...ids];
}
export function visibleTemplates(templates,hiddenIds=[]){
 const hidden=new Set(hiddenIds);return templates.filter(item=>!hidden.has(item.id));
}
export function changeTemplateVisibility(house,ids,hidden){
 const selected=new Set(ids),existing=house.hiddenTemplateIds||[];return {...house,hiddenTemplateIds:hidden?[...new Set([...existing,...ids])]:existing.filter(id=>!selected.has(id))};
}
