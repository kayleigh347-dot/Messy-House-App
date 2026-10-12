# GitHub Pages source of truth

## Current project focus

Until Kayleigh says otherwise, this repository is the only active working area. Netlify credits are exhausted, so do not use Netlify or edit the separate mission-control/ working area. Make requested app changes here for GitHub Pages.


This folder is the only working copy for files used by the GitHub Pages site.

- Make all changes intended for GitHub Pages in this repository.
- Before changing app layout, navigation, page headers, tabs, or task-list presentation, read `LAYOUT-AND-NAVIGATION-RULES.md` and follow its standing defaults unless Kayleigh explicitly says otherwise.
- Keep files in the layout expected by `.github/workflows/pages.yml`: workflow files in `.github/workflows/`, app files in `1-app/`, shared images in `2-assets/` or the existing `part-*` asset folders, and tests in `3-tests/`.
- Do not edit or copy changes into similarly named upload, retry, dated output, preview, or backup folders as a second source. Those are snapshots, not the active GitHub version.
- When the same app file exists elsewhere in the workspace, use the copy in this repository for GitHub Pages work. Keep non-GitHub deployments and their source files separate unless the user asks to change them too.
- Before changing the folder layout, check the workflow and update it so GitHub Actions can still assemble, test, and deploy the site.

## Publishing rule

Always publish completed changes to the active GitHub Pages site after the relevant checks pass. Commit and push the changes in this repository to its deployment branch, then verify that the GitHub Pages deployment succeeds. Do not stop at local changes or ask for publication confirmation unless Kayleigh explicitly requests local-only work or says not to publish. If publication is blocked, report the blocker clearly.

Chrome is signed in to GitHub. If local Git credentials or the GitHub connector cannot publish, use the signed-in Chrome session to publish through GitHub’s website and verify the GitHub Pages deployment. Do not treat a Git or connector authentication failure as the final publishing blocker before trying Chrome.

## Local rolling backup

Before editing this repository, save its current working files to `../backup/previous-version/`, excluding `.git` and generated or downloaded folders. Build the replacement backup in a temporary folder and verify it before removing the older backup.

Keep only that one previous-version backup. This repository remains the current app folder, and Git history provides access to older versions. Do not create numbered edit copies, retry copies, or another active source folder.

--- Added by Kayleigh do not remove this section when updating this file ---
- do not make unrequested without asking first, only fix/add specified changes in my prompt. Preserve all other functions.
- create a plan and checklist before starting, to be sure everything asked for has been completed. Show me the plan, save them in there own folder canned plans (add folder path after you create it) you can start immediately after sharing it,
- once finished create a handoff for next agent.
- ask me if a request seems illogical or would make the app worse and explain why.

## Personal task lists and backups

- Preserve Kayleigh’s personal task lists, names, subtasks, schedules and ordering unless she explicitly asks to change them. App UI fixes must not rewrite, clean, replace or import her personal data.
- Do not edit her personal task-list backup files unless explicitly asked. This is separate from the required rolling app-source backup.
- If Kayleigh requests a backup edit and says not to upload it, return the edited backup as a downloadable file only. Do not upload, publish, import or sync it.
