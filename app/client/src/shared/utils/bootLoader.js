import { remindersDb }  from '../../db/remindersDb';
import { syncQueueDb }  from '../../db/syncQueueDb';
import { metaDb }       from '../../db/metaDb';
import { syncEngine }   from '../../sync/syncEngine';
import { useReminderStore } from '../../features/reminders/store/reminderStore';
import { useSyncStore }     from '../../store/syncStore';

/**
 * Runs all startup tasks while the splash screen is visible.
 * @param {function} onStep  - called with current step text
 * @param {string}   userId  - current user ID (for ownership checks)
 */
export async function runBoot(onStep, userId) {
  const results = {
    remindersLoaded: 0,
    pendingCount: 0,
    lastSyncAt: null,
    errors: [],
  };

  // ── Step 1: Load local reminders from IndexedDB ────────────
  onStep('step1');
  try {
    const localReminders = await remindersDb.getAll();
    const visible = localReminders.filter(r => !r.isDeleted);
    useReminderStore.getState().setReminders(visible);
    results.remindersLoaded = visible.length;
  } catch (e) {
    results.errors.push({ step: 1, message: e.message });
  }

  // ── Step 2: Sync queue + meta ──────────────────────────────
  onStep('step2');
  try {
    const [pendingCount, lastSyncAt] = await Promise.all([
      syncQueueDb.count(),
      metaDb.getLastSyncAt(),
    ]);
    useSyncStore.getState().setPendingCount(pendingCount);
    if (lastSyncAt) useSyncStore.getState().setLastSyncAt(lastSyncAt);
    results.pendingCount  = pendingCount;
    results.lastSyncAt    = lastSyncAt;
  } catch (e) {
    results.errors.push({ step: 2, message: e.message });
  }

  // ── Step 3: Start sync engine ──────────────────────────────
  onStep('step3');
  try {
    await syncEngine.init();
  } catch (e) {
    results.errors.push({ step: 3, message: e.message });
  }

  // ── Step 4: Verify account ownership in IndexedDB ─────────
  // If userId changed (different login) — clear stale local data
  onStep('step4');
  try {
    const storedUserId = await metaDb.get('userId');
    if (storedUserId && storedUserId !== userId) {
      // Different user — clear stale data from previous session
      await Promise.all([
        remindersDb.clear(),
        syncQueueDb.clear(),
      ]);
      useReminderStore.getState().setReminders([]);
      useSyncStore.getState().setPendingCount(0);
      results.remindersLoaded = 0;
    }
    // Save current userId for next check
    await metaDb.set('userId', userId);
  } catch (e) {
    results.errors.push({ step: 4, message: e.message });
  }

  onStep('done');
  return results;
}
