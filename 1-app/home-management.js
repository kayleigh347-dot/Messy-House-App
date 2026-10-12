import {navigate} from './navigation.js';
import {commonTools,openToolsNeeded} from './needed-tools.js';
import {doingNowTasks} from './task-flow.js';
let api;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const groups={library:'tasks',recurring:'tasks',taskTiming:'tasks',manualSchedule:'schedule',scheduleMaker:'schedule',rooms:'rooms',manageHome:'tasks'};
export function initHomeManagement(handlers){api=handlers;document.querySelectorAll('#roomSideTabs,#roomRecurringStatusTabs').forEach(n=>n.classList.add('nested-tabs'));
 // Reuse existing controls and handlers, keeping board import and CSV upload distinct actions.
 const backup=document.querySelector('.settings-backups');document.getElementById('imports').insertBefore(backup,document.getElementById('imports').children[1]);backup.querySelector('[data-open="imports"]').remove();document.querySelector('#imports > h2').textContent='Backup & custom tasks';
 const shortcut=el('button','Backup & custom tasks');shortcut.dataset.backupTasks='true';shortcut.type='button';shortcut.onclick=()=>navigate('imports');document.getElementById('generalSettings').prepend(shortcut);
 for(const [page,group] of Object.entries(groups)){const root=document.getElementById(page);if(!root)continue;const shell=el('div');shell.className='manage-home-heading';shell.append(el('h2','Manage home'));const tabs=el('div');tabs.className='folder-tabs';tabs.setAttribute('aria-label','Manage home tabs');for(const [key,label,target] of [['tasks','Tasks','library'],['schedule','Schedule','manualSchedule'],['rooms','My rooms','rooms']]){const b=el('button',label);b.type='button';b.setAttribute('aria-pressed',String(group===key));b.onclick=()=>navigate(target);tabs.append(b)}shell.append(tabs);
  if(group!=='rooms'){const sub=el('div');sub.className='folder-tabs nested-tabs';sub.setAttribute('aria-label',group==='tasks'?'Task management tabs':'Schedule tabs');const options=group==='tasks'?[['library','Reusable'],['recurring','Recurring'],['taskTiming','Tools/times']]:[['manualSchedule','Manual edit'],['scheduleMaker','Schedule maker']];for(const [key,label] of options){const b=el('button',label);b.type='button';b.setAttribute('aria-pressed',String(page===key||page==='laundryLibrary'&&key==='taskTiming'));b.onclick=()=>navigate(key);sub.append(b)}shell.append(sub)}root.prepend(shell);
  root.querySelector('#recurringStatusTabs')?.classList.add('nested-tabs');root.querySelectorAll(':scope > .folder-tabs').forEach(t=>{if(t.querySelector('[data-edit-tab]'))t.hidden=true});
 }
 document.getElementById('closeManualSchedule').hidden=true;
 const timing=document.getElementById('taskTiming');
 document.querySelector('#laundryLibrary > h2').textContent='Laundry setup & editing';document.querySelectorAll('#laundryLibrary [data-edit-tab]').forEach(tab=>tab.closest('.folder-tabs').hidden=true);
 const presets=el('details');presets.className='optional-section';presets.append(el('summary','Common tools'));const tools=el('div');tools.className='tools-picker';for(const tool of commonTools)tools.append(el('span',tool));presets.append(tools);timing.insertBefore(presets,document.getElementById('taskTimingContent'));
 const button=el('button','Tools needed');button.type='button';button.id='doingToolsNeeded';button.onclick=()=>{const s=api.get();openToolsNeeded(s,[...doingNowTasks(s.tasks,s.wins),...doingNowTasks(s.settings,s.wins)].filter(t=>!t.done).map(t=>t.id))};document.getElementById('doing').insertBefore(button,document.getElementById('doing').children[1]);
}
export function updateManagementRoute(page,room){document.body.dataset.management=groups[page]||'';document.getElementById('simpleSettings').hidden=page==='house'&&!room&&!document.body.classList.contains('simple-view');}
