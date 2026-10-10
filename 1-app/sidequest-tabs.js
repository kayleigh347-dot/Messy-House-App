export const sidequestTabs=state=>[{id:'organisation',name:'Organisation'},{id:'hobby',name:'Hobby / craft'},...(state.sideTabs||[])];
export const sidequestMatches=(task,tab)=>!tab||tab==='all'||task.type===tab;
export function fillQuestTabs(select,state,value='organisation'){
 select.replaceChildren();for(const tab of sidequestTabs(state))select.append(new Option(tab.name,tab.id));select.value=sidequestTabs(state).some(tab=>tab.id===value)?value:'organisation';
}
export function renderSidequestTabs(root,state,selected,onChange,onSave,getState=()=>state){
 root.replaceChildren();for(const tab of [{id:'all',name:'All'},...sidequestTabs(state)]){const button=document.createElement('button');button.type='button';button.textContent=tab.name;button.dataset.filter=tab.id;button.setAttribute('aria-pressed',String(selected===tab.id));button.onclick=()=>onChange(tab.id);root.append(button)}
 const add=document.createElement('button');add.type='button';add.textContent='＋ New tab';add.onclick=()=>{
  const dialog=document.createElement('dialog'),heading=document.createElement('h2'),form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),save=document.createElement('button'),cancel=document.createElement('button');
  heading.textContent='New sidequest tab';form.className='editor';label.textContent='Tab name';input.required=true;input.maxLength=40;label.append(input);save.textContent='Add tab';cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();form.append(label,save,cancel);dialog.append(heading,form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});input.oninput=()=>input.setCustomValidity('');
  form.onsubmit=event=>{event.preventDefault();const name=input.value.trim(),current=getState();if(!name||sidequestTabs(current).some(tab=>tab.name.toLocaleLowerCase()===name.toLocaleLowerCase())){input.setCustomValidity('Choose a unique tab name.');input.reportValidity();return}const tab={id:crypto.randomUUID(),name};current.sideTabs||=[];current.sideTabs.push(tab);dialog.close();onChange(tab.id);onSave()};dialog.showModal();input.focus();
 };root.append(add);
}
