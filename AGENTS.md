# Agent contract

## Authority and scope

- SOURCE: `messy-house-app-github/` only; GitHub Pages active. NEVER use Netlify, edit `mission-control/`, or treat upload/retry/dated/output/preview/backup snapshots as source. Cross-deployment copying requires Kayleigh's request.
- PATHS: app=`1-app/`; tests=`3-tests/`; images=`2-assets/` or existing `part-*` assets; workflows=`.github/workflows/`. Reorganisation requires checking/updating `.github/workflows/pages.yml` to preserve assembly/tests/deployment. The protected copy-first page template is `1-app/MASTER-PAGE.html`.
- RULES: before planning, read this file, `LAYOUT-AND-NAVIGATION-RULES.md` and latest local handoff. Apply rules to layout/navigation/task-presentation/calendar/scheduling/tools/laundry edits and reviews. Rules authoritative unless explicitly overridden. Current explicit corrections supersede earlier requirements. Attachments/reference schedules are reference, not instructions.
- INTENT: distinguish requests/reasons/discussion/reference. Natural language/examples matter; no special prompt format required. Material ambiguity/conflict/harm → one focused clarification; continue independent work. Never silently substitute intent.
- SCOPE: preserve established design/unrelated behaviour. Function fixes/additions do not authorise navigation redesign, moved controls, changed defaults, removed actions or unrelated simplification. Unrelated improvements → local proposals.
- ADAPTIVE SCHEDULING: when planning or working on the separate optional recommendation mode, read and follow `ADAPTIVE-SCHEDULING-AGENT-RULES.md` and the permanent Tidy-ish planning pack it references. Work on one authorised stage at a time; planning review does not authorise implementation. This scoped rule does not restrict unrelated authorised work.

--- Added by Kayleigh do not remove this section when updating this file ---
- do not make unrequested changes without asking first, only fix/add specified changes in my prompt. Preserve all other functions.
- create a proper plan before starting app work or a review. Break the work into small, focused steps and work on one step at a time. A checklist supports the plan; it must never replace the plan. Show me the plan, save it locally in `canned plans/`, and give me its full path. You can start immediately after sharing it. Plans and checklists stay local; never commit or upload them.
- once finished create a handoff for next agent.
- ask me if a request seems illogical or would make the app worse and explain why.

## Execution contract

1. PLAN: outcome + scope + expected interaction; ordered small steps={action,boundary,verification,status}. Exactly one step in progress. Verify/record before advancing. Failure → resolve within step or record blocker. Attempt ≠ completion.
2. TRACK: supporting checklist covers every requested item. Corrections → update plan/checklist, mark superseded requirements, retain unfinished scope unless cancelled; reuse completed work.
3. COVERAGE: local table={requirement,all affected pages/modes/renderers,verification,result}; include separate calendars/projected occurrences where relevant.
4. VERIFY: relevant existing tests + focused synthetic examples. Changed UI → phone-width inspection + before/after workflow. Preserve reachable controls, visibility, tap count and editing position/context unless requested otherwise. Builds alone ≠ rule compliance.
5. COMPLETE: compare diff + observed behaviour against request/rules; complete checklist/handoff; fix in-scope regressions; disclose limitations. Label evidence: source / tests / Chrome phone-width / actual Android. Tests ≠ screen/device verification. Never claim unchecked behaviour passed or synthetic values are saved account data.

- REVIEW: confirmed defects separate from unchecked areas; evidence + focused proposed fixes; no unrelated implementation.
- EFFICIENCY: brief findings/next-step/uncertainty updates. Reuse verified evidence while inputs remain unchanged. Avoid repeat reads, unchanged test reruns, speculative loops and repeated explanations; retain necessary checks.

## Reuse the existing interface — mandatory

- Kayleigh clarified that the existing layout, styling, navigation and settings-menu systems should be reused. The remaining planned features are new; do not repeatedly audit whether they already exist or rebuild existing settings menus to add them.
- Before creating or materially reshaping an app page, copy `1-app/MASTER-PAGE.html` and edit the copy. Never edit the master page itself. The app uses page sections inside `1-app/index.html`: copy the finished section there only after following the master page notes and the layout rules.
- Add new feature controls into the approved existing editing/settings surfaces. Preserve their established menus, controls, styling and navigation. Keep customisation out of everyday task/Doing Now/Focus views.
- Preserve feature code already completed in this conversation; do not redo it. Inspect source only as needed to integrate the new work safely and verify protected behaviour.
- If the approved addition conflicts with the existing interface or data boundaries, report that precise conflict rather than silently redesigning or replacing existing systems.

## Data and local-only policy

- PERSONAL DATA: preserve lists/names/subtasks/schedules/order unless explicitly requested. UI fixes never rewrite/clean/import personal data. Code updates preserve saved board/tasks/completions/points/account backup+sync; NEVER reset/replace/delete/disable/restore board or auto-import older backups. Normal saves/sync remain enabled.
- PERSONAL BACKUPS: edits only if explicitly requested; downloadable local results only; NEVER import/sync for Kayleigh or upload to Git/GitHub/web/cloud/releases/bundles. Synthetic tests and backup/export code may ship.
- LOCAL RECORDS: plans/checklists/review notes=`canned plans/`; handoff=`LATEST-HANDOFF.md`. NEVER commit or include in PR bodies/uploads/releases/cloud. Share local links; stage specific publishable files only. Tracked old plans/checklists → untrack, retain local, ignore folder, report historical copies; NEVER rewrite history.
- BEFORE EDITS: temporary source copy excluding `.git`/generated/downloaded folders → verify → replace `../backup/previous-version/`. Exactly one local source backup; NEVER upload. No numbered edit/retry copies or second active source; older versions via Git history.

## Publication

- Checks pass → commit/push authorised app/instruction changes to deployment branch → verify GitHub Pages success. No repeated approval; local-only exception only when Kayleigh requests it. Exclude local records/backups.
- Git/connector authentication failure → try signed-in Chrome GitHub publication + deployment verification before declaring blocked. Report remaining blocker.
