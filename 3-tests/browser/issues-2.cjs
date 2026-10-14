// Run against the assembled local app with Playwright installed; all data is synthetic.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const now=new Date().toISOString();const tasks=[{id:'parent',text:'Parent test',roomId:'room-master',order:0,notes:'Private note'},{id:'child',text:'Child test',roomId:'room-master',parentId:'parent',order:0},...Array.from({length:80},(_,i)=>({id:'task'+i,text:'Test task '+i,roomId:'room-master',order:i+1})),{id:'duplicate-side',text:'Legacy side duplicate',roomId:'room-master',order:100}];
 localStorage.setItem('mc-config-v1',JSON.stringify({url:'',key:''}));localStorage.setItem('mc-sync-v2',JSON.stringify({actor:{id:'tester',name:'Tester'}}));localStorage.setItem('mc-state-v1',JSON.stringify({schemaVersion:7,rooms:[{id:'room-master',name:'Master Bedroom',order:0}],tasks,side:[{id:'side',text:'Sidequest test',roomId:'room-master',type:'organisation',order:0},{id:'duplicate-side',text:'Sidequest duplicate',roomId:'room-master',type:'organisation',order:1}],wins:[],householdPeople:[{id:'tester',name:'Tester'}],settings:[]}));
 });
 const preview=process.env.PREVIEW_URL||'http://localhost:8766';assert(['localhost','127.0.0.1'].includes(new URL(preview).hostname),'Synthetic checks must run only on a local preview');await page.goto(preview);await page.waitForTimeout(800);console.log('errors initial',errors);
 console.log('house',await page.locator('#house').innerText());await page.locator('#houseRooms [data-room="room-master"]').click();
 await page.waitForTimeout(100);assert.equal(await page.locator('#roomTasks > .task-card').count(),81);assert.equal(await page.locator('#roomTasks [data-task-id="duplicate-side"]').count(),0);console.log('room cards',await page.locator('#roomTasks .task-card').count());
 console.log('toolbar',await page.locator('#roomDetail .task-list-toolbar').first().innerText());
 await page.locator('#roomSearchToggle').click();await page.locator('#roomSearchInput').fill('Parent');assert.equal(await page.locator('#roomTasks > .task-card:visible').count(),1);await page.locator('#roomSearchInput').fill('');
 await page.locator('#roomTasks [data-task-id="parent"] .task-heading strong').first().click();assert.equal(await page.locator('#roomTasks .task-options:visible').count(),0);assert.equal(await page.locator('#roomTasks [data-task-id="parent"] > .body > .task-footer .move-top').isVisible(),true);console.log('expanded options visible',await page.locator('#roomTasks .task-options:visible').count());console.log('parent buttons',await page.locator('#roomTasks [data-task-id="parent"] button:visible').allTextContents());
 if(process.env.SCREENSHOT_PATH)await page.screenshot({path:process.env.SCREENSHOT_PATH});
 await page.locator('#roomTasks [data-task-id="task1"] .move-top').click();assert.equal(await page.locator('#roomTasks > .task-card').first().getAttribute('data-task-id'),'task1');await page.locator('#roomTasks [data-task-id="task1"] .move-last').click();assert.equal(await page.locator('#roomTasks > .task-card').last().getAttribute('data-task-id'),'task1');
 // Complete parent through the detailed button, then verify recurrence-free child/parent records.
 await page.locator('#roomDetail [data-task-layout]').click();const start=Date.now();await page.locator('#roomTasks [data-task-id="parent"] > .body > .task-footer > .check').click();console.log('parent complete elapsed',Date.now()-start);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mc-state-v1')).tasks.filter(t=>t.done).map(t=>t.id)),['parent','child']);
 await page.locator('#roomTasks [data-task-id="task0"] .task-options summary').click();page.once('dialog',d=>d.accept());await page.locator('#roomTasks [data-task-id="task0"] button').filter({hasText:/^Delete$/}).click();console.log('room undo',await page.locator('#roomDetail > .undo-deleted').isVisible());
 await page.locator('nav button[data-tab="wins"]').click();assert.equal(await page.locator('#wins .undo-deleted').count(),0);console.log('data undo count',await page.locator('#wins .undo-deleted').count());// Enter every lazy-rendered page after the completion/deletion to catch stale lists.
 for(const target of ['now','side','doing','recurring','library','laundryLibrary','calendar']){
  await page.evaluate(async target=>{const {navigate}=await import('./navigation.js?v=startup-navigation-20261012-v1');navigate(target)},target);
  assert.equal(await page.locator('#'+target).isVisible(),true);
 }
 await page.evaluate(async()=>{const {navigate}=await import('./navigation.js?v=startup-navigation-20261012-v1');navigate('house','room-master')});
 await page.locator('#roomTabs button').filter({hasText:/Side quests/}).click();
 assert.equal(await page.locator('#roomTasks > .task-card').count(),2);
 await page.locator('#roomTabs button').filter({hasText:/^Tasks/}).click();
 assert.equal(await page.locator('#roomTasks [data-task-id="side"]').count(),0);
 assert.equal(await page.locator('#chooseSmallTask').count(),0);
 assert.deepEqual(errors,[]);console.log('All mobile behavior checks passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
