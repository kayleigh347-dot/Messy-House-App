# App layout, navigation and function rules

This is the authoritative layout, navigation and function document referenced by `AGENTS.md`. Follow these integrated rules for app changes and reviews unless Kayleigh explicitly gives a different instruction. Keep this filename so existing agent references remain valid.

## Applying these rules

- Follow the proper-plan and small-step workflow in `AGENTS.md`; plans and supporting checklists remain local.
- Before editing, map the relevant requirements to every affected page, mode and renderer in a local coverage table. Recheck that coverage before publication. A rule implemented on one page does not prove it works on another.
- Layout changes must preserve the required functions and controls below. Verify their availability and behaviour after reorganising a page. In particular, calendar symbols must preserve day details and Skip; the main and room calendars must both enforce recurring-only task filtering.
- Record evidence as source inspection, automated test, screen check or actual device check. Mark unchecked behaviours explicitly. A passing build or test suite is not evidence that all these rules pass.
- Use synthetic local data for destructive or replacement checks. Do not alter Kayleigh's live board to verify an update.
- Review findings do not authorise unrelated app changes. Keep each proposed fix separate until it falls within Kayleigh's requested scope.

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
- Calendar month view uses compact room/guardian symbols and event symbols (appointments, errands and laundry), with time/count indicators. Keep full room and task details available by tapping a day and through accessible labels.
- Keep Skip this time available in both the main calendar and room recurring calendar, and in recurring tasks’ detailed options. Month symbols must not remove access to this action through day details.
- Calendar recurring task rows offer Skip this time for a single current or projected occurrence. Skipping awards no points and records no completion; later repeats stay scheduled.
- Calendar remains a separate page. Its task lists, completed task lists and whole-house task choices show recurring tasks only. One-off tasks remain in their existing task lists; appointments and errands remain calendar events.
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
- Hide Start setup while a wizard is active. Show numbered progress, Back/Next, and Cancel controls. Back, including browser/device Back, returns to the previous part and retains choices; only Cancel exits. At the first part, Back keeps setup open.
- Task repeat editing offers Days and Weeks for preset and custom tasks. Tapping a wizard task box expands its options, except controls which retain their own action. Keep the edited box open and follow it when interval changes move it in the sorted list.
- Offer One room per day in wizard time settings and enforce it across the full repeating schedule, alongside daily limits and rest days.
- Offer Use current schedule to preselect current recurring tasks, rooms, repeat intervals and tools; additional presets start unchecked. Preview schedules as a visual week calendar with rooms, task times and rest days, allowing other weeks to be inspected.
- Include cat/litter areas and fuller optional cleaning presets. Tools include wet/dry microfibre, magic eraser, glass cloth, wet window cloth and dry glass cloth; window tasks follow wet cleaning with dry polishing.
- Preset and custom tasks offer common and custom tools. Retain choices between wizard steps, show them in the preview, and carry them into the saved tasks and Tools needed checklists.
- The final preview lists all current recurring cleaning tasks being replaced. Only after explicit confirmation, retire all of those routines and install the selected new schedule, including replacement of routines in unchecked rooms. Keep laundry, one-off tasks, hobbies, notes, shopping, completed records, points, and account sync intact.
- Group selected tasks first by occurrence interval, then unchecked suggestions by interval. Keep a room's category when its name changes.
- Schedule maker places each first due date roughly one repeat interval after the selected start date, shifting later as needed for rest days and capacity. Do not make all tasks due immediately at setup.
- Rest days contain no automatically scheduled tasks. Manual additions remain possible.
- User-set or measured task times are exempt from preset time multipliers. Show any longer repeat intervals in the schedule preview.
- Catch up shows missed recurring work once per task series, with days or weeks overdue. A missed task must not accumulate duplicate catch-up entries when its next occurrence arrives.
- Schedule maker changes happen only after preview and explicit confirmation. Never replace a saved board during an app update. Keep hobbies, sidequests, notes, shopping, history, points, and account sync intact.

## Exceptions

An explicit instruction from Kayleigh for a particular page or change overrides these defaults for that work.

## Optional recommendation mode function rules

These rules apply to the planned Go With the Flow function. They do not change the existing Schedule maker, Follow a Routine, task lists, rewards or timers. Stage 01 was accepted for planning purposes only on 13 October 2026; Stage 02 is planning only. The following user clarifications supersede conflicting earlier planning restrictions. This section grants no permission to implement or alter saved data now.

