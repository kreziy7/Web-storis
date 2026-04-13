import { useReminderStore } from '../store/reminderStore';

export function useReminderMutations() {
    const createReminder = useReminderStore(s => s.createReminder);
    const updateReminder = useReminderStore(s => s.updateReminder);
    const deleteReminder = useReminderStore(s => s.deleteReminder);

    return { createReminder, updateReminder, deleteReminder };
}
