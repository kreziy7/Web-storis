import { useEffect, useRef } from 'react';
import { useReminderStore } from '../../reminders/store/reminderStore';
import { playReminderMelody } from '../../../shared/utils/melody';
import { useReminderAlertStore } from '../../../shared/components/ReminderAlert';
import { syncFCMSchedule } from '../api/fcmApi';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// ── In-app: sound + popup (tab ochiq) ────────────────────
function fireInApp(reminder) {
    playReminderMelody();
    useReminderAlertStore.getState().push(reminder);
}

// ─────────────────────────────────────────────────────────
export function useNotifications() {
    const reminders = useReminderStore(s => s.reminders);
    const timersRef = useRef([]);

    // ── setTimeout: tab ochiq bo'lsa in-app popup + sound ─
    useEffect(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];

        const now = Date.now();
        const upcoming = reminders.filter(r => {
            if (r.isCompleted || r.isDeleted || !r.dueDate) return false;
            const delay = new Date(r.dueDate).getTime() - now;
            return delay > 0 && delay < WEEK_MS;
        });

        upcoming.forEach(reminder => {
            const delay = new Date(reminder.dueDate).getTime() - Date.now();
            const id = setTimeout(() => fireInApp(reminder), delay);
            timersRef.current.push(id);
        });

        // ── SW TimestampTrigger: tab yopiq bo'lsa ham notification ───
        // Chrome 80+ da ishlaydi, server kerak emas
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
                reg.active?.postMessage({
                    type: 'SCHEDULE_REMINDERS',
                    reminders: upcoming,
                });
            }).catch(() => {});
        }

        // ── FCM sync: tab yopiq bo'lsa ham notification ───
        // Server har daqiqa tekshirib FCM push yuboradi
        syncFCMSchedule(upcoming).catch(() => {});

        return () => timersRef.current.forEach(clearTimeout);
    }, [reminders]);

    // ── Missed check: tab qaytib ochilganda ──────────────
    useEffect(() => {
        const check = () => {
            const now = Date.now();
            reminders
                .filter(r => {
                    if (r.isCompleted || r.isDeleted || !r.dueDate) return false;
                    const t = new Date(r.dueDate).getTime();
                    return t <= now && t >= now - HOUR_MS;
                })
                .forEach(r => fireInApp(r));
        };

        const onVisible = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVisible);
        check();
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [reminders]);

    return {};
}
