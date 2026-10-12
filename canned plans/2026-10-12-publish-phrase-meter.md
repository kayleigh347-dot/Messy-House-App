# Publish phrase meter and protect personal backups

- [x] Read rules, inspect current edits and verify rolling app-source backup.
- [x] Investigate the bedroom 100% reading without modifying personal data.
- [x] Preserve latest phrase/colour choices and prepare meter for publication.
- [x] Add unconditional personal-backup no-upload rules.
- [x] Run unit tests, meter browser checks and build.
- [x] Commit only reviewed app, tests, rules and this checklist; publish main.
- [x] Verify GitHub Pages deployment and live assets.
- [x] Save next-agent handoff.

No personal backup is to be uploaded, imported or synced. The user requests review of calculation and publication of the phrase meter; do not silently recalibrate physical room cleanliness.

Added user scope: room mess slider with weighted recalibration, no mess/points for organising parents, subtasks counted like regular tasks, due-only room Tasks list, and Doing Now grouping.

Validation: 228 unit tests passed; mobile synthetic browser checks verified a 20% calibration reducing to 13.3%, 6.7%, then 0% after three leaf completions; parent auto-completed with no extra point. Future normal/recurring tasks were absent from the main room list; Doing Now cards had no Other tasks heading. Existing completion history retained.

Personal-backup audit: recursive trees of all six GitHub branches contained no personal backup/recovery files. Available Git history contained only package JSON files, no personal backup JSON/ZIP paths. No deletion needed.

Account-data rule: app updates preserve the existing saved account board, task progress, points and normal backup/sync. Personal backup files remain prohibited from upload; account sync is not disabled.

App release d3be838 deployed successfully in GitHub Pages run https://github.com/kayleigh347-dot/Messy-House-App/actions/runs/38257873609 . Account/backup rules committed as 35a9abe. Publication used signed-in Chrome after Git credentials and connector writes were unavailable. Final deployment and live-file verification follow the checklist upload.

Live verification: all nine changed app files exactly match the tested local source, checked by SHA-256. No personal data imported, restored or uploaded. Account backup/sync code left in place. Handoff saved locally in LATEST-HANDOFF.md.
