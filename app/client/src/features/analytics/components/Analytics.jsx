import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS,
    ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement, Title,
    LineElement, PointElement, Filler,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { useReminderStore } from '../../reminders/store/reminderStore';
import {
    CheckCircle2, Clock, AlertTriangle, ListTodo,
    TrendingUp, BarChart3, PieChart,
} from 'lucide-react';
import { isPast, isToday, subDays, format, isAfter } from 'date-fns';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import './Analytics.css';

ChartJS.register(
    ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement, Title,
    LineElement, PointElement, Filler
);

const CHART_COLORS = {
    text:    '#DFD0B8',
    muted:   '#948979',
    card:    '#393E46',
    grid:    'rgba(148,137,121,0.12)',
    high:    '#e05c5c',
    medium:  '#e0a84a',
    low:     '#5cb85c',
    primary: '#DFD0B8',
    accent:  '#b8a898',
};

const chartDefaults = {
    plugins: {
        legend: {
            labels: { color: CHART_COLORS.muted, font: { family: 'Inter', size: 12 }, padding: 16 },
        },
        tooltip: {
            backgroundColor: '#2d323b',
            titleColor: CHART_COLORS.text,
            bodyColor: CHART_COLORS.muted,
            borderColor: 'rgba(148,137,121,0.25)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
        },
    },
};

const StatCard = ({ icon: Icon, label, value, sub, color, delay }) => (
    <motion.div
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        style={{ '--accent-color': color }}
    >
        <div className="stat-icon" style={{ color }}>
            <Icon size={20} strokeWidth={1.8} />
        </div>
        <div className="stat-info">
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    </motion.div>
);

