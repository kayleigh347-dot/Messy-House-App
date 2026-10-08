import {pushPublicKey} from './push-config.js';
export function pushAvailability(){
 const iphone=/iPhone|iPad|iPod/i.test(navigator.userAgent),installed=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
 if(iphone&&!installed)return 'On iPhone: open this site in Safari or Chrome, tap Share → Add to Home Screen, then open the new Mission Control icon and enable notifications there. The Home Screen app opens separately from your browser.';
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return iphone?'This iPhone needs iOS 16.4 or newer for web app notifications. Open Mission Control from its Home Screen icon.':'This browser does not support web push notifications.';
 if(!pushPublicKey)return 'External notifications need the server setup before they can be enabled.';
 if(Notification.permission==='denied')return 'Notifications are blocked. Allow them in your device’s notification settings.';
 return '';
}
export async function enablePush(db,houseId){
 const unavailable=pushAvailability();if(unavailable)throw new Error(unavailable);
 if(!db)throw new Error('Sign in and sync your house first.');
 // Request directly from the button gesture, before any network awaits (iOS).
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Notification permission was not granted.');
 const {data:{session},error}=await db.auth.getSession();if(error)throw error;
 if(!session)throw new Error('Sign in and sync your house first.');
 const registration=await navigator.serviceWorker.ready;
 const key=Uint8Array.from(atob(pushPublicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 let subscription=await registration.pushManager.getSubscription();
 const oldKey=subscription?.options?.applicationServerKey;
 if(subscription&&oldKey&&(new Uint8Array(oldKey).length!==key.length||new Uint8Array(oldKey).some((value,index)=>value!==key[index]))){await subscription.unsubscribe();subscription=null}
 subscription ||= await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 const {error:saveError}=await db.rpc('register_mission_push',{house_id:houseId||session.user.id,subscription:subscription.toJSON()});
 if(saveError)throw new Error('Could not enable external notifications. Check the server setup and try again.');
 return subscription;
}
export async function disablePush(db){
 const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();
 if(!subscription)return;
 if(db){const {error}=await db.rpc('remove_mission_push',{push_endpoint:subscription.endpoint});if(error)throw error;}
 await subscription.unsubscribe();
}
