import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useReminderStore } from '../store/reminderStore';
import { useSyncStore } from '../../../store/syncStore';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import ReminderCard from './ReminderCard';
import ReminderFilters from './ReminderFilters';
import Button from '../../../shared/components/Button';
import { Plus, RefreshCw, InboxIcon, AlertCircle, Loader2 } from 'lucide-react';
import './Reminders.css';

const ReminderList = () => {
    const navigate = useNavigate();
    const { isLoading, error, fetchReminders, getFilteredReminders } = useReminderStore();
    const { isSyncing, pendingCount, lastSyncAt } = useSyncStore();
    const { t } = useTranslation();
    const l = t.list;
    const filtered = getFilteredReminders();

    useEffect(() => {
        fetchReminders();
    }, []);

    const changesLabel = (n) =>
        `${n} ${n === 1 ? l.change : l.changes}`;

    return (
        <div className="reminder-list-page">
            {/* Header */}
            <motion.div
                className="list-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div>
                    <h2 className="list-title">{l.title}</h2>
                    {lastSyncAt && (
                        <p className="last-sync">
                            <RefreshCw size={9} /> {l.synced} {new Date(lastSyncAt).toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <motion.div whileTap={{ scale: 0.95 }}>
                    <Button size="sm" onClick={() => navigate('/reminders/new')}>
                        <Plus size={14} strokeWidth={2.5} />
                        {l.newBtn}
                    </Button>
                </motion.div>
            </motion.div>

            {/* Sync banner */}
            <AnimatePresence>
                {pendingCount > 0 && (
                    <motion.div
                        className={`sync-banner ${isSyncing ? 'banner-syncing' : 'banner-pending'}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isSyncing
                            ? <><Loader2 size={12} className="spin-icon" /> {l.syncing} {changesLabel(pendingCount)}...</>
                            : <><AlertCircle size={12} /> {changesLabel(pendingCount)} {l.pendingSync}</>
                        }
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filters */}
            <ReminderFilters />

            {/* Content */}
            {isLoading && filtered.length === 0 ? (
                <motion.div
                    className="loading-state"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                    <div className="loading-spinner" />
                    <p>{l.loading}</p>
                </motion.div>
            ) : error ? (
                <motion.div className="error-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <AlertCircle size={32} style={{ color: 'var(--error)', opacity: 0.7 }} />
                    <p>{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchReminders}>{l.retry}</Button>
                </motion.div>
            ) : filtered.length === 0 ? (
                <motion.div
                    className="empty-state"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <InboxIcon size={40} strokeWidth={1.2} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    <h3>{l.noReminders}</h3>
                    <p>{l.createFirst}</p>
                    <Button size="sm" onClick={() => navigate('/reminders/new')}>
                        <Plus size={14} /> {l.createBtn}
                    </Button>
                </motion.div>
            ) : (
                <div className="reminder-cards">
                    {filtered.map((reminder, i) => (
                        <ReminderCard
                            key={reminder.clientId || reminder.id}
                            reminder={reminder}
                            index={i}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReminderList;
