const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
(async()=>{
 const url=process.env.PREVIEW_URL||'http://127.0.0.1:8782';assert(['127.0.0.1','localhost'].includes(new URL(url).hostname));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('mc-config-v1',JSON.stringify({url:'',key:''}));localStorage.setItem('mc-state-v1',JSON.stringify({schemaVersion:7,rooms:[{id:'room-kitchen',name:'Kitchen',guardian:'Gremlin',order:0}],tasks:[],side:[],wins:[],householdPeople:[],settings:[]}))});
 await page.goto(url);await page.locator('nav [data-tab=calendar]').click();assert.equal(await page.locator('#calendar .adaptive-mode-setting').count(),0);
 const before=await page.evaluate(()=>localStorage.getItem('mc-state-v1'));
 await page.locator('#moreNav').click();await page.locator('#moreMenu [data-open=library]').click();
 await page.locator('.page:not(.hide) .manage-home-heading').getByRole('button',{name:'Schedule',exact:true}).click();
 assert.equal(await page.locator('#manualSchedule input[id=adaptiveMode-manualSchedule]').isChecked(),false);assert.equal(await page.locator('#manualSchedule input[id=adaptiveMode-manualSchedule]').isDisabled(),true);
 assert.equal(await page.locator('#manualSchedule .adaptive-mode-setting p').first().innerText(),'Get cleaning recommendations without following a fixed schedule. Your calendar still updates automatically as you complete tasks.');
 for(const width of [320,360,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
 await page.locator('#manualSchedule .nested-tabs').getByRole('button',{name:'Schedule maker',exact:true}).click();assert.equal(await page.locator('#scheduleMaker .adaptive-mode-setting').count(),1);assert.equal(await page.locator('#startScheduleMaker').isVisible(),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('mc-state-v1')),before);
 await page.screenshot({path:'/private/tmp/adaptive-stage02-schedule.png',fullPage:true});
 const rows=new Map(['alice','bob'].map(userId=>[userId,{userId,mode:'routine',recommendationPreferences:{},introAcknowledgedAt:null,revision:0,extra:'preserved'}])),leases=new Map();let ackFailure=false,heldPage=null,releaseRead=null,heldReadStarted=null;
 async function rpc(source,user,name,args){
  if(user!==args.expected_user_id)return {error:{code:'DENIED'}};
  const row=rows.get(user);
  if(name==='adaptive_preferences_read'){const data=structuredClone(row);if(source.page===heldPage){heldPage=null;heldReadStarted();await new Promise(resolve=>releaseRead=resolve)}return {data}};
  if(name==='adaptive_preferences_patch'){if(args.expected_revision!==row.revision)return {error:{code:'40001'}};Object.assign(row,args.patch);row.revision++;return {data:structuredClone(row)}}
  if(name==='adaptive_intro_claim'){if(row.introAcknowledgedAt||leases.has(user))return {data:null};const lease={userId:user,token:'lease-'+user,expiresAt:new Date(Date.now()+60000).toISOString()};leases.set(user,lease);return {data:structuredClone(lease)}}
  if(name==='adaptive_intro_renew')return {data:{...leases.get(user),introAcknowledgedAt:row.introAcknowledgedAt}};
  if(name==='adaptive_intro_ack'){if(ackFailure)return {error:{code:'OFFLINE'}};row.introAcknowledgedAt||=new Date().toISOString();row.revision++;leases.delete(user);return {data:structuredClone(row)}}
  return {error:{code:'PGRST202'}};
 }
 const a=await browser.newContext({viewport:{width:390,height:844}}),b=await browser.newContext({viewport:{width:390,height:844}}),c=await browser.newContext({viewport:{width:390,height:844}});
 for(const context of [a,b,c])await context.exposeBinding('adaptiveRpc',rpc);
 const first=await a.newPage(),second=await b.newPage(),other=await c.newPage();
 for(const p of [first,second,other])p.on('pageerror',e=>errors.push(e.message));
 const fixture=url+'/tests/fixtures/adaptive-mode.html';await first.goto(fixture+'?user=alice');await second.goto(fixture+'?user=alice');await other.goto(fixture+'?user=bob');
 await first.getByRole('checkbox',{name:'Go With the Flow',exact:true}).check();await first.locator('#adaptiveIntroduction').waitFor({state:'visible'});assert.equal(rows.get('alice').introAcknowledgedAt,null);
 const intro=first.getByRole('dialog',{name:'Welcome to Go With the Flow',exact:true});
 assert.equal(await intro.isVisible(),true);
 for(const text of ['No rigid schedules. No falling behind.','Mission Control remembers what needs doing and recommends what deserves your attention.','Choose a room whenever you feel ready, or pick your own tasks.','Your calendar will keep adapting as you complete things, even if you never follow its recommendations.']){
  assert.equal(await intro.getByText(text,{exact:true}).count(),1);assert.equal(await first.locator('[data-adaptive-help]').getByText(text,{exact:true}).count(),1);
 }
 assert.equal(await first.evaluate(()=>document.activeElement?.textContent),"Let's Go With the Flow!");
 for(const width of [320,360,390,430]){await first.setViewportSize({width,height:844});assert.equal(await intro.evaluate(node=>node.scrollWidth<=node.clientWidth),true)}
 await first.keyboard.press('Tab');assert.equal(await first.evaluate(()=>document.activeElement?.textContent),'Close');await first.keyboard.press('Shift+Tab');assert.equal(await first.evaluate(()=>document.activeElement?.textContent),"Let's Go With the Flow!");
 await second.evaluate(()=>window.adaptiveFixture.refresh());assert.equal(await second.getByRole('checkbox',{name:'Go With the Flow',exact:true}).isChecked(),true);assert.equal(await second.locator('#adaptiveIntroduction').count(),0);assert.equal(await other.getByRole('checkbox',{name:'Go With the Flow',exact:true}).isChecked(),false);
 ackFailure=true;await first.getByRole('button',{name:"Let's Go With the Flow!",exact:true}).click();await first.waitForFunction(()=>document.querySelector('.adaptive-mode-setting [role=status]').textContent.includes('waiting to sync'));assert.equal(rows.get('alice').introAcknowledgedAt,null);
 ackFailure=false;heldPage=second;const started=new Promise(resolve=>heldReadStarted=resolve);const delayedRefresh=second.evaluate(()=>window.adaptiveFixture.refresh());await started;await first.evaluate(()=>window.adaptiveFixture.refresh());assert.ok(rows.get('alice').introAcknowledgedAt);releaseRead();await delayedRefresh;await second.evaluate(()=>window.adaptiveFixture.refresh());assert.equal(await second.locator('#adaptiveIntroduction').count(),0);
 await first.getByRole('checkbox',{name:'Go With the Flow',exact:true}).uncheck();await first.waitForFunction(()=>!document.querySelector('input[type=checkbox]').disabled);await first.getByRole('checkbox',{name:'Go With the Flow',exact:true}).check();await first.waitForFunction(()=>!document.querySelector('input[type=checkbox]').disabled);assert.equal(await first.locator('#adaptiveIntroduction').count(),0);
 assert.equal(rows.get('bob').mode,'routine');assert.equal(rows.get('alice').extra,'preserved');assert.equal(await first.locator('[data-adaptive-help]').count(),1);
 await other.getByRole('checkbox',{name:'Go With the Flow',exact:true}).check();await other.locator('#adaptiveIntroduction').waitFor({state:'visible'});assert.equal(rows.get('bob').introAcknowledgedAt,null);
 const startStale=new Promise(resolve=>heldReadStarted=resolve);heldPage=other;const stale=other.evaluate(()=>window.adaptiveFixture.refresh());await startStale;await other.getByRole('button',{name:'Close',exact:true}).click();await other.waitForFunction(()=>!document.querySelector('.adaptive-mode-setting [role=status]').textContent.includes('waiting'));await first.waitForTimeout(100);assert.ok(rows.get('bob').introAcknowledgedAt);releaseRead();await stale;
 await other.getByRole('checkbox',{name:'Go With the Flow',exact:true}).uncheck();await other.waitForFunction(()=>!document.querySelector('input[type=checkbox]').disabled);assert.equal(rows.get('bob').mode,'routine');
 const escapeContext=await browser.newContext({viewport:{width:390,height:844}});await escapeContext.exposeBinding('adaptiveRpc',rpc);rows.set('keyboard',{userId:'keyboard',mode:'routine',recommendationPreferences:{},introAcknowledgedAt:null,revision:0});const escapePage=await escapeContext.newPage();await escapePage.goto(fixture+'?user=keyboard');await escapePage.getByRole('checkbox',{name:'Go With the Flow',exact:true}).check();await escapePage.locator('#adaptiveIntroduction').waitFor({state:'visible'});await escapePage.keyboard.press('Escape');await escapePage.waitForFunction(()=>!document.querySelector('#adaptiveIntroduction'));await escapePage.waitForTimeout(100);assert.ok(rows.get('keyboard').introAcknowledgedAt);assert.equal(await escapePage.evaluate(()=>document.activeElement?.id),'adaptiveMode-manualSchedule');
 assert.deepEqual(errors,[]);
 console.log('Schedule location, exact text, no Calendar control, board preservation, phone widths, simulated two-device mode/acknowledgement and independent member checks passed. Live backend/RLS not tested.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