const Analytics = () => {
    const { t } = useTranslation();
    const a = t.analytics;
    const reminders = useReminderStore(s => s.reminders);
    const fetchReminders = useReminderStore(s => s.fetchReminders);

    useEffect(() => {
        fetchReminders();
    }, []);

    const stats = useMemo(() => {
        const total     = reminders.length;
        const completed = reminders.filter(r => r.isCompleted).length;
        const active    = reminders.filter(r => !r.isCompleted).length;
        const overdue   = reminders.filter(r =>
            r.dueDate && !r.isCompleted && isPast(new Date(r.dueDate)) && !isToday(new Date(r.dueDate))
        ).length;
        const dueToday  = reminders.filter(r =>
            r.dueDate && isToday(new Date(r.dueDate)) && !r.isCompleted
        ).length;
        const high   = reminders.filter(r => r.priority === 'high').length;
        const medium = reminders.filter(r => r.priority === 'medium').length;
        const low    = reminders.filter(r => r.priority === 'low').length;
        const rate   = total ? Math.round((completed / total) * 100) : 0;
        return { total, completed, active, overdue, dueToday, high, medium, low, rate };
    }, [reminders]);

    // Last 7 days activity
    const weeklyData = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
        const labels = days.map(d => format(d, 'EEE'));
        const created = days.map(d => {
            const dayStr = format(d, 'yyyy-MM-dd');
            return reminders.filter(r => r.createdAt?.startsWith(dayStr)).length;
        });
        const completedPerDay = days.map(d => {
            const dayStr = format(d, 'yyyy-MM-dd');
            return reminders.filter(r => r.isCompleted && r.updatedAt?.startsWith(dayStr)).length;
        });
        return { labels, created, completedPerDay };
    }, [reminders]);

    // Priority doughnut
    const priorityData = {
        labels: [a.high, a.medium, a.low],
        datasets: [{
            data: [stats.high, stats.medium, stats.low],
            backgroundColor: [
                'rgba(224,92,92,0.85)',
                'rgba(224,168,74,0.85)',
                'rgba(92,184,92,0.85)',
            ],
            borderColor: [
                'rgba(224,92,92,0.3)',
                'rgba(224,168,74,0.3)',
                'rgba(92,184,92,0.3)',
            ],
            borderWidth: 1,
            hoverOffset: 6,
        }],
    };

    // Status doughnut
    const statusData = {
        labels: [a.completed, a.active, a.overdue],
        datasets: [{
            data: [stats.completed, stats.active - stats.overdue, stats.overdue],
            backgroundColor: [
                'rgba(92,184,92,0.85)',
                'rgba(223,208,184,0.7)',
                'rgba(224,92,92,0.85)',
            ],
            borderColor: [
                'rgba(92,184,92,0.3)',
                'rgba(223,208,184,0.2)',
                'rgba(224,92,92,0.3)',
            ],
            borderWidth: 1,
            hoverOffset: 6,
        }],
    };

    // Weekly bar chart
    const barData = {
        labels: weeklyData.labels,
        datasets: [
            {
                label: a.created,
                data: weeklyData.created,
                backgroundColor: 'rgba(223,208,184,0.25)',
                borderColor: 'rgba(223,208,184,0.6)',
                borderWidth: 1.5,
                borderRadius: 5,
            },
            {
                label: a.completed,
                data: weeklyData.completedPerDay,
                backgroundColor: 'rgba(92,184,92,0.25)',
                borderColor: 'rgba(92,184,92,0.6)',
                borderWidth: 1.5,
                borderRadius: 5,
            },
        ],
    };

    // Completion trend (line)
    const lineData = {
        labels: weeklyData.labels,
        datasets: [{
            label: a.completionRateLabel,
            data: weeklyData.completedPerDay.map((v, i) => {
                const total = weeklyData.created[i] || 1;
                return Math.round((v / total) * 100);
            }),
            borderColor: 'rgba(223,208,184,0.75)',
            backgroundColor: 'rgba(223,208,184,0.06)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(223,208,184,0.9)',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
        }],
    };

    const doughnutOpts = {
        ...chartDefaults,
        cutout: '68%',
        plugins: {
            ...chartDefaults.plugins,
            legend: { ...chartDefaults.plugins.legend, position: 'bottom' },
        },
        responsive: true,
        maintainAspectRatio: false,
    };

    const barOpts = {
        ...chartDefaults,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: CHART_COLORS.muted }, grid: { color: CHART_COLORS.grid }, border: { color: 'transparent' } },
            y: { ticks: { color: CHART_COLORS.muted, stepSize: 1 }, grid: { color: CHART_COLORS.grid }, border: { color: 'transparent' } },
        },
    };

    const lineOpts = {
        ...chartDefaults,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            ...chartDefaults.plugins,
            legend: { display: false },
        },
        scales: {
            x: { ticks: { color: CHART_COLORS.muted }, grid: { color: CHART_COLORS.grid }, border: { color: 'transparent' } },
            y: {
                ticks: { color: CHART_COLORS.muted, callback: v => v + '%' },
                grid: { color: CHART_COLORS.grid },
                border: { color: 'transparent' },
                min: 0, max: 100,
            },
        },
    };

    const containerVariants = {
        hidden: {},
        show: { transition: { staggerChildren: 0.07 } },
    };
    const fadeUp = {
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    };

    return (
        <motion.div
            className="analytics-page"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {/* Header */}
            <motion.div className="analytics-header" variants={fadeUp}>
                <div>
                    <h2 className="analytics-title">
                        <BarChart3 size={20} strokeWidth={1.8} />
                        {a.title}
                    </h2>
                    <p className="analytics-sub">{a.tracked(stats.total)}</p>
                </div>
                <div className="completion-pill">
                    <TrendingUp size={14} />
                    {a.completionRate(stats.rate)}
                </div>
            </motion.div>

            {/* Stats */}
            <div className="stats-grid">
                <StatCard icon={ListTodo}    label={a.total}     value={stats.total}     color="var(--text-main)"    delay={0.05} />
                <StatCard icon={CheckCircle2} label={a.completed} value={stats.completed}  sub={a.done(stats.rate)} color="var(--success)" delay={0.1} />
                <StatCard icon={Clock}        label={a.active}    value={stats.active}    sub={a.dueToday(stats.dueToday)} color="var(--warning)" delay={0.15} />
                <StatCard icon={AlertTriangle} label={a.overdue}  value={stats.overdue}   color="var(--error)" delay={0.2} />
            </div>

            {/* Charts row 1 */}
            <div className="charts-grid-2">
                <motion.div className="chart-card" variants={fadeUp}>
                    <div className="chart-card-header">
                        <PieChart size={15} />
                        <span>{a.priorityDist}</span>
                    </div>
                    <div className="chart-wrap">
                        <Doughnut data={priorityData} options={doughnutOpts} />
                    </div>
                </motion.div>

                <motion.div className="chart-card" variants={fadeUp}>
                    <div className="chart-card-header">
                        <PieChart size={15} />
                        <span>{a.statusBreakdown}</span>
                    </div>
                    <div className="chart-wrap">
                        <Doughnut data={statusData} options={doughnutOpts} />
                    </div>
                </motion.div>
            </div>

            {/* Charts row 2 */}
            <motion.div className="chart-card chart-full" variants={fadeUp}>
                <div className="chart-card-header">
                    <BarChart3 size={15} />
                    <span>{a.weekActivity}</span>
                </div>
                <div className="chart-wrap-tall">
                    <Bar data={barData} options={barOpts} />
                </div>
            </motion.div>

            <motion.div className="chart-card chart-full" variants={fadeUp}>
                <div className="chart-card-header">
                    <TrendingUp size={15} />
                    <span>{a.completionTrend}</span>
                </div>
                <div className="chart-wrap-tall">
                    <Line data={lineData} options={lineOpts} />
                </div>
            </motion.div>

            {/* Priority breakdown table */}
            <motion.div className="chart-card" variants={fadeUp}>
                <div className="chart-card-header">
                    <ListTodo size={15} />
                    <span>{a.prioritySummary}</span>
                </div>
                <div className="priority-table">
                    {[
                        { label: a.high,   count: stats.high,   color: 'var(--priority-high)' },
                        { label: a.medium, count: stats.medium, color: 'var(--priority-medium)' },
                        { label: a.low,    count: stats.low,    color: 'var(--priority-low)' },
                    ].map(({ label, count, color }) => (
                        <div key={label} className="priority-row">
                            <div className="priority-row-left">
                                <span className="priority-dot" style={{ background: color }} />
                                <span>{label}</span>
                            </div>
                            <div className="priority-bar-wrap">
                                <motion.div
                                    className="priority-bar-fill"
                                    style={{ background: color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: stats.total ? `${(count / stats.total) * 100}%` : '0%' }}
                                    transition={{ duration: 0.7, delay: 0.3 }}
                                />
                            </div>
                            <span className="priority-count">{count}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Analytics;
