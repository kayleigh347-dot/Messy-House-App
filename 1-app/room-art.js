export const roomArtwork={
  "room-master": {
    "SPOTLESS": "assets/room-art/room-master-spotless.png",
    "CLEAN": "assets/room-art/room-master-clean.png",
    "MESSY": "assets/room-art/room-master-messy.png",
    "DISASTER": "assets/room-art/room-master-disaster.png"
  },
  "room-penny": {
    "SPOTLESS": "assets/room-art/room-penny-spotless.jpg",
    "CLEAN": "assets/room-art/room-penny-clean.png",
    "MESSY": "assets/room-art/room-penny-messy.png",
    "DISASTER": "assets/room-art/room-penny-disaster.png"
  },
  "room-bathroom": {
    "SPOTLESS": "assets/room-art/room-bathroom-spotless.png",
    "CLEAN": "assets/room-art/room-bathroom-clean.png",
    "MESSY": "assets/room-art/room-bathroom-messy.png",
    "DISASTER": "assets/room-art/room-bathroom-disaster.png"
  },
  "room-kitchen": {
    "SPOTLESS": "assets/room-art/room-kitchen-spotless.png",
    "CLEAN": "assets/room-art/room-kitchen-clean.png",
    "MESSY": "assets/room-art/room-kitchen-messy.png",
    "DISASTER": "assets/room-art/room-kitchen-disaster.png"
  },
  "room-living": {
    "SPOTLESS": "assets/room-art/room-living-spotless.png",
    "CLEAN": "assets/room-art/room-living-clean.png",
    "MESSY": "assets/room-art/room-living-messy.png",
    "DISASTER": "assets/room-art/room-living-disaster.png"
  },
  "room-hall": {
    "SPOTLESS": "assets/room-art/room-hall-spotless.png",
    "CLEAN": "assets/room-art/room-hall-clean.png",
    "MESSY": "assets/room-art/room-hall-messy.png",
    "DISASTER": "assets/room-art/room-hall-disaster.png"
  },
  "room-entrance": {
    "SPOTLESS": "assets/room-art/room-entrance-spotless.png",
    "CLEAN": "assets/room-art/room-entrance-clean.png",
    "MESSY": "assets/room-art/room-entrance-messy.png",
    "DISASTER": "assets/room-art/room-entrance-disaster.png"
  },
  "room-craft": {
    "SPOTLESS": "assets/room-art/room-craft-spotless.png",
    "CLEAN": "assets/room-art/room-craft-clean.png",
    "MESSY": "assets/room-art/room-craft-messy.png",
    "DISASTER": "assets/room-art/room-craft-disaster.png"
  },
  "room-cats": {
    "SPOTLESS": "assets/room-art/room-cats-spotless.png",
    "CLEAN": "assets/room-art/room-cats-clean.png",
    "MESSY": "assets/room-art/room-cats-messy.png",
    "DISASTER": "assets/room-art/room-cats-disaster.png"
  },
  "room-print": {
    "SPOTLESS": "assets/room-art/room-print-spotless.png",
    "CLEAN": "assets/room-art/room-print-clean.png",
    "MESSY": "assets/room-art/room-print-messy.png",
    "DISASTER": "assets/room-art/room-print-disaster.png"
  }
};
export function roomArtworkFor(roomId,state){return roomArtwork[roomId]?.[state]||null}
