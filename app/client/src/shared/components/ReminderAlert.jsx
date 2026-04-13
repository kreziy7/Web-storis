import React, { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import './ReminderAlert.css';

// ── Store ─────────────────────────────────────────────────
export const useReminderAlertStore = create((set, get) => ({
    alerts: [],

    // Show alert for a reminder
    push: (reminder) => {
        const id = reminder.clientId || reminder.id || String(Date.now());
        // Don't duplicate
        if (get().alerts.find(a => a.id === id)) return;
        set(s => ({ alerts: [...s.alerts, { ...reminder, _alertId: id }] }));
    },

    dismiss: (id) => set(s => ({ alerts: s.alerts.filter(a => a._alertId !== id) })),

    dismissAll: () => set({ alerts: [] }),
}));

// ── Helper: format time ───────────────────────────────────
function formatTime(dateStr) {
    try {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

// ── Single Alert Card ─────────────────────────────────────
const AUTO_DISMISS_MS = 12000;

const AlertCard = ({ reminder, onDone, onSnooze, onDismiss }) => {
    const [exiting, setExiting] = useState(false);

    const exit = useCallback((cb) => {
        setExiting(true);
        setTimeout(cb, 280);
    }, []);

    // Auto-dismiss
    useEffect(() => {
        const id = setTimeout(() => exit(onDismiss), AUTO_DISMISS_MS);
        return () => clearTimeout(id);
    }, [exit, onDismiss]);

    const priority = reminder.priority || 'medium';
    const priorityLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[priority] || priority;

    return (
        <div className={`ra-card ${exiting ? 'ra-exit' : ''}`}>
            {/* Timer bar */}
            <div className="ra-progress">
                <div
                    className="ra-progress-bar"
                    style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }}
                />
            </div>

            {/* Header */}
            <div className="ra-header">
                <div className="ra-bell">⏰</div>
                <div className="ra-meta">
                    <div className="ra-label">Reminder</div>
                    {reminder.dueDate && (
                        <div className="ra-time">{formatTime(reminder.dueDate)}</div>
                    )}
                </div>
                <button className="ra-close" onClick={() => exit(onDismiss)}>✕</button>
            </div>

            {/* Body */}
            <div className="ra-body">
                <div className="ra-title">{reminder.title}</div>

                {reminder.description && (
                    <div className="ra-desc">{reminder.description}</div>
                )}

                <div className={`ra-priority ra-priority-${priority}`}>
                    {priorityLabel}
                </div>

                {/* Actions */}
                <div className="ra-actions">
                    <button
                        className="ra-btn ra-btn-done"
                        onClick={() => exit(onDone)}
                    >
                        ✓ Done
                    </button>
                    <button
                        className="ra-btn ra-btn-snooze"
                        onClick={() => exit(onSnooze)}
                    >
                        ⏱ +5 min
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Container (mount in App.jsx) ──────────────────────────
const ReminderAlertContainer = () => {
    const { alerts, dismiss } = useReminderAlertStore();

    const handleDone = useCallback(async (reminder) => {
        dismiss(reminder._alertId);
        try {
            const { useReminderStore } = await import('../../features/reminders/store/reminderStore');
            await useReminderStore.getState().updateReminder(
                reminder.clientId || reminder.id,
                { isCompleted: true }
            );
        } catch { /* offline — will sync later */ }
    }, [dismiss]);

    const handleSnooze = useCallback(async (reminder) => {
        dismiss(reminder._alertId);
        try {
            const { useReminderStore } = await import('../../features/reminders/store/reminderStore');
            const newDue = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            await useReminderStore.getState().updateReminder(
                reminder.clientId || reminder.id,
                { dueDate: newDue }
            );
        } catch { /* offline */ }
    }, [dismiss]);

    if (!alerts.length) return null;

    return (
        <div className="ra-container">
            {alerts.map(reminder => (
                <AlertCard
                    key={reminder._alertId}
                    reminder={reminder}
                    onDone={() => handleDone(reminder)}
                    onSnooze={() => handleSnooze(reminder)}
                    onDismiss={() => dismiss(reminder._alertId)}
                />
            ))}
        </div>
    );
};

export default ReminderAlertContainer;
