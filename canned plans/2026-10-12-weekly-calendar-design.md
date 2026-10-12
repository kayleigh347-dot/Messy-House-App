# Weekly calendar redesign — design plan

Date: 12 October 2026. Status: implementation authorised; visual references take priority.

## Request and scope

Rework the household calendar's weekly view using Kayleigh's two supplied references, with arrows for browsing following and previous weeks. Include a weekly overview without task breakdown, using the app's existing room sprites in place of the second reference's illustrations. The images are visual references, not instructions to import their example rooms, tasks, dates or settings.

Work only in `messy-house-app-github/`. Preserve personal task data and all existing calendar functions. The initial request was for a plan. Kayleigh subsequently authorised implementation, the full specification and the Tidy-ish rename, prioritising both images.

## Recommended design

### Weekly overview — default

Kayleigh's second reference adds a summary-only weekly view. Make this the initial Week presentation, with an Overview / Day detail view control beneath the Week/Month tabs. This control is separate from compact/detailed task formatting. Remember the chosen weekly presentation.

- Show seven stacked horizontal cards, Monday–Sunday, like the second reference. Each has a coloured room accent, weekday/date, a room sprite thumbnail, room/session name, task count and estimated minutes where known.
- Use the same room sprites as the existing app rather than generating new pictures or using the reference's drawings. Reuse the established sprite-frame rendering so a thumbnail shows one correctly cropped frame, not a whole sprite sheet. Keep the existing room identity; a future week's thumbnail does not predict future mess state. Supply a room-name fallback if artwork is missing.
- No task names, subtasks, checkboxes or selected-day task panel appear in Overview. Keep all seven cards visible as a vertically scrolling list on phones, with flexible text widths and no horizontal page overflow.
- Keep the previous/next-week arrows, date range and Today control above the list. Both weekly presentations show the same week and preserve the selected date when switching.
- A card's chevron deliberately opens Day detail for that date. Returning to Overview restores the same week and scroll position. Do not expand a breakdown inline or open it automatically on entry.
- For multiple rooms, include a small sprite group and names/count summary rather than pretending only one room is scheduled. Appointments and errands retain visible summary indicators. Empty days still have a dated card.
- Show planned minutes directly from existing estimates. Add the reference's workload bars only when a genuine daily limit exists; do not invent a 240-minute default. Missing/partial estimates remain clearly labelled.
- An optional day menu can expose existing Add / move actions. Add to calendar remains accessible. Auto plan and new planning controls stay in the separately agreed planning phase below.

### Weekly day detail — first reference

The following horizontal-card and selected-day layout remains available through Day detail or a day-card chevron. Use the room sprites here too, in place of generic room icons wherever artwork exists.

1. **Header and tabs.** Keep the calendar page title, then place Week and Month tabs immediately beneath it. Use the app's existing purple folder-shaped tabs. Open Week for a first-time calendar visit and remember subsequent view choices. Keep Doing Now in the existing app navigation rather than adding another calendar view. Keep the existing global navigation and omit the reference's tagline.
2. **Week navigation.** Put a left arrow, centred date range and right arrow above the cards, plus a small Today control. Show Monday–Sunday, for example `Mon 12 – Sun 18 Oct`. Arrows move exactly seven local calendar days in either direction, with no artificial limit on future weeks. Display both months or years when a week crosses those boundaries. Today returns to the current week and selects today.
3. **Seven day cards.** Each card shows weekday, date, room icon and room name, task count and, where available, estimated minutes. Use the real room colours already in the app. A selected card has a purple outline and a small pointer; today's marker remains distinct. Empty days say `Nothing scheduled`. Multiple rooms show a summary such as `Bathroom + 2 rooms`; never hide extra rooms, appointments or errands merely to match the sample's one-room cards. Event indicators and counts give access to all items in the day panel.
4. **Phone layout.** Use a single horizontally scrolling row of readable cards, approximately 100–120 px wide, with a hint of the next card visible. Larger screens show all seven together. Day-row scrolling only reveals cards in the current week; the explicit arrows change weeks. Do not shrink seven full room-name cards into an unreadable phone row. Bring the selected card into view without jumping the whole page.
5. **Selected-day panel.** Below the cards show the full date, room/session heading, room count and estimated time, then the day's tasks grouped by room. Show appointments and errands in their own groups within the same day. Selecting another card updates this panel. Keep Add to calendar; provide Add / move task through the existing day actions. Edit day opens explicit scheduling controls rather than automatically reallocating work.
6. **Task presentation.** Default to compact view using the app's shared task pattern: task names, subtask counter, First/Last controls and completion control. Tap expands subtasks; swipe right completes. Detailed view can show estimates and existing editing controls, using the reference's spacious rows. Keep completed tasks together at the bottom with Undo beside their names. Future projected repeats remain labelled as projected and cannot be completed as though they were active occurrences.
7. **Visual treatment.** In dark mode use near-black surfaces, subtle borders, rounded panels, purple highlights and room-coloured sprite frames. Keep text clear and high contrast without heavy glow. Maintain a legible light-mode equivalent. Use existing room sprites in both weekly presentations; do not create replacement artwork.
8. **Secondary sections.** Put room filtering and Recurring/Set day switches in a collapsed Calendar options section. Keep unscheduled errands accessible in a compact expandable section. Add the reference's Planning settings and Upcoming whole-house sessions only when their underlying behaviour and data are supported; do not display decorative controls that do nothing.

