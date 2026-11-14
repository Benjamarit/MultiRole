# Criteria batch saving, podium ties and Dashboard

## Behavior

- Criteria are staged locally: add, edit, remove and reorder without individual writes. The row action adds/updates the staged list. **Save all criteria** sends one request and does not activate scoring.
- The save bar shows unsaved changes, a saving indicator and failure feedback. Failed saves retain local input. Leaving with unsaved input requires confirmation; discarding restores the latest cached server list.
- Podium ties show comma-separated team names and one shared average. Group names remain for single-team ranks. Each team's judge completion remains visible separately. Dense ranks remain `1, 1, 2`.
- The general Workspace page is now **แดชบอร์ด / Dashboard**, implemented in `src/pages/Dashboard.jsx`. `/workspace` remains supported for existing links.

## Batch API

`PUT /api/competitions/{competitionId}/criteria/batch`

Body: `{ criteria: [...], expectedCriteria: [...] }`. Entries contain `criterionId`, `title`, `description`, `scoringType`, `maxScore`, `weightPercentage`, `displayOrder`. New staged entries send a null ID. `expectedCriteria` is the saved baseline when editing began.

The server verifies project administration rights, locks the competition, checks setup is editable and compares the full saved baseline. A stale baseline returns 409 instead of overwriting another session's changes. Validation, insertion, update, deletion and ordering are atomic. Existing IDs are retained, ordering is assigned from the array, total weight may not exceed 100%. Activation separately requires complete weights.

Response: the complete saved criteria list with server-generated IDs. The frontend updates its cache from this response, avoiding an extra project reload.

## Deployment and acceptance

Restart/redeploy the backend before deploying the frontend so the batch endpoint is available. No additional database migration is introduced by this change (the existing `display_order` migration still applies).

1. Add two criteria, edit one, reorder and remove another: no writes until Save all criteria. Reload after saving to confirm persistence.
2. Save an incomplete setup below 100%; scoring remains closed. Complete weights before opening scoring.
3. Change criteria in another session before saving: receive a conflict, preserve local input and discard to review the latest saved list.
4. Reject a malformed or overweight batch without persisting any part. Reject all changes after scoring opens.
5. Verify tied podium names and shared score; verify a single-team rank retains its group.