- Keep the new mode separate and opt-in. Do not automatically add, reorder, replace, delete or populate existing task lists when entering focus, changing modes, refreshing recommendations, saving mode settings or completing an isolated preparation routine.
- Users must be able to deliberately add Clear the Way tasks to their room lists. Use an explicit action showing the selected tasks and destination room; cancellation or simply choosing/opening a routine creates no room tasks. Detailed preview, duplicate prevention, task identity and Undo behaviour belong to Stage 04. This required capability is not a blanket authorisation for other list changes or automatic sorting-at-bottom.
- Personal suppression hides only that person's recommendations. It never pauses, deletes or disables the household task or removes its shared calendar schedule. Deliberately deleting/disabling a task in shared settings remains a separate action.
- Follow a Routine retains existing behaviour. Flow recommendations are suggestions and do not silently become general-list or Doing Now obligations. Preserve current controls, completion/Undo, account saves/sync and x2/x3 time behaviour, including saved/measured-time treatment.
- Learning must retain individual completion dates beyond the current 90-day history limit through a separately designed solution. Do not change the current rewards/statistics, their inputs or the existing history archive to provide it. A learning event must not create another completion or reward credit. Stable identity, retention, corrections/Undo, sync and unavailable historical dates need explicit design in Stages 06 and 09; never invent missing dates.
- Investigate the reported immediate overdue overload and multiweek calendar gap before implementing new scheduling calculations. Do not assume the existing scheduling maths is correct or reuse it as validated merely because source was audited or earlier tests passed. Record reproduction/trace evidence, findings and unresolved limits. No diagnosis is established by Stage 01 acceptance.
- Room Focus is voluntary. Offer it from the room or a room choice reached from Doing Now through approved additive entry points; never force a daily prompt or reintroduce Choose a small task. Recommendation ordering is confined to the isolated view.
- Plan a stable daily recommendation snapshot at 03:00 user-local time with catch-up on reopening. Flexible unfinished recommendations carry forward once with their original recommendation date retained; explicit event target dates stay anchored. Date/DST/offline details remain for the scheduling stage and its investigation gate.
- Eligible saved custom-task learning starts after three completions using consecutive completion gaps, updated after later completions without repeated approval prompts. Explicit task intervals override the learned estimate. As needed means no schedule or inferred due date. Organisation requires specific opt-in; crafts/hobbies are excluded from learning.
- Room setup is skippable/resumable; optional areas and routine editing belong in isolated settings, not clutter on normal task pages. Clear the Way preparation is ordered rather than priority-scored and sorting is not required to finish preparation. Allow standard and multiple named custom routines per room with edit/delete/up/down controls in their reviewed stage.
- Event templates are optional and editable, with Christmas, birthday and custom events and days/weeks preparation lead times. Calendar integration remains a separate reviewed boundary. Physical effort remains separate from minutes; future effort-based rewards require separate approval and cannot change current rewards or timers.
- The first activation of Flow gets one explanation; subsequent access is in existing Help. Keep main views compact, primary actions visible, secondary controls expandable and all existing design/navigation patterns intact. Do not add Sit down OK to the new feature.

Current confirmed clarifications and stage status are recorded locally in `canned plans/adaptive-scheduling/PLANNING-DECISIONS.md`. Each stage remains a proposal until reviewed; planning acceptance is never implementation approval.

## Approved room setup and area additions — 13 October 2026

Kayleigh explicitly authorised Stage 03 application coding and the following additions. Preserve every preceding rule and all existing controls. These additions do not grant database implementation or publication permission.

- Use the existing More → Manage home → My rooms page. Add one expandable **Personal room setups & areas** section below the existing Add room form and above the existing room list. Keep room management, tabs, settings cog and navigation intact.
- Room setups, named areas and task-to-area assignments are personal to each member. Keep them separate from household board settings and other members' preferences, scoped to the correct household/task identity.
- Offer Set up a room, Review all rooms, Back, Skip, Next room and Save and finish later using existing form/card styles. Saving a named setup creates no household tasks. Add all/Add selected are separate deliberate actions that show the destination and proposed additions before confirmation. Existing task references are reused unchanged; never retire a schedule or duplicate an active referenced task.
- Put the personal **All areas** filter directly below the existing room task toolbar containing view/search/Add task controls. Default to All areas; keep the single room text search and existing task cards. Area creation/rename/delete/assignment stays in My rooms. Deleting an area returns personal assignments to Unassigned and never deletes tasks. Keep the shared calendar and other members' area views unchanged.
- Reuse existing type, colour, spacing, checkbox, expandable-section and dialog conventions. No new page, tab, page-title tagline, global theme change or task-card editing controls.

## Confirmed Clear the Way follow-up corrections — 13 October 2026

These user corrections supersede the earlier optional follow-up proposal for Stage 04. They are the only new exception to the prohibition on automatic list additions; other automatic list population remains prohibited.

