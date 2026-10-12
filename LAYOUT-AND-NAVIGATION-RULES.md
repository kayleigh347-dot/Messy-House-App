# App layout and navigation rules

This is the standing layout and navigation document referenced by `AGENTS.md`. Follow these integrated rules for every app UI change unless Kayleigh explicitly gives a different instruction.

## Mobile-first layout

- **Use compact mode by default.** When a page offers compact and detailed modes, compact is the initial/default view.
- **Save vertical space.** Keep optional settings and secondary controls in expandable sections. Keep the main task details and primary actions visible.
- **Remove page descriptions and taglines.** Pages should not add explanatory descriptions or instruction text beneath their titles. These can be added to Settings → Help.
- Expandable option titles stay on one line when space allows, and wrap naturally to a second line when necessary.

## Page headers and tabs

- Keep the settings cog at the top right on every page and room. On the home illustration, use the cog mapped to the house image instead.
- Put tabs immediately beneath the page title, before the page content.
- Use the same folder-like tab style across pages, with a cut-out tab shape. Top-level tabs are purple. Tabs within a tab use different colours to distinguish the levels, including their inactive states. Tabs should read as tabs, not buttons.
- Keep a page's tabs on one line on mobile, using concise labels where needed.
- Keep headers, tabs, and view controls consistent across pages that use the same pattern.

## More and Manage home navigation

- More groups home configuration into **Manage home**, with **Tasks**, **Schedule**, and **My rooms** tabs.
- Tasks has three tabs: **Reusable**, **Recurring**, and **Tools/times**. Laundry setup and cycle editing are a separate function in More → Laundry setup & editing.
- Schedule has **Manual edit** and **Schedule maker** options. Schedule maker replaces the previous automatic scheduling setup.
- My rooms contains room management.
- Calendar remains a separate page.
- **Backup & custom tasks** combines board backup controls and custom task upload on one page, with separate explicit import and upload actions.

## Task lists

- Make task lists consistent in appearance and behaviour across pages and between compact and detailed modes.
- Compact task cards show task names, the subtask counter, and two small reorder buttons labelled **First** and **Last**. Tapping expands subtasks only; never reveal editing options, assignment, timer, Doing Now, notes, extra details, or subtask editing forms in compact mode. Use detailed view for those controls.
- Keep the subtask counter fixed at the top right of each task card and its completion control fixed at the bottom right. Support swiping right to complete.
- Show completed tasks at the bottom, grouped together in one box. Keep each task's Undo action on the same line as its name.
- Within a parent task, move completed subtasks below unfinished subtasks. Keep subtask rows to one line, with Undo beside completed subtasks.
- Rooms have exactly one text search. Open it with a magnifying-glass icon between the view controls and Add task button. Do not add a second Search & filters panel in rooms.
- Sidequests belong in the room's Side quests tab, never its Tasks tab, including completed sidequests. Keep task and sidequest collections separate without rewriting personal task data.
- Remove the Choose a small task function; do not reintroduce it.
- Show **Undo deleted** only on pages containing task lists. Never show it on Task Data, Settings, or other pages without task lists.

## Add task and task options

- The Add task form has a single compact row of checkboxes: **Add to Doing Now**, **Needs attention**, and **Sidequest**.
- Put **Add subtask** below that row.
- Put **More options** below the confirmation button. It opens a full options popup for assignment, tools, saved templates, and other secondary fields.
- Task tools support common presets and custom tools. **Tools needed** in Doing Now and calendar day detail opens a checklist containing each required tool once, including tools from unfinished subtasks.

## Schedule setup and catch up

- Schedule setup visits **General**, preset rooms, then custom rooms. Laundry must not appear in the cleaning wizard.
- Laundry setup separately offers dryer and hanging-rail cycles, including using both, with editable cycle steps. Preserve active laundry progress when settings change.
- The cleaning wizard starts by offering a local download of the current board backup, with an explicit option to continue without it. Never upload this backup.
- Hide Start setup while a wizard is active. Show numbered progress, Back/Next, and Cancel controls.
- The final preview lists all current recurring cleaning tasks being replaced. Only after explicit confirmation, retire all of those routines and install the selected new schedule, including replacement of routines in unchecked rooms. Keep laundry, one-off tasks, hobbies, notes, shopping, completed records, points, and account sync intact.
- Group selected tasks first by occurrence interval, then unchecked suggestions by interval. Keep a room's category when its name changes.
- Rest days contain no automatically scheduled tasks. Manual additions remain possible.
- User-set or measured task times are exempt from preset time multipliers. Show any longer repeat intervals in the schedule preview.
- Catch up shows missed recurring work once per task series, with days or weeks overdue. A missed task must not accumulate duplicate catch-up entries when its next occurrence arrives.
- Schedule maker changes happen only after preview and explicit confirmation. Never replace a saved board during an app update. Keep hobbies, sidequests, notes, shopping, history, points, and account sync intact.

## Exceptions

An explicit instruction from Kayleigh for a particular page or change overrides these defaults for that work.
