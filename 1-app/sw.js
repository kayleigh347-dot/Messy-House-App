const C="mission-control-automate-fix-20261010-v1";
const A=["./laundry-reminders.js","./assets/laundry-rail.svg","./assets/laundry-dryer.svg","./laundry-migration.js","./laundry.js","./common-tasks.js","./assets/audio/calm.wav","./assets/audio/morning.wav","./assets/audio/waltz.wav","./assets/audio/steps.wav","./assets/audio/dubstep.wav","./assets/audio/CREDITS.txt","./recurring-schedule.js","./assets/prize-shelf.jpg","./assets/sprites/master-v3/happy.png","./assets/sprites/master-v3/walk.png","./assets/sprites/master-v3/actions.png","./assets/sprites/master-v3/sad.png","./living-walk-rig.js","./assets/sprites/living-v1/walk-rig-v2.png","./master-animation.js","./assets/sprites/master-v2/animation-atlas.png","./assets/room-art/room-print-spotless.png", "./assets/room-art/room-print-clean.png", "./assets/room-art/room-print-messy.png", "./assets/room-art/room-print-disaster.png","./assets/room-art/room-master-spotless.png", "./assets/room-art/room-master-clean.png", "./assets/room-art/room-master-messy.png", "./assets/room-art/room-master-disaster.png", "./assets/room-art/room-penny-spotless.jpg", "./assets/room-art/room-penny-clean.png", "./assets/room-art/room-penny-messy.png", "./assets/room-art/room-penny-disaster.png", "./assets/room-art/room-bathroom-spotless.png", "./assets/room-art/room-bathroom-clean.png", "./assets/room-art/room-bathroom-messy.png", "./assets/room-art/room-bathroom-disaster.png", "./assets/room-art/room-kitchen-spotless.png", "./assets/room-art/room-kitchen-clean.png", "./assets/room-art/room-kitchen-messy.png", "./assets/room-art/room-kitchen-disaster.png", "./assets/room-art/room-living-spotless.png", "./assets/room-art/room-living-clean.png", "./assets/room-art/room-living-messy.png", "./assets/room-art/room-living-disaster.png", "./assets/room-art/room-hall-spotless.png", "./assets/room-art/room-hall-clean.png", "./assets/room-art/room-hall-messy.png", "./assets/room-art/room-hall-disaster.png", "./assets/room-art/room-entrance-spotless.png", "./assets/room-art/room-entrance-clean.png", "./assets/room-art/room-entrance-messy.png", "./assets/room-art/room-entrance-disaster.png", "./assets/room-art/room-craft-spotless.png", "./assets/room-art/room-craft-clean.png", "./assets/room-art/room-craft-messy.png", "./assets/room-art/room-craft-disaster.png", "./assets/room-art/room-cats-spotless.png", "./assets/room-art/room-cats-clean.png", "./assets/room-art/room-cats-messy.png", "./assets/room-art/room-cats-disaster.png", "./room-art.js", "./item-images.js","./sidequest-tabs.js","./subtasks.js","./assets/fonts/Fredoka.ttf","./assets/fonts/OFL.txt","./room-colours.js","./task-drag.js",
 "./alarm-music.js",
 "./focus-timer.js","./house-calendar.js","./house-calendar.css","./cohesion.css","./task-ui.js",
 "./calendar.js","./features.js","./features.css","./periods.js","./personalities.js","./task-upload-template.csv","./TASK-UPLOAD-GUIDE.md",
 "./completion-history.js","./completion-trend.js","./push-client.js","./push-config.js",
 "./household.js","./task-stats.js","./task-flow.js","./stats-ui.js","./task-extras.js","./navigation.js","./room-mess.js",
 "./assets/printer-background.png","./creature-audio.js","./creature-behaviour.js","./creature-motion.js","./creature-pathfinding.js","./living-animation.js","./living-mood.js","./room-navigation.js","./room-navigation-debug.js","./mobile.css",
 "./assets/ui/house.svg","./assets/ui/tasks.svg","./assets/ui/side.svg","./assets/ui/wins.svg","./assets/ui/settings.svg","./assets/ui/more.svg",
 "./assets/hall-background.png","./assets/entrance-background.png","./assets/penny-spotless.jpg","./assets/master-spotless.png","./assets/kitchen-background.png","./companion-layouts.js","./assets/bathroom-background.png","./room-companion.js","./stage-one.css","./assets/house.png","./assets/upstairs-landing-background.png","./assets/storage-room-background.png","./assets/living-spotless.png",
 "./","./index.html","./styles.css","./app.js","./sync-state.js","./rewards.js","./v2-state.js","./v2-ui.js","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png",
 "./assets/sprites/cats-states.webp","./assets/sprites/entrance-states.webp","./assets/sprites/hall-states.webp","./assets/sprites/master-states.webp","./assets/sprites/penny-states.webp","./assets/sprites/print-states.webp","./assets/sprites/craft-states.webp","./assets/sprites/kitchen-states.webp","./assets/sprites/bathroom-states.webp","./assets/sprites/living-states.webp",
 "./assets/sprites/living-v1/blink.png","./assets/sprites/living-v1/celebrate.png","./assets/sprites/living-v1/greet.png","./assets/sprites/living-v1/plant.png","./assets/sprites/living-v1/rug.png","./assets/sprites/living-v1/still-clean.png","./assets/sprites/living-v1/still-disaster.png","./assets/sprites/living-v1/still-messy.png","./assets/sprites/living-v1/still-spotless.png","./assets/sprites/living-v1/walk-a.png","./assets/sprites/living-v1/walk-b.png"
,"./master-walk-rig.js","./assets/sprites/master-v2/walk-rig.png","./assets/sprites/master-v2/actions-atlas.png","./assets/sprites/master-v2/sad-atlas.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(x=>x.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("mission-control-")&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(C).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});

self.addEventListener('push',event=>{
 let message={};try{message=event.data?.json()||{}}catch{}
 event.waitUntil(self.registration.showNotification(message.title||'Mission Control',{
  body:message.body||'You have a new shared task.',tag:message.tag||'mission-control-task',
  icon:'./icon-192.png',badge:'./icon-192.png',data:{url:'./'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const url=new URL('./',self.registration.scope).href;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(client=>client.url.startsWith(self.registration.scope));
  if(existing)return existing.focus();
  return self.clients.openWindow(url);
 })());
});
