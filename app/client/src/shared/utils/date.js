import { format, isPast, isToday, formatDistanceToNow } from 'date-fns';

export const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'MMM dd, yyyy · HH:mm');
};

export const formatTime = (dateStr) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'HH:mm');
};

export const isOverdue = (dateStr, isCompleted = false) => {
    if (!dateStr || isCompleted) return false;
    return isPast(new Date(dateStr));
};

export const isDueToday = (dateStr) => {
    if (!dateStr) return false;
    return isToday(new Date(dateStr));
};

export const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
};

export const toISOString = () => new Date().toISOString();
