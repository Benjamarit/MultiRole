# Scoring update — 9 November 2026

## Behavior

- Criteria append in creation order. Up/down buttons save a complete criterion-ID permutation; order is shared across evaluation pages and exports. Reordering is locked after scoring first opens, using the existing backend policy.
- Existing criteria did not store creation time/order. Their historical insertion order cannot be recovered. The migration provides a deterministic UUID baseline; owners can adjust editable projects.
- Only teams with at least one eligible SUBMITTED evaluation enter rankings and exports. Drafts and unscored teams are excluded. A submitted zero is a valid ranked result.
- Rankings compare the two-decimal average shown/exported. Equal scores share dense rank: 1, 1, 2 (updated 10 November). Every tied team appears in its corresponding podium group.
- Matrix “Save all drafts” captures all assigned teams across every group/filter, skips entirely empty teams, and never overwrites published evaluations. Incomplete drafts and feedback without a score are allowed. Each team commits independently; failed teams retain their inputs and show a failure notification.
- Per-team save remains scoped to that team. Unstarted evaluations no longer display a saved-draft badge; unsaved matrix input and confirmed drafts have distinct labels.

## API additions

- `PUT /api/competitions/{competitionId}/criteria/order` — `{ "criterionIds": ["uuid", "uuid"] }`; admin only, complete permutation, setup lock enforced.
- `POST /api/evaluations/draft-batch` — same project/team/score payload as submit-batch; per-team outcomes `DRAFT_SAVED`, `ALREADY_SUBMITTED`, `FAILED`. Validates membership, assignment, score ranges, active status and deadline on the server.

## Deployment

1. Existing production databases using `DB_DDL_AUTO=validate`: run `backend/scripts/2026-11-09-criteria-order.sql` once before the new backend starts. Check whether `criteria.display_order` already exists before running ALTER. Update/create profiles add the nullable column automatically.
2. Deploy the backend and then the frontend. Both changed; deploying only the frontend leaves new order/draft APIs unavailable.
3. No production database has been changed by this local code update.

## Manual acceptance checks

1. Add criteria Z, A, M. Reload: preserve that sequence. Move M up and reload. Check single/matrix evaluation ordering. Opening scoring must disable/reject further reorders.
2. With two teams in different groups, score both locally and save only team A. Team B must still show unsaved; navigating away/reloading must load only A's saved draft.
3. Hide team B using a filter; click Save all drafts. Reload: both assigned teams' input is saved. Empty teams are not created as drafts; submitted teams are unchanged.
4. Open rankings with no evaluations, then drafts only: no podium or ranked team rows. Submit a zero: it becomes a legitimate ranked result.
5. Submit two averages of 90 and one of 80: ranks are 1, 1, 2 in the table, podium and both CSV exports.
