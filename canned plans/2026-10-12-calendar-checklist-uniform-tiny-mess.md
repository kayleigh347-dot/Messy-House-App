# Calendar checklist, uniform handoff and tiny mess

Requested 12 October 2026. Implement in the active GitHub Pages repository and publish after checks.

- [x] Add Tiny (+1% mess) alongside existing task mess-impact options. Keep the contribution at 1%, including overdue tasks; preserve calibration, completion and Undo.
- [x] Retire dye removal and put-away stages in both uniform colour cycles. Preserve completion history, other laundry work and saved progress.
- [x] Show “Remember to stretch out on the rail” whenever either colour's hanging stage is active.
- [x] When both colours are hung, hand the put-away work to a regular laundry load without inventing wash/hang points or overwriting another load. Prevent duplicate handoffs and guard Undo after later load progress.
- [x] Streamline Calendar only: weekly sprite strip, one selected-day checklist, automatic durations, and one top Edit button that lets Kayleigh choose a task to edit. Remove per-task edit/reorder/time controls from this page. Keep Overview and Month available.
- [x] Calculate estimates automatically from saved estimates, reusable templates and labelled default cleaning estimates. Edit base times only in More → Task timing; remove time fields from general task editing.
- [x] Verify dates, settings, completion, points, history, account merging, uniform handoff and tiny-mess arithmetic with synthetic tests and phone layouts.
- [ ] Commit only requested app/tests/plan changes, publish through GitHub and verify Pages deployment.

Current source includes tested calendar refinements from the ongoing release. Carry them into this release; keep unrelated plans and all personal backups local. No board reset, backup import or history replacement.

Validation: 245 unit tests passed; build passed (175 runtime files). Synthetic phone/desktop checks passed: calendar-only checkboxes, single Edit chooser, no time input in general task editing, More → Task timing edits, both uniform reminders and the automatic put-away handoff, points/Undo, navigation and narrow-screen overflow. Publication verification pending.
