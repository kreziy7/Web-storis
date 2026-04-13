import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReminderStore } from '../store/reminderStore';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import Button from '../../../shared/components/Button';
import Input from '../../../shared/components/Input';
import { toast } from '../../../shared/components/Toast';
import { format } from 'date-fns';
import './Reminders.css';

const EMOJIS = [
    '😀','😂','😍','🥰','😎','🤔','😴','🥳',
    '👍','👏','🙌','💪','🤝','✌️','🤞','🫶',
    '🔥','⭐','💡','✅','❌','⚡','🎯','📌',
    '📅','⏰','📝','📋','🗓️','🔔','💼','🏠',
    '🎉','🎁','🎂','🏆','💰','🚀','❤️','💙',
    '🌟','🌙','☀️','🌈','🍕','☕','🎵','🛒',
];

const EmojiPicker = ({ onSelect, onClose }) => {
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    return (
        <div className="emoji-picker" ref={ref}>
            {EMOJIS.map(emoji => (
                <button
                    key={emoji}
                    type="button"
                    className="emoji-btn"
                    onClick={() => { onSelect(emoji); onClose(); }}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
};

const defaultForm = {
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    tags: '',
};

const ReminderForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const { t } = useTranslation();
    const f = t.form;
    const tf = t.filters;

    const { reminders, createReminder, updateReminder } = useReminderStore();
    const [form, setForm] = useState(defaultForm);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const titleInputRef = useRef(null);

    useEffect(() => {
        if (isEdit) {
            const reminder = reminders.find(r => r.clientId === id || r.id === id);
            if (reminder) {
                setForm({
                    title: reminder.title || '',
                    description: reminder.description || '',
                    dueDate: reminder.dueDate
                        ? format(new Date(reminder.dueDate), "yyyy-MM-dd'T'HH:mm")
                        : '',
                    priority: reminder.priority || 'medium',
                    tags: (reminder.tags || []).join(', '),
                });
            }
        }
    }, [id, isEdit, reminders]);

    const validate = () => {
        const errs = {};
        if (!form.title.trim()) errs.title = f.titleRequired;
        if (form.title.trim().length > 200) errs.title = f.titleTooLong;
        if (!form.dueDate) errs.dueDate = f.dueDateRequired;
        return errs;
    };

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
        if (errors[e.target.id]) setErrors(prev => ({ ...prev, [e.target.id]: '' }));
    };

    const insertEmoji = (emoji) => {
        const input = titleInputRef.current;
        if (!input) return;
        const start = input.selectionStart ?? form.title.length;
        const end = input.selectionEnd ?? form.title.length;
        const newValue = form.title.slice(0, start) + emoji + form.title.slice(end);
        setForm(prev => ({ ...prev, title: newValue }));
        if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
        setTimeout(() => {
            input.focus();
            const pos = start + emoji.length;
            input.setSelectionRange(pos, pos);
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setIsLoading(true);
        try {
            const dto = {
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                dueDate: new Date(form.dueDate).toISOString(),
                priority: form.priority,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            };

            if (isEdit) {
                await updateReminder(id, dto);
                toast.success(f.updated);
            } else {
                await createReminder(dto);
                toast.success(f.created);
            }
            navigate('/');
        } catch (err) {
            toast.error(err.message || f.error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="form-page">
            <div className="form-card">
                <h2 className="form-title">{isEdit ? f.editTitle : f.newTitle}</h2>

                <form onSubmit={handleSubmit} className="reminder-form">
                    {/* Title with emoji picker */}
                    <div className={`input-container ${errors.title ? 'input-has-error' : ''}`}>
                        <label htmlFor="title" className="input-label">{f.titleLabel}</label>
                        <div className="title-input-row">
                            <input
                                ref={titleInputRef}
                                id="title"
                                className="input-field"
                                placeholder={f.titlePlaceholder}
                                value={form.title}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className="emoji-toggle-btn"
                                onClick={() => setShowEmoji(v => !v)}
                                title="Emoji"
                            >
                                😊
                            </button>
                        </div>
                        {showEmoji && (
                            <EmojiPicker
                                onSelect={insertEmoji}
                                onClose={() => setShowEmoji(false)}
                            />
                        )}
                        {errors.title && <span className="input-error-text">{errors.title}</span>}
                    </div>

                    <div className="input-container">
                        <label htmlFor="description" className="input-label">{f.descLabel}</label>
                        <textarea
                            id="description"
                            className="input-field textarea"
                            placeholder={f.descPlaceholder}
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <Input
                        id="dueDate"
                        label={f.dueDateLabel}
                        type="datetime-local"
                        value={form.dueDate}
                        onChange={handleChange}
                        error={errors.dueDate}
                    />

                    <div className="input-container">
                        <label htmlFor="priority" className="input-label">{f.priorityLabel}</label>
                        <select
                            id="priority"
                            className="input-field"
                            value={form.priority}
                            onChange={handleChange}
                        >
                            <option value="high">{tf.high}</option>
                            <option value="medium">{tf.medium}</option>
                            <option value="low">{tf.low}</option>
                        </select>
                    </div>

                    <Input
                        id="tags"
                        label={f.tagsLabel}
                        placeholder={f.tagsPlaceholder}
                        value={form.tags}
                        onChange={handleChange}
                    />

                    <div className="form-actions">
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            onClick={() => navigate('/')}
                        >
                            {f.cancel}
                        </Button>
                        <Button type="submit" size="md" isLoading={isLoading}>
                            {isEdit ? f.saveChanges : f.createBtn}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReminderForm;
