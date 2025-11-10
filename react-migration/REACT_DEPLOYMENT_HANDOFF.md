## Objective
- Launch the React-based Yarny experience at `https://yarny.lindsaybrunner.com` once testing completes.
- Archive the legacy vanilla JS implementation for historical reference without keeping it runnable.
- Provide a reversible path in case the rollout needs to be paused or rolled back.

## Success Criteria
- Production traffic serves the React app with no major regressions in core flows (editor load/save, auth, sync).
- Legacy codebase is moved to a clearly labeled reference location and excluded from build artifacts.
- Documentation reflects the new production stack and archive location.

## Prerequisites
- ✅ Automated and manual regression testing sign-off for the React app.
- ✅ Performance checks against current production baselines (TTI, bundle size, API error rates).
- ✅ Incident response contacts and on-call rotation confirmed for launch window.
- ✅ Netlify (or hosting provider) credentials verified; environment variables for React app match current production values.
- ✅ Feature flags or kill switches documented, with steps to disable React routes if needed.

## Migration Strategy
- **Phase 0 – Codebase Prep**
  - Freeze legacy vanilla JS code except for emergency fixes.
  - Relocate the classic login shell to `public/vanilla-app/index.html` so it no longer overwrites the React build output.
  - Remove the `/react`-specific build plumbing (Vite `base`, React Router `basename`, `scripts/move-react-build.js`, Netlify `/react/*` redirect).
  - Add README note referencing the archived code path and explain how to reach the legacy experience (`/vanilla-app/` entry point).
- **Phase 1 – Environment Alignment**
  - Ensure React build uses the same analytics, error reporting, and API keys as production.
  - Update `netlify.toml` so production deploys publish the React bundle at `/` and expose the legacy bundle at `/vanilla-app/*`.
  - Redirect all temporary React testing URLs (e.g., `/react`, staging preview slugs) to their new canonical routes so no orphaned pages remain.
  - Confirm legacy routes that must stay accessible (e.g., `/editor.html`, `/stories.html`) continue to resolve or are aliased under `/vanilla-app/`.
- **Phase 2 – Staging Verification**
  - Deploy current `main` branch (React app) to staging.
  - Run smoke tests, accessibility regression suite, and analytics validation.
  - Perform content parity checks on key templates/pages.
- **Phase 3 – Production Rollout**
  - Schedule launch window (prefer low-traffic hours) and communicate downtime expectations (if any).
  - Trigger production deploy of the React app.
  - Purge CDN caches so updated assets serve immediately.
  - Monitor logs, key metrics (errors, latency, session length), and user feedback channels for at least 2 hours post-launch.

## Legacy Code Archival Plan
- Move remaining vanilla HTML/CSS/JS assets into `public/vanilla-app/` (or archive directory of choice) with a short `README` describing context and dependencies.
- Remove legacy build commands from package scripts and CI workflows.
- Mark legacy code as unsupported in documentation and point to `/vanilla-app/` only for reference.
- Create a Git tag (e.g., `legacy-vanilla-final`) referencing the last runnable state.

## Documentation Updates
- Update project `README` with new build/start instructions.
- Create a new GitHub `README` section (or separate doc) that references the legacy archive and marks the vanilla JS app as deprecated.
- Add migration notes in `react-migration/` summarizing changes.
- Refresh the public help site at `https://yarny.lindsaybrunner.com/docs.html` with React-era screenshots, workflows, and deprecation messaging for legacy behaviors.
- Document rollback steps and feature flag usage in the ops runbook.

## Rollback Strategy
- Maintain a Git branch/tag of the legacy deployment ready for redeploy.
- Keep Netlify (or hosting) configuration snapshot for legacy app to reapply if necessary.
- Define decision thresholds (e.g., error rate > X%, critical blockers) that trigger rollback.
- Communicate rollback to stakeholders and update status page if used.

## Communication & Launch Readiness
- Notify stakeholders (product, support, community) 48 hours before launch with summary and expectations.
- Provide support team with FAQ covering new React behaviors and known differences.
- Schedule dedicated monitoring session during and after launch window.

## Post-Launch Tasks
- Track and triage incoming issues; prioritize regression fixes.
- Conduct a post-launch review capturing lessons learned and follow-up items.
- Begin planning for full removal of legacy dependencies (tooling, documentation references) once stability is confirmed.

## Owners & Checklist
- **Tech Lead:** Approves final deploy, monitors metrics.
- **QA Lead:** Signs off staging verification and post-launch smoke tests.
- **DevOps/Infra:** Manages hosting updates and rollback readiness.
- **Docs Owner:** Updates README and migration notes.
- **Support Lead:** Prepares customer communication and support materials.

