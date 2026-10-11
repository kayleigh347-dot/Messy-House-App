# Clickable room sprite faces in Doing Now

- [x] Save and verify the completed uniform version in the rolling backup.
- [x] Match the attached character art to the app's existing sprite assets.
- [x] Show the corresponding sprite face beside each Doing Now room heading.
- [x] Open the correct room page when its face is clicked.
- [x] Keep room heading collapse/expand behavior working independently.
- [x] Check phone layout, room navigation and the production build/tests.
- [x] Publish and verify Pages.
- [x] Save a handoff.

## Handoff

The Doing Now room headings now display circular face crops from all ten matching character sheets supplied by Kayleigh. Each face has an accessible room label and opens that room. Clicking the remaining heading area still toggles its task group. Existing sprite assets are reused; no additional downloads are needed. Custom rooms retain a house symbol fallback.

Checked all ten room destinations on a 390px phone viewport, collapse/expand, and preserved collapse state while navigating. All 207 tests and the production build passed. Publication uses the signed-in Chrome GitHub session because local push credentials are unavailable.

Published on main; Pages deployment run 38148272303 passed build and deploy. The live site loads app.js?v=doing-room-faces-20261011-v1. Local app and tests exactly match origin/main. All earlier requested laundry behaviors were rechecked against the laundry and uniform checklists.
