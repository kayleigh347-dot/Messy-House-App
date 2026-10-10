# GitHub Pages source of truth

This folder is the only working copy for files used by the GitHub Pages site.

- Make all changes intended for GitHub Pages in this repository.
- Keep files in the layout expected by `.github/workflows/pages.yml`: workflow files in `.github/workflows/`, app files in `1-app/`, shared images in `2-assets/` or the existing `part-*` asset folders, and tests in `3-tests/`.
- Do not edit or copy changes into similarly named upload, retry, dated output, preview, or backup folders as a second source. Those are snapshots, not the active GitHub version.
- When the same app file exists elsewhere in the workspace, use the copy in this repository for GitHub Pages work. Keep non-GitHub deployments and their source files separate unless the user asks to change them too.
- Before changing the folder layout, check the workflow and update it so GitHub Actions can still assemble, test, and deploy the site.

## Local rolling backup

Before editing this repository, save its current working files to `../backup/previous-version/`, excluding `.git` and generated or downloaded folders. Build the replacement backup in a temporary folder and verify it before removing the older backup.

Keep only that one previous-version backup. This repository remains the current app folder, and Git history provides access to older versions. Do not create numbered edit copies, retry copies, or another active source folder.
Add rolling backup rule