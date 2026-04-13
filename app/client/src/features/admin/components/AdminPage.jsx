import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../api/adminApi';
import { useTranslation } from '../../../shared/hooks/useTranslation';

import {
    Users, ShieldCheck, UserX, UserPlus, Search,
    Trash2, Shield, ShieldOff, Ban, CheckCircle,
    RefreshCw, ChevronLeft, ChevronRight, Crown,
} from 'lucide-react';
import './AdminPage.css';

// ── Stat Card ─────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, delay }) => (
    <motion.div
        className="admin-stat-card"
        style={{ '--accent': color }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay }}
    >
        <div className="admin-stat-icon" style={{ color }}>
            <Icon size={20} strokeWidth={1.8} />
        </div>
        <div>
            <div className="admin-stat-value">{value ?? '—'}</div>
            <div className="admin-stat-label">{label}</div>
        </div>
    </motion.div>
);

// ── Role Badge ────────────────────────────────────────────
const RoleBadge = ({ role }) => (
    <span className={`role-badge role-${role}`}>
        {role === 'admin' ? <Crown size={10} /> : null}
        {role}
    </span>
);

// ── Status Badge ──────────────────────────────────────────
const StatusBadge = ({ banned, a }) => (
    <span className={`status-badge ${banned ? 'status-banned' : 'status-active'}`}>
        {banned ? a.statusBanned : a.statusActive}
    </span>
);

// ── Confirm Dialog ────────────────────────────────────────
const Confirm = ({ message, onConfirm, onCancel, a }) => (
    <div className="admin-confirm-overlay">
        <div className="admin-confirm-box">
            <p>{message}</p>
            <div className="admin-confirm-actions">
                <button className="admin-btn admin-btn-ghost" onClick={onCancel}>{a.confirmCancel}</button>
                <button className="admin-btn admin-btn-danger" onClick={onConfirm}>{a.confirmOk}</button>
            </div>
        </div>
    </div>
);

