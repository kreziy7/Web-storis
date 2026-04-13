import React from 'react';
import { motion } from 'framer-motion';
import { useReminderStore } from '../store/reminderStore';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Filter, ArrowUpDown } from 'lucide-react';
import './Reminders.css';

const ReminderFilters = () => {
    const { filter, setFilter } = useReminderStore();
    const { t } = useTranslation();
    const f = t.filters;

    const STATUS_TABS = [
        { value: 'all',       label: f.all },
        { value: 'active',    label: f.active },
        { value: 'completed', label: f.done },
    ];

    const PRIORITY_LABELS = {
        all:    f.all,
        high:   f.high,
        medium: f.medium,
        low:    f.low,
    };

    return (
        <motion.div
            className="reminder-filters"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
        >
            {/* Status tabs */}
            <div className="filter-group">
                <label className="filter-label"><Filter size={10} /> {f.status}</label>
                <div className="filter-tabs">
                    {STATUS_TABS.map(({ value, label }) => (
                        <button
                            key={value}
                            className={`filter-tab ${filter.status === value ? 'tab-active' : ''}`}
                            onClick={() => setFilter({ status: value })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter-divider" />

            {/* Priority */}
            <div className="filter-group">
                <label className="filter-label">{f.priority}</label>
                <div className="filter-tabs">
                    {['all', 'high', 'medium', 'low'].map(p => (
                        <button
                            key={p}
                            className={`filter-tab filter-tab-priority ${filter.priority === p ? 'tab-active' : ''} priority-tab-${p}`}
                            onClick={() => setFilter({ priority: p })}
                        >
                            {PRIORITY_LABELS[p]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter-divider" />

            {/* Sort */}
            <div className="filter-group filter-group-row">
                <ArrowUpDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <select
                    className="filter-select"
                    value={filter.sortBy}
                    onChange={e => setFilter({ sortBy: e.target.value })}
                    aria-label="Sort by"
                >
                    <option value="dueDate">{f.dueDate}</option>
                    <option value="createdAt">{f.created}</option>
                    <option value="updatedAt">{f.updated}</option>
                </select>
                <select
                    className="filter-select filter-select-sm"
                    value={filter.order}
                    onChange={e => setFilter({ order: e.target.value })}
                    aria-label="Order"
                >
                    <option value="asc">{f.asc}</option>
                    <option value="desc">{f.desc}</option>
                </select>
            </div>
        </motion.div>
    );
};

export default ReminderFilters;
