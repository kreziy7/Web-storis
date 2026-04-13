import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useReminderStore } from '../store/reminderStore';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { ConfirmModal } from '../../../shared/components/Modal';
import { toast } from '../../../shared/components/Toast';
import { format, isPast, isToday } from 'date-fns';
import {
    Check, Pencil, Trash2, Clock, Tag, AlertCircle,
    CalendarClock, Loader2,
} from 'lucide-react';
import './Reminders.css';

const PRIORITY_COLORS = {
    high:   { bar: '#e05c5c', badge: 'rgba(224,92,92,0.12)', text: '#e05c5c', border: 'rgba(224,92,92,0.25)' },
    medium: { bar: '#e0a84a', badge: 'rgba(224,168,74,0.12)', text: '#e0a84a', border: 'rgba(224,168,74,0.25)' },
    low:    { bar: '#5cb85c', badge: 'rgba(92,184,92,0.12)', text: '#5cb85c', border: 'rgba(92,184,92,0.25)' },
};

const ReminderCard = ({ reminder, index = 0 }) => {
    const navigate = useNavigate();
    const { updateReminder, deleteReminder } = useReminderStore();
    const { t } = useTranslation();
    const c = t.card;
    const f = t.filters;
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toggling, setToggling] = useState(false);

    const PRIORITY_LABELS = { high: f.high, medium: f.medium, low: f.low };
    const pc = PRIORITY_COLORS[reminder.priority] || PRIORITY_COLORS.low;

    const handleToggle = async () => {
        setToggling(true);
        await updateReminder(reminder.clientId, { isCompleted: !reminder.isCompleted });
        toast.success(reminder.isCompleted ? c.markedActive : c.markedCompleted);
        setToggling(false);
    };

    const handleDelete = async () => {
        await deleteReminder(reminder.clientId);
        toast.success(c.reminderDeleted);
    };

    const dueDateStr = reminder.dueDate
        ? format(new Date(reminder.dueDate), 'MMM dd · HH:mm')
        : null;

    const isOverdue  = reminder.dueDate && !reminder.isCompleted && isPast(new Date(reminder.dueDate)) && !isToday(new Date(reminder.dueDate));
    const isDueToday = reminder.dueDate && isToday(new Date(reminder.dueDate)) && !reminder.isCompleted;

    return (
        <>
            <div
                className={`reminder-card ${reminder.isCompleted ? 'card-completed' : ''} ${isOverdue ? 'card-overdue' : ''}`}
                style={{ '--p-color': pc.bar }}
            >
                {/* Priority bar */}
                <div className="card-priority-bar" style={{ background: pc.bar }} />

                {/* Checkbox */}
                <motion.button
                    className={`card-checkbox ${reminder.isCompleted ? 'checkbox-done' : ''}`}
                    onClick={handleToggle}
                    disabled={toggling}
                    whileTap={{ scale: 0.85 }}
                    aria-label={reminder.isCompleted ? c.markedActive : c.markedCompleted}
                >
                    <AnimatePresence mode="wait">
                        {toggling ? (
                            <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <Loader2 size={12} className="spin-icon" />
                            </motion.span>
                        ) : reminder.isCompleted ? (
                            <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <Check size={12} strokeWidth={3} />
                            </motion.span>
                        ) : null}
                    </AnimatePresence>
                </motion.button>

                {/* Body */}
                <div className="card-body">
                    <div className="card-row-top">
                        <h3 className={`card-title ${reminder.isCompleted ? 'title-done' : ''}`}>
                            {reminder.title}
                        </h3>
                        <div className="card-badges">
                            <span
                                className="priority-badge"
                                style={{ background: pc.badge, color: pc.text, border: `1px solid ${pc.border}` }}
                            >
                                {PRIORITY_LABELS[reminder.priority]}
                            </span>
                            {!reminder.isSynced && (
                                <span className="unsync-badge" title="Pending sync">
                                    <Loader2 size={10} />
                                </span>
                            )}
                        </div>
                    </div>

                    {reminder.description && (
                        <p className="card-desc">{reminder.description}</p>
                    )}

                    {reminder.tags?.length > 0 && (
                        <div className="card-tags">
                            <Tag size={10} className="tag-icon" />
                            {reminder.tags.map(tag => (
                                <span key={tag} className="tag-chip">#{tag}</span>
                            ))}
                        </div>
                    )}

                    <div className="card-footer">
                        {dueDateStr && (
                            <span className={`card-due ${isOverdue ? 'due-overdue' : ''} ${isDueToday ? 'due-today' : ''}`}>
                                {isOverdue
                                    ? <AlertCircle size={11} />
                                    : isDueToday
                                        ? <CalendarClock size={11} />
                                        : <Clock size={11} />
                                }
                                {dueDateStr}
                            </span>
                        )}

                        <div className="card-actions">
                            <motion.button
                                className="card-action-btn btn-edit"
                                onClick={() => navigate(`/reminders/${reminder.clientId}/edit`)}
                                whileTap={{ scale: 0.9 }}
                                title={c.edit}
                            >
                                <Pencil size={12} strokeWidth={2} />
                                <span>{c.edit}</span>
                            </motion.button>
                            <motion.button
                                className="card-action-btn btn-delete"
                                onClick={() => setConfirmOpen(true)}
                                whileTap={{ scale: 0.9 }}
                                title={c.deleteTitle}
                            >
                                <Trash2 size={12} strokeWidth={2} />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                title={c.deleteTitle}
                message={c.deleteConfirm(reminder.title)}
                confirmLabel={c.deleteTitle}
            />
        </>
    );
};

export default ReminderCard;