// ── Main AdminPage ────────────────────────────────────────
const AdminPage = () => {
    const { t } = useTranslation();
    const a = t.admin;
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [confirm, setConfirm] = useState(null); // { message, onConfirm }
    const [actionLoading, setActionLoading] = useState(null);

    const loadStats = useCallback(async () => {
        try {
            const s = await adminApi.getStats();
            setStats(s);
        } catch { /* ignore */ }
    }, []);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.getUsers({ search, page, limit: 15 });
            setUsers(data.users);
            setTotal(data.total);
            setPages(data.pages);
        } catch { /* ignore */ }
        setLoading(false);
    }, [search, page]);

    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => { loadUsers(); }, [loadUsers]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const refresh = () => { loadStats(); loadUsers(); };

    const withConfirm = (message, action) => {
        setConfirm({ message, onConfirm: async () => {
            setConfirm(null);
            await action();
            refresh();
        }});
    };

    const handleBan = (user) => {
        const msg = user.isBanned
            ? a.unbanConfirm(user.name, user.email)
            : a.banConfirm(user.name, user.email);
        withConfirm(msg, async () => {
            setActionLoading(user._id + '_ban');
            try { await adminApi.toggleBan(user._id); } finally { setActionLoading(null); }
        });
    };

    const handleRole = (user) => {
        const msg = user.role === 'admin'
            ? a.demoteConfirm(user.name)
            : a.promoteConfirm(user.name);
        withConfirm(msg, async () => {
            setActionLoading(user._id + '_role');
            try { await adminApi.toggleRole(user._id); } finally { setActionLoading(null); }
        });
    };

    const handleDelete = (user) => {
        withConfirm(a.deleteConfirm(user.name, user.email), async () => {
            setActionLoading(user._id + '_del');
            try { await adminApi.deleteUser(user._id); } finally { setActionLoading(null); }
        });
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

    return (
        <div className="admin-page">
            {/* Header */}
            <motion.div className="admin-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="admin-title-row">
                    <ShieldCheck size={22} className="admin-title-icon" />
                    <h2 className="admin-title">{a.title}</h2>
                </div>
                <button className="admin-btn admin-btn-ghost admin-refresh" onClick={refresh}>
                    <RefreshCw size={14} />
                    {a.refresh}
                </button>
            </motion.div>

            {/* Stats */}
            <div className="admin-stats-grid">
                <StatCard icon={Users}      label={a.totalUsers} value={stats?.total}    color="var(--primary)"         delay={0.05} />
                <StatCard icon={CheckCircle} label={a.active}    value={stats?.active}   color="var(--success, #5cb85c)" delay={0.1} />
                <StatCard icon={UserPlus}    label={a.todayNew}  value={stats?.todayNew} color="var(--warning, #e0a84a)" delay={0.15} />
                <StatCard icon={Ban}         label={a.banned}    value={stats?.banned}   color="var(--error, #e05c5c)"  delay={0.2} />
                <StatCard icon={Crown}       label={a.admins}    value={stats?.admins}   color="#a78bfa"                delay={0.25} />
            </div>

            {/* Users Table */}
            <motion.div className="admin-table-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="admin-table-header">
                    <div className="admin-search-wrap">
                        <Search size={14} className="admin-search-icon" />
                        <input
                            className="admin-search"
                            placeholder={a.searchPlaceholder}
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                        />
                    </div>
                    <span className="admin-total-label">{total} {a.users}</span>
                </div>

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{a.colUser}</th>
                                <th>{a.colEmail}</th>
                                <th>{a.colRole}</th>
                                <th>{a.colStatus}</th>
                                <th>{a.colJoined}</th>
                                <th>{a.colLastLogin}</th>
                                <th>{a.colActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="admin-table-empty">{a.loading}</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="admin-table-empty">{a.noUsers}</td></tr>
                            ) : users.map(u => (
                                <motion.tr
                                    key={u._id}
                                    className={`admin-row ${u.isBanned ? 'admin-row-banned' : ''}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <td>
                                        <div className="admin-user-cell">
                                            <div className="admin-user-avatar">
                                                {u.name[0].toUpperCase()}
                                            </div>
                                            <span className="admin-user-name">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="admin-cell-muted">{u.email}</td>
                                    <td><RoleBadge role={u.role} /></td>
                                    <td><StatusBadge banned={u.isBanned} a={a} /></td>
                                    <td className="admin-cell-muted">{formatDate(u.createdAt)}</td>
                                    <td className="admin-cell-muted">{formatDate(u.lastLoginAt)}</td>
                                    <td>
                                        <div className="admin-actions">
                                            {/* Ban/Unban */}
                                            <button
                                                className={`admin-action-btn ${u.isBanned ? 'btn-success' : 'btn-warn'}`}
                                                onClick={() => handleBan(u)}
                                                disabled={u.role === 'admin' || actionLoading === u._id + '_ban'}
                                                title={u.isBanned ? a.statusActive : a.statusBanned}
                                            >
                                                {u.isBanned ? <CheckCircle size={16} strokeWidth={2} /> : <UserX size={16} strokeWidth={2} />}
                                            </button>

                                            {/* Promote/Demote */}
                                            <button
                                                className={`admin-action-btn ${u.role === 'admin' ? 'btn-purple' : 'btn-ghost'}`}
                                                onClick={() => handleRole(u)}
                                                disabled={actionLoading === u._id + '_role'}
                                                title={u.role === 'admin' ? a.demoteConfirm(u.name) : a.promoteConfirm(u.name)}
                                            >
                                                {u.role === 'admin' ? <ShieldOff size={16} strokeWidth={2} /> : <Shield size={16} strokeWidth={2} />}
                                            </button>

                                            {/* Delete */}
                                            <button
                                                className="admin-action-btn btn-danger"
                                                onClick={() => handleDelete(u)}
                                                disabled={u.role === 'admin' || actionLoading === u._id + '_del'}
                                                title={a.colActions}
                                            >
                                                <Trash2 size={16} strokeWidth={2} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <div className="admin-pagination">
                        <button className="admin-btn admin-btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={14} /> {a.prev}
                        </button>
                        <span className="admin-page-info">{a.page(page, pages)}</span>
                        <button className="admin-btn admin-btn-ghost" disabled={page === pages} onClick={() => setPage(p => p + 1)}>
                            {a.next} <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Confirm dialog */}
            <AnimatePresence>
                {confirm && (
                    <Confirm
                        message={confirm.message}
                        onConfirm={confirm.onConfirm}
                        onCancel={() => setConfirm(null)}
                        a={a}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPage;
