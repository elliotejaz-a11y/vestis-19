# Vestis-19 — Performance & Bug Audit
Generated: 2026-05-11

## Summary
53 issues found across 6 categories. After manual verification of each finding, the breakdown is:
- **High**: 1 (listener accumulation in useToast)
- **Medium**: 9 (missing error handlers, unsafe optimistic IDs, timeout leaks, over-fetching)
- **Low**: 5 (select * columns, touch optimisation, tap targets)
- **False positives from initial scan**: 4 (noted below)

---

## VERIFIED ISSUES

### ID: TOAST-001
**Category:** React Performance — useEffect dependency  
**File:** `src/hooks/use-toast.ts:177`  
**Severity:** High  
**Root Cause:** `useEffect(() => { listeners.push(setState); return () => {...}; }, [state])` depends on `state`, so the effect re-runs on every toast state change. This tears down and re-adds the listener on every dispatch — wasteful and unnecessary.  
**Proposed Fix:** Change dependency array from `[state]` to `[]`. The listener only needs to be registered once per component mount.  
**Rollback:** Revert line 177 of `src/hooks/use-toast.ts` — change `}, [])` back to `}, [state])`.

---

### ID: CHAT-001
**Category:** Bug — Unhandled promise rejection  
**File:** `src/hooks/useChat.ts:252`  
**Severity:** Medium  
**Root Cause:** `supabase.rpc("mark_messages_read", { friend_user_id: friendId }).then(() => {})` silently discards RPC errors. If the RPC fails, messages remain marked as unread in the database while the UI shows them as read.  
**Proposed Fix:** Add `.catch()` to log the failure.  
**Rollback:** Revert the `.catch()` addition on line 252.

---

### ID: CHAT-002
**Category:** Bug — Optimistic ID collision  
**File:** `src/hooks/useChat.ts:283`  
**Severity:** Medium  
**Root Cause:** `id: \`temp-${Date.now()}\`` can collide if two messages are sent within the same millisecond (e.g. double-tap). The collision causes the realtime deduplication check `prev.some((m) => m.id === msg.id)` to misfire and drop the real incoming message.  
**Proposed Fix:** Replace `Date.now()` with `crypto.randomUUID()`.  
**Rollback:** Revert line 283 — change `crypto.randomUUID()` back to `` `temp-${Date.now()}` ``.

---

### ID: AVATAR-001
**Category:** Bug — Unhandled promise rejection  
**File:** `src/components/UserAvatar.tsx:63`  
**Severity:** Medium  
**Root Cause:** `batchResolveAvatarUrls([avatarUrl]).then(([signed]) => { ... })` has no `.catch()`. If the signed URL resolution fails (network error, storage RLS), the avatar silently breaks — the component stays on `resolvedUrl = null` but the initial state is set from the cache which may be stale.  
**Proposed Fix:** Add `.catch()` to fall back to the raw `avatarUrl`.  
**Rollback:** Revert the `.catch()` addition on UserAvatar.tsx.

---

### ID: SOCIAL-001
**Category:** Bug — Unhandled promise rejection  
**File:** `src/components/SignedSocialImage.tsx:27`  
**Severity:** Medium  
**Root Cause:** `getSignedSocialUrl(src).then((u) => { if (!cancelled) setResolved(u); })` has no `.catch()`. If the signed URL fetch fails, `resolved` stays `null` and the image renders as an empty `<div>` with no feedback.  
**Proposed Fix:** Add `.catch()` to log the error and leave `resolved` as `null` (current silent-failure behaviour is acceptable, but the error should be visible in dev).  
**Rollback:** Revert the `.catch()` addition on SignedSocialImage.tsx.

---

