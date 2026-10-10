// Attachments travel with the item through the existing saves, sync and backups.
export async function readItemImage(file){
 if(!file.type.startsWith('image/'))throw new Error('Choose an image file.');
 if(file.size>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  let data=canvas.toDataURL('image/jpeg',.82);
  if(data.length>700000)data=canvas.toDataURL('image/jpeg',.55);
  if(data.length>1000000)throw new Error('This image is too detailed to save. Choose a smaller image.');
  return {src:data,name:file.name};
 }finally{URL.revokeObjectURL(url)}
}
function viewImage(attachment,title){
 const dialog=document.createElement('dialog');dialog.className='item-image-viewer';
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.onclick=()=>dialog.close();
 const heading=document.createElement('h2');heading.textContent=title;dialog.setAttribute('aria-label','Image for '+title);
 const image=document.createElement('img');image.src=attachment.src;image.alt=attachment.name||title;
 dialog.append(close,heading,image);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});dialog.showModal();
}
export function appendItemImage(parent,item,getCurrent,save,{editable=true}={}){
 if(!editable&&!item.image?.src?.startsWith('data:image/'))return;
 const controls=document.createElement('div');controls.className='item-image-controls';
 if(item.image?.src?.startsWith('data:image/')){
  const thumbnail=document.createElement('button');thumbnail.type='button';thumbnail.className='item-image-thumbnail';thumbnail.setAttribute('aria-label','View image for '+item.text);
  const image=document.createElement('img');image.src=item.image.src;image.alt=item.image.name||item.text;thumbnail.append(image);thumbnail.onclick=()=>viewImage(item.image,item.text);controls.append(thumbnail);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove image';remove.onclick=()=>{const current=getCurrent();if(current){delete current.image;save()}};if(editable)controls.append(remove);
 }
 if(!editable){parent.append(controls);return}
 const label=document.createElement('label');label.className='item-image-upload';label.append(document.createTextNode(item.image?'Replace image':'Upload image'));
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('aria-label','Upload image for '+item.text);
 const status=document.createElement('span');status.setAttribute('role','status');
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;input.disabled=true;status.textContent='Saving image…';
  try{const attachment=await readItemImage(file),current=getCurrent();if(!current)throw new Error('This item has been removed.');current.image=attachment;save();status.textContent='Image saved.'}
  catch(error){status.textContent=error.message||'Unable to open this image. Choose another image.'}
  finally{input.disabled=false;input.value=''}
 };
 label.append(input);controls.append(label,status);parent.append(controls);
}
