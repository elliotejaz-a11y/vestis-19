# Change Plan — Four Targeted Modifications

> Restore point: `git checkout pre-changes-backup`

---

## TASK 1 — Username Profanity Validation

### Files touched
- `supabase/functions/validate-username/index.ts` — NEW edge function
- `src/pages/Auth.tsx` — add profanity check into `checkUsername()` and `handleNext()` guard

### What changes
1. New edge function `validate-username` that:
   - Accepts `{ username: string }` POST body
   - Uses `npm:leo-profanity` (Deno npm compat) to check the username
   - Returns `{ valid: boolean, reason?: string }`
   - Handles leetspeak via leo-profanity's built-in detection
2. `checkUsername()` in Auth.tsx: after availability check passes, call validate-username edge function; if invalid, set `usernameAvailable` to `false` and show "This username isn't allowed. Please choose a different one."
3. `handleNext()` in Auth.tsx: add a guard that checks `usernameAllowed` state before proceeding
4. Server-side validation cannot be bypassed: even if the client check is skipped, the edge function is called during form submission

### What does NOT change
- Password / email validation logic
- Visual design of signup screen (only the error state text)
- Anything in Onboarding.tsx

### Rollback
`git revert` the commit for this task. Edge function won't be called if deleted/disabled.

---

## TASK 2 — Mandatory Profile Picture (No Defaults, No Skipping)

### Files touched
- `src/pages/Onboarding.tsx` — enforce real upload, remove preset option from step 0
- `src/components/EditProfileSheet.tsx` — remove entire avatar upload/change section + preset picker

### What changes
**Onboarding.tsx**:
- `step 0 valid` condition changes from `!!username && !!displayName` to also require `!!avatarUrl` (empty string = no real upload)
- Remove preset picker buttons from step 0 UI (presets are not a real photo)
- Add explanatory text: "A profile photo is required to continue"
- Disable Next button with explanation if no photo uploaded
- The `avatarPreset` state is preserved for non-step-0 purposes (body types etc.) but profile is saved with `avatar_preset: null` when `avatarUrl` is set

**EditProfileSheet.tsx**:
- Remove the entire avatar section: the `div` containing drag-to-reposition, upload button, "Change photo"/"Upload photo" link, and preset picker
- The avatar is displayed as read-only in the sheet (just display, no editing)
- Remove unused imports: `Camera`, `Move`, `resizeAvatarBlob`, `ImageCropEditor`, drag state handlers
- Save function: remove `avatar_url`, `avatar_preset`, `avatar_position` from the update payload (never change them post-signup)

### What does NOT change
- How avatars are displayed elsewhere (UserAvatar component unchanged)
- Any other field in EditProfileSheet (display name, username, bio, currency)
- The `handleAvatarUpload` function in Onboarding is unchanged

### Rollback
`git revert` the commit for this task.

---

## TASK 3 — Discover Tab: Hide Users Without Profile Pictures

### Files touched
- `src/pages/SocialFeed.tsx` — modify the Supabase query in `handleSearch`

### What changes
The query in `handleSearch()` gets two additional filters applied **before** the response:
```sql
AND avatar_url IS NOT NULL
AND avatar_url != ''
```
This is a Supabase filter: `.not("avatar_url", "is", null).neq("avatar_url", "")`

The existing client-side filter (removing "user" display names with no avatar) is kept as a secondary guard but the database-level filter is the source of truth.

### What does NOT change
- Layout, sorting, or any other discover logic
- Feed tab, posts display, or any other part of SocialFeed
- Friends.tsx search (separate page, not in scope)

### Rollback
`git revert` the commit for this task.

---

## TASK 4 — Remove Stories Feature Entirely

### Files to DELETE
- `src/components/StoryRing.tsx` — only used in Profile.tsx
- `src/components/StoryViewer.tsx` — only used in Profile.tsx
- `src/components/StoryCreatorSheet.tsx` — only used in Profile.tsx
- `src/components/MusicPickerSheet.tsx` — only used by StoryCreatorSheet
- `src/hooks/useStories.ts` — only consumed by Profile.tsx
- `supabase/functions/expire-stories/index.ts` — stories-only cron function
- `supabase/functions/music-search/index.ts` — only called by StoryCreatorSheet

### Files to MODIFY
- `src/pages/Profile.tsx`:
  - Remove imports: `StoryRing`, `StoryViewer`, `StoryCreatorSheet`, `useStories`
  - Remove state: `storyViewerOpen`, `storyCreatorOpen`
  - Remove destructured values from `useStories()` call (entire line)
  - Replace `<StoryRing>...</StoryRing>` with a plain `<button onClick={() => setAvatarZoomOpen(true)}>` wrapper (preserving avatar zoom behavior)
  - Remove `<StoryViewer>` and `<StoryCreatorSheet>` from the JSX
  - Import `Lock` icon is already there — no new icons needed
- `src/components/CreatePostSheet.tsx`:
  - Remove `type: "post" | "story"` prop — simplify to post-only
  - Remove story-specific conditional text (e.g., "Add story photo")
  - All callers of CreatePostSheet pass `type="post"` currently, so removing the prop is safe

### What does NOT change
- `src/integrations/supabase/types.ts` — DB types are auto-generated, do NOT touch
- `supabase/migrations/` — do NOT drop story tables (irreversible DB operation outside scope)
- `src/components/FeedSkeleton.tsx` and other files that merely mention "story" in comments
- useSocial.ts and useWardrobe.ts — grep showed "story" only in comments/test files

### Rollback
`git revert` the commit. Deleted files will be restored. No DB changes were made.

---

## Execution Order
1. Task 4 (Stories removal — reduces noise in Profile.tsx before touching it)
2. Task 1 (Username profanity — isolated, touches Auth.tsx only)
3. Task 3 (Discover filter — one-liner query change)
4. Task 2 (Mandatory profile pic — most complex, touches Onboarding + EditProfileSheet)