- Saved Clear the Way routines are shared household configuration. Room setups and named areas remain personal; shared routines must not overwrite those personal preferences.
- After a user completes a deliberately added pickup/boxing step, automatically append its separate sorting task to that room's ordinary list. Give each pickup category and each separately selected area its own follow-up task. Do not add sorting merely on opening/previewing a routine or choosing Focus.
- Important-item sorting receives higher priority than general-clutter sorting. Use the established task priority controls; do not change rewards or invent new numeric recommendation weights. Sorting stays independent and never gates cleaning.
- If the pickup completion is undone, remove its automatically created sorting task only if untouched. Preserve sorting tasks that were edited, reordered, started or completed. Keep ordinary completion/Undo/reward behaviour and unrelated tasks intact.

## Saved definitions versus household tasks — deletion boundary

Kayleigh confirmed: deleting saved schedules, setups, routines or similar custom definitions affects only the deleting member's view/copy. Another member must not lose their saved definition. Where a definition is shared, use a per-user hidden/deleted marker rather than deleting the shared record. Personal setups/areas remain protected by authenticated own-user storage. Deleting an actual task is a household action and retains the existing shared-task deletion behaviour. Never conflate definition deletion with deletion of instantiated tasks.

- Editing a shared Clear the Way definition creates a personal variation; never overwrite the shared definition or another member's copy. New shared definitions and personal variations must remain distinct.
- Reuse existing settings menus, styles and navigation. Clear the Way is a new feature added to those menus; do not rebuild an existing settings page.
- Keep all new customisation controls in settings/editing mode: creation, renaming, editing, deletion, area assignment and step reordering. Everyday feature use offers only task/routine selection, Add All/Choose Tasks/Not Now and ordinary completion. Do not place configuration forms on main task, Doing Now or Focus screens.

## Integrated room Focus — confirmed 13 October 2026

- Focus on this room sits beside the room name. Clear the Way is the first step inside Focus, followed by selection of other active tasks connected to that room. Preserve existing tabs, cog, search, task controls and navigation.
- Opening/dismissing preparation adds no tasks. Explicit confirmed preparation additions use the existing room/Doing Now identities. Selecting other room tasks adds existing references through the ordinary Doing Now action; no copies, schedule changes or reordering of unrelated work.
- Configuration stays in My rooms. Focus uses ordinary task completion/Undo/timers. Adaptive scoring and snapshots remain separate pending stages; do not present manual room selection as calculated recommendations.

## Connected flexible mode — approved 13 October 2026

Kayleigh authorised completing the connected function in one batch, approved the proposed scoring/capacity/rounding defaults, approved preparing and installing private storage, and requested GitHub publication after checks. These explicit approvals supersede the earlier stage-only and planning-only restrictions for this feature.

- Focus on this room remains next to the room title. Clear the Way opens first inside Focus, followed by voluntary room task and recommendation choices. The Doing Now Focus action chooses a room and opens this same sequence.
- Flexible Calendar is a separate recommendation interface within the existing Calendar page. It has no Catch up, backlog, or automatic task-list/Doing Now obligations. Recommendations become tasks only through explicit addition; existing task identities are reused. The previously approved pickup-to-sorting follow-up remains the narrow exception.
- Keep Follow a Routine behaviour, appointments, errands, ordinary completion/Undo, rewards, saved board and sync intact. Recommendation priority, suppression, learning dates, snapshots and events are personal. Configuration stays in the existing Manage home editing surfaces.
- Daily recommendations freeze at 03:00 in the chosen IANA time zone, with refresh on reopening. Carry unfinished flexible recommendations once; keep event target dates anchored. Settings do not reorder the current day's snapshot.
- Use approved editable defaults: priority base 60/45/30/15/5, capped urgency and neglect, soft capacity 5 suggestions or 60 minutes, learned intervals rounded up. Remaining suggestions stay accessible.
- Retain accurate eligible completion dates in separate own-user storage until deletion. Deduplicate the same completion ID, retain genuine separate completions, and correct dates on Undo without changing reward/history records.

## Completion fixes and detailed Help — approved 14 October 2026

- Retain unfinished annual event preparation across New Year when the member chooses Keep recommendations, preserving occurrence year and original/target dates. Completed/hidden occurrences stay excluded.
- Deleting a saved reusable definition hides its root/selected descendant definitions only for that member, scoped to the current house. Use the existing private preference storage; keep shared definitions, instantiated tasks, active laundry and history unchanged. Restore through Hidden saved tasks in Reusable. Existing actual task Remove/Delete remains shared.
- Newly added reusable tasks and their subtasks retain their source template identity for eligible learning; never guess or rewrite historical task identities.
- Detailed Help belongs in Settings → Help. Use the existing expandable optional-section appearance, readable paragraphs/lists and exact current control names. Explain modes, explicit additions, private/shared choices, dates, learning, events, timers, laundry, backups and recovery. Do not add navigation or present synthetic checks as real device/account verification.