## Navigation and selection behaviour

- On entering a week, select today if it is in that week; otherwise select the same weekday as the previous selection, or Monday when there is no selection.
- Selection must always belong to the displayed seven-day range. The current renderer validates selection by month, which is insufficient for the new weekly day panel.
- Week arrows update both the visible cards and the selected-day panel. Merely browsing dates must not change task schedules or create future task records.
- Switching Month/Week retains the selected date and shows the matching period. Preserve monthly navigation and the monthly agenda.
- Generate future recurring previews from existing repeat rules. Clearly distinguish projected entries from explicitly scheduled occurrences.
- Preserve existing room moves and Undo. Offer an explicit Move control as a touch/keyboard alternative to dragging; avoid conflicts between horizontal card scrolling and dragging room chips. Viewing a day must not open a scheduling dialog automatically.
- Use labelled arrow buttons (`Previous week`, `Next week`), visible focus states, keyboard access and touch targets of at least 44 px. Announce week changes without announcing the entire task list again.

## Time totals and optional planning features

The reference contains features that are not established by the current calendar: a daily maximum, an accessibility time multiplier, one-room-per-day planning and whole-house exceptions. Treat these as a second phase, not prerequisites for the visual redesign.

- First phase: use existing task `estimatedMinutes`. Count each task once, without adding both a parent estimate and the same children's estimates. Show `Time not set` when no estimates exist; show a known subtotal plus an unestimated-task count for partial estimates.
- If a daily limit is added later, label bars as planned workload against that limit, not completion progress. Show over-limit text; never silently truncate the reported total or move tasks.
- If a multiplier is added later, apply it to displayed/planned estimates once, keep the saved base estimates intact and clearly label adjusted times. Use one shared calculation for task rows, room totals, day totals and bars.
- One-room-per-day and whole-house exceptions need a separate scheduling proposal. Preserve existing dates until Kayleigh explicitly applies a preview; offer Undo. Existing multi-room days remain visible.
- Identify whole-house sessions through an explicit existing or agreed grouping mechanism, not title matching. Show genuine upcoming sessions across the displayed and following weeks; omit the section if none are available.
- Do not copy the sample's numeric totals. Its task rows and header are not internally consistent; actual totals must be calculated from real data.

## Implementation sequence for a future build

1. Verify and replace the rolling backup before editing any app files. Inspect the working tree and preserve unrelated unfinished changes.
2. Update only the household calendar shell in `1-app/index.html` and its scoped styles in `1-app/house-calendar.css`. Add Week/Month tabs, the Overview / Day detail control, shared week toolbar, stacked sprite overview cards and day-detail card/panel structure.
3. Extend navigation in `1-app/app.js` and rendering in `1-app/house-calendar.js`, reusing local date helpers in `1-app/calendar.js`. Fix weekly selection containment and make card selection separate from day editing.
4. Reuse recurrence projection, room colours, existing task actions, appointment/errand support and estimate data. Keep the shared calendar's room scheduling, manual schedule and Task Data consumers working; scope the new household presentation so those consumers do not acquire unintended behaviour.
5. Add focused checks in `3-tests/` for week movement, selection, date boundaries, projections and preserved actions. Review phone and desktop layouts in light/dark mode and compact/detailed view.
6. Update release/cache references as required, run the relevant tests and build, then commit only the requested changes, push to the deployment branch and verify the GitHub Pages deployment. Do not publish unrelated local changes.
7. Consider optional planning settings and whole-house summaries in a separate agreed phase.