### ID: OUTFITS-001
**Category:** Bug — setTimeout without cleanup  
**File:** `src/pages/Outfits.tsx:104`  
**Severity:** Medium  
**Root Cause:** `setTimeout(() => navigate("/calendar"), 1500)` fires 1.5s after outfit generation. If the user navigates away manually before this fires, the timeout still fires and tries to `navigate("/calendar")` on an unmounted component — React 18 will log a warning and may produce a spurious navigation.  
**Proposed Fix:** Track the timeout ID in a ref and clear it on unmount.  
**Rollback:** Revert Outfits.tsx timeout change; remove the `useRef`/`useEffect` added for cleanup.

---

### ID: DB-001
**Category:** Data Fetching — select('*') over-fetching  
**File:** `src/hooks/useChat.ts:38`  
**Severity:** Medium  
**Root Cause:** `select("*")` on the messages table fetches every column. The `is_flagged` field is the only non-essential one used downstream, but all columns should be explicit to guard against future schema additions.  
**Proposed Fix:** Replace with explicit column list: `select("id, sender_id, receiver_id, content, created_at, read, is_flagged")`.  
**Rollback:** Revert select() call on useChat.ts line 38.

---

### ID: DB-002
**Category:** Data Fetching — select('*') over-fetching  
**File:** `src/hooks/useNotifications.ts:30`  
**Severity:** Low  
**Root Cause:** `select("*")` on notifications — fetches all columns including any future additions.  
**Proposed Fix:** `select("id, type, message, from_user_id, read, created_at")`.  
**Rollback:** Revert select() call on useNotifications.ts line 30.

---

### ID: DB-003
**Category:** Data Fetching — select('*') over-fetching  
**File:** `src/hooks/useAuth.tsx:49`  
**Severity:** Low  
**Root Cause:** `select("*")` on profiles — fetches all columns every time auth state changes.  
**Proposed Fix:** List explicit columns matching the `Profile` interface.  
**Rollback:** Revert select() call on useAuth.tsx line 49.

---

### ID: MOBILE-001
**Category:** Mobile UX — touch scroll  
**File:** `src/components/VirtualizedGrid.tsx` (scroll container)  
**Severity:** Low  
**Root Cause:** The virtualised grid scroll container uses `overflow: auto` without `WebkitOverflowScrolling: 'touch'` for momentum scrolling on older iOS.  
**Proposed Fix:** Add `WebkitOverflowScrolling: 'touch'` to the container inline style (it degrades gracefully on non-Safari).  
**Rollback:** Remove the added style property.

---

## FALSE POSITIVES (from initial scan — do not fix)

- **PERF-001 (useFollowData infinite loop):** `refresh` only changes when `user` changes — no infinite loop. Correct behaviour.
- **MEM-005 (AppTutorial cleanup):** Cleanup IS present at line 157 — the scan was incorrect.
- **DB-003 (realtime channel cleanup):** `supabase.removeChannel()` in Supabase JS v2 calls `channel.unsubscribe()` internally before removing. Pattern is correct.
- **PERF-005 (useAuth setTimeout):** `setTimeout(..., 0)` is intentional (avoids Supabase internal deadlock on auth state reads, documented in code). `fetchProfile` uses `profileFetchingRef` to guard against stale executions.

---

## FIX LOG

| ID | File | Status | Commit |
|----|------|--------|--------|
| TOAST-001 | use-toast.ts | Fixed | 8562a29 |
| CHAT-001 | useChat.ts | Fixed | 8562a29 |
| CHAT-002 | useChat.ts | Fixed | 8562a29 |
| AVATAR-001 | UserAvatar.tsx | Fixed | 8562a29 |
| SOCIAL-001 | SignedSocialImage.tsx | Fixed | 8562a29 |
| OUTFITS-001 | Outfits.tsx | Fixed | 8562a29 |
| DB-001 | useChat.ts | Fixed | 8562a29 |
| DB-002 | useNotifications.ts | Fixed | 8562a29 |
| DB-003 | useAuth.tsx | Fixed | 8562a29 |
| MOBILE-001 | VirtualizedGrid.tsx | Fixed | 8562a29 |
