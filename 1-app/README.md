# Mission Control
A mobile-first house task organiser with room creatures, recurring tasks, household sharing, offline storage and Supabase syncing.

## Development
Use Node.js 22, run `npm ci`, `npm test`, then `npm run build`. Serve `dist` with a static HTTP server. Only the build output should be published.

## GitHub Pages
The Pages workflow tests and builds on every push to `main`, then deploys `dist`. In repository Settings → Pages choose GitHub Actions.
Expected URL: https://kayleigh347-dot.github.io/Messy-House-App/

## Supabase authentication and syncing
The browser uses the existing Supabase project and its public publishable key. This key is designed for browser use; database access must remain protected by row-level security. Never put a service-role key in browser code.
In Supabase → Authentication → URL Configuration, **add** `https://kayleigh347-dot.github.io/Messy-House-App/` to Redirect URLs, retaining the existing Netlify URLs and Site URL. Email sign-in requests already redirect to the current site's full path.
Sign in on Pages with the same account and select the same shared house. Browser sessions, local-only tasks and installed Home Screen apps are separate for each site. Export unsynced local data before moving between sites.

## Netlify compatibility
Netlify remains independent. `netlify.toml` and the scheduled push function are retained unchanged. GitHub Pages serves static files and cannot execute `netlify/functions/send-push.js`, its schedule, or Netlify custom response headers. The existing Netlify sender can continue delivering subscriptions stored in the same Supabase database.
For push on Pages, set GitHub repository **variable** `VAPID_PUBLIC_KEY` to the same public key used by Netlify. Keep the private VAPID key and Supabase service-role key only on the existing server. Enable notifications separately on the new site. Without the public key, Pages explains that external notifications need server setup.
The current calendar is an internal house calendar. The excluded Google OAuth secret and unused calendar-config file are not required by the app.

## Private files
Personal backups, OAuth secrets, environment files, local Netlify metadata, development outputs and historical private notes are excluded from this repository. Use an explicit reviewed file list for future uploads; never upload the original folder wholesale.

## Acceptance check
Before changing any Netlify arrangement, check Pages on mobile, sign in through its email link, confirm the same tasks/house appear, and verify a reversible task edit syncs across both sites. Also test installation/offline use and notifications if configured. Do not rerun database setup scripts for this hosting change.