## Checklist

Planning completed:

- [x] Read repository instructions and layout/navigation rules.
- [x] Inspect current weekly rendering and existing arrow navigation.
- [x] Define the layout, phone adaptation and selected-day behaviour.
- [x] Add a default summary-only weekly overview based on the second reference.
- [x] Specify existing room sprites for both weekly presentations.
- [x] Include previous/following-week arrows and Today.
- [x] Separate visual changes from new scheduling features.
- [x] Preserve personal data, task controls and other calendar uses.
- [x] Verify the rolling source backup before saving this file.
- [x] Save the design plan and next-agent handoff here.

Future implementation acceptance:

- [ ] Week/Month tabs follow the app's established tab style.
- [ ] Week opens in Overview, with seven stacked sprite cards and no task breakdown.
- [ ] Sprite thumbnails render a single correct frame with an accessible room label and missing-image fallback.
- [ ] Overview / Day detail switches preserve week/date; opening a day and returning restores overview position.
- [ ] Previous/next arrows move seven days across month/year boundaries and daylight-saving changes.
- [ ] Today selects today; selection always stays within the displayed week.
- [ ] Seven cards remain readable on a narrow phone; the whole page has no horizontal overflow.
- [ ] Selecting a card shows only that day's full agenda, including multiple rooms and household events.
- [ ] Future recurrences are visible as projections; browsing creates or changes no task records.
- [ ] Compact/detailed tasks, subtasks, completion, Undo and explicit schedule edits behave correctly.
- [ ] Room moves and Undo still work, including touch and keyboard alternatives.
- [ ] Unknown estimates are clear; all displayed known totals agree and do not double count.
- [ ] Month, room calendars, manual scheduling and Task Data calendars retain their functions.
- [ ] Relevant tests and build pass; phone/desktop visual review passes.
- [ ] Requested app changes are published and the GitHub Pages deployment is verified.

## Next-agent handoff

Original planning handoff (superseded by the authorised implementation scope below): this plan incorporated Kayleigh's second reference. Overview is now the default weekly presentation: seven stacked day cards, existing room sprites, no task breakdown. The first reference remains the Day detail presentation. No app files, personal schedules, navigation or deployment were changed. The source backup at `../backup/previous-version/` was verified before revising this plan, excluding Git and generated/downloaded folders.

There are pre-existing uncommitted app changes and several other plans in the working tree. Leave them intact and check their local-only instructions before committing anything in a future implementation. Do not treat this design document as authorization to implement or publish the redesign. Start from Kayleigh's next instruction, use this checklist, and keep optional planning features separate from the initial weekly redesign.

## Authorised implementation scope — 12 October

Kayleigh asked to create the calendars using both images, this plan and the supplied specification, with the images as the priority. She explicitly confirmed renaming the app to Tidy-ish. Implement both weekly presentations, month overview, sprite cards, planning settings (240-minute cap and 2x multiplier), safe suggested dates separate from due dates, manual overrides, room and explicit whole-house sessions, visible backlog/conflicts, and preserve existing completion/history/account behaviour. Publish after checks.

- [x] Build the visual calendar views and Tidy-ish identity.
- [x] Add tested planning and manual occurrence/session overrides.
- [x] Verify existing functions and responsive views.
- [ ] Publish and verify GitHub Pages.

## Implementation validation

236 unit tests passed and the build passed. Synthetic browser checks verified phone/desktop layouts, 320px light mode, all three calendar presentations, arrows/Today, manual moves and Undo, settings, whole-house partial completion, points and Undo. App files and tests are being published through signed-in Chrome because Git push credentials are unavailable. Deployment verification follows in the latest handoff.
