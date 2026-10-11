# Laundry on the main page and overlapping loads

- [x] Save and verify the rolling previous-version backup.
- [x] Show laundry cycles on the main House page and retain Doing Now access.
- [x] Use Put a load on, then choose dryer or hanging rail, then the selected final step.
- [x] Add a second load when the first is drying, with two folder tabs and independent saved progress.
- [x] Preserve existing in-progress laundry, reminders, completion points and other laundry tasks.
- [x] Group Doing Now tasks by room with collapsible headings.
- [x] Show step 2 at the top of Doing Now after washing starts; finishing it advances Laundry without adding step 3 to Doing Now.
- [x] Add I’m on it / Not on it to Other laundry tasks and connect them to Doing Now.
- [x] Give Laundry its own page/category and move any explicitly categorised Laundry sidequests with their progress.
- [x] Run tests, build and mobile UI checks.
- [x] Publish to main, verify Pages, and save a handoff.

## Handoff

Laundry now renders on House and Doing Now from the same saved load slots. Existing rail/dryer progress migrates once, preserving incomplete stages and reminders; legacy functions remain for compatibility. A second slot is enabled after load 1 moves to dryer/rail. Both slots restart after their final step, retain separate progress and award one point per completion. Room groups in Doing Now use native expandable headings, remember their open state during rerenders, and keep completed tasks together below the rooms.

Validation: all 205 tests pass; assembled production build passes. Phone-size preview verified both drying routes across two simultaneous loads, reload persistence, points, and independent room expansion/collapse.

Published through signed-in Chrome because Git could not authenticate and the GitHub connector lacked write access. App commit: 93c328c0d7d323d7d429f6ec2a42724adef66b90. Test commit: b42f3c6fd46faec84235f51decef078136008b1c. GitHub Pages run 38146974457 passed build, all tests and deployment. Local runtime/tests match origin/main exactly. Live phone-size UI verified House laundry and the standalone Laundry page. Later requested addition: step 2 also appears at the top of Doing Now and uses the same completion action as Laundry. Step 3 stays in Laundry. Pre-existing user changes in AGENTS.md, LAYOUT-AND-NAVIGATION-RULES.md and the bedroom/laundry/reset plan were left intact.

Additional validation: mobile UI verified step 2 appears above room groups and completing it removes it from Doing Now while advancing to step 3 in Laundry. Other laundry task on/off controls add and remove the same saved task in Doing Now. Laundry has a standalone route linked from House, More and the existing Doing Now Laundry shortcut; explicitly categorised Laundry sidequests migrate with children and progress.
