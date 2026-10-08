# Mission Control

[Open the app](https://kayleigh347-dot.github.io/Messy-House-App/)

A mobile-first house task organiser with room creatures, recurring jobs, household sharing, local storage and Supabase syncing.

## Using the app
Open the site, choose Settings and sign in with the same email used on the existing Netlify app. Select the same house if you share one. Browser sessions and local-only data are separate on each site; unsynced local tasks must be exported and imported separately. On a phone you can use Add to Home Screen to install this site as a separate app.

## Automatic deployment
Every push to main runs the tests, builds the static app and deploys GitHub Pages. The workflow at .github/workflows/pages.yml assembles 1-app, 2-assets/assets, part-1 through part-7 image folders and 3-tests/tests into a temporary _app directory. Keep this layout when updating files. The build publishes only its explicit runtime file list, not the repository contents.

For local development, assemble those folders as shown in the workflow, then run npm ci, npm test and npm run build inside _app. Use Node.js 22 and serve _app/dist with a static HTTP server.

## Supabase
The app continues using the existing Supabase project and browser-safe publishable key. GitHub Pages has been added to the authentication redirect allowlist; the Netlify Site URL and existing redirects remain unchanged. Database access continues to depend on authentication and row-level security. Do not rerun database setup scripts for this hosting change.

## Netlify remains active
The existing Netlify deployment, scheduled notification function, configuration and private server credentials are unchanged. GitHub Pages cannot run Netlify functions, scheduled jobs or Netlify response-header rules. The existing Netlify sender can deliver notifications to both sites through their shared Supabase database. The Pages build uses the same public notification key; a repository variable VAPID_PUBLIC_KEY can override it. Enable notifications separately on each site and installed app.

## Private files
The reviewed upload excludes personal task backups, OAuth secrets, environment files, local Netlify account metadata and private development notes. Only public browser keys are included. Never commit Supabase service-role keys, VAPID private keys or OAuth client secrets. The root .gitignore protects normal Git uploads; manual browser uploads still require reviewing the selected files.

## Verification
All 196 uploaded app files matched the reviewed copies. The assembled app passes 127 tests and its build. The Pages deployment succeeded, all 147 required asset URLs responded successfully, mobile room navigation was checked and anonymous board access was denied. Complete the final account check by signing in, selecting your house and confirming that a reversible task edit syncs between Pages and Netlify. Notification delivery and offline installation require checks on the intended device. Keep Netlify active while completing those checks.
