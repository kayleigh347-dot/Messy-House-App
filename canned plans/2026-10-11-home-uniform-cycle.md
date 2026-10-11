# Active uniform cycle on homepage

- [x] Verify and replace the rolling backup before editing.
- [x] Show the due uniform cycle in the homepage Laundry section.
- [x] Keep both darks and whites washing/hanging steps visible with their completion status.
- [x] Reuse the existing cycle progress, points and Saturday schedule.
- [x] Verify it remains active after Saturday until completed, then disappears until next Saturday.
- [x] Test, publish and verify GitHub Pages.
- [x] Save the next-agent handoff.

## Handoff

The same active uniform cycle now renders in House Laundry and the dedicated Laundry page. Both darks and whites wash/hang steps remain visible with completion ticks, alongside the existing next-step action. This reuses uniformProgress/completeUniformStep, preserving saved progress, points and recurrence. No task data or schedules were replaced.

Validation: 207 tests pass; production build passes. Phone preview verified both colour groups, four step completions, reload persistence, one point per step and hiding after completion. The scheduling test confirms Friday hiding, Saturday activation, overdue Sunday continuation and next-Saturday reactivation. Published through signed-in Chrome; GitHub Pages run 38147800274 passed build, tests and deployment. Local runtime and test files match origin/main.

Homepage visibility specifically ends once both darks and whites stages are complete. Any remaining uniform care steps remain available in the dedicated Laundry page; this does not discard or complete them.
