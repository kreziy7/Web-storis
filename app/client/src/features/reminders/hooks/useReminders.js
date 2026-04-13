import { useEffect } from 'react';
import { useReminderStore } from '../store/reminderStore';

export function useReminders() {
    const reminders = useReminderStore(s => s.reminders);
    const isLoading = useReminderStore(s => s.isLoading);
    const error = useReminderStore(s => s.error);
    const filter = useReminderStore(s => s.filter);
    const fetchReminders = useReminderStore(s => s.fetchReminders);
    const getFilteredReminders = useReminderStore(s => s.getFilteredReminders);
    const setFilter = useReminderStore(s => s.setFilter);

    useEffect(() => {
        fetchReminders();
    }, []);

    return {
        reminders,
        filtered: getFilteredReminders(),
        isLoading,
        error,
        filter,
        setFilter,
        refetch: fetchReminders,
    };
}
