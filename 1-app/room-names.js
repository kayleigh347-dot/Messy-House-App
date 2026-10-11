export const roomNames={
 'room-entrance':'Downstairs Entrance','room-hall':'Main Landing','room-penny':'Pennys Bedroom','room-master':'Master Bedroom','room-bathroom':'Bathroom','room-living':'Living Room','room-kitchen':'Kitchen','room-cats':'Cat Tray Area','room-print':'3d Printer Workshop','room-craft':'Craft & Storage Room'
};
const aliases={
 'room-entrance':['Downstairs Entrance Landing','Entrance'],'room-hall':['Main Floor Landing / Hallway','Hallway / Landing'],'room-penny':["Penny’s Bedroom","Penny’s Room","Penny's Bedroom"],'room-cats':['Upper Landing / Cat Area','Upstairs Landing'],'room-print':['Print Room / Large Loft','3D Printer Room'],'room-craft':['Craft & Storage Room / Small Loft','Storage Room']
};
export function canonicalRoomName(room){return (aliases[room.id]||[]).includes(room.name)?roomNames[room.id]:room.name}
