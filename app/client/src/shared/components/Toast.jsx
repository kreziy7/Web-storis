import React, { useEffect } from 'react';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import './Toast.css';

export const useToastStore = create((set) => ({
    toasts: [],
    add: (toast) => {
        const id = uuidv4();
        set(state => ({ toasts: [...state.toasts, { id, ...toast }] }));
        if (toast.duration !== 0) {
            setTimeout(() => {
                set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
            }, toast.duration || 3500);
        }
    },
    remove: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
    success: (message) => useToastStore.getState().add({ type: 'success', message }),
    error: (message) => useToastStore.getState().add({ type: 'error', message }),
    info: (message) => useToastStore.getState().add({ type: 'info', message }),
};

const ToastItem = ({ id, type, message }) => {
    const remove = useToastStore(s => s.remove);
    return (
        <div className={`toast toast-${type}`} onClick={() => remove(id)}>
            <span className="toast-icon">
                {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span className="toast-message">{message}</span>
        </div>
    );
};

const ToastContainer = () => {
    const toasts = useToastStore(s => s.toasts);
    return (
        <div className="toast-container">
            {toasts.map(t => <ToastItem key={t.id} {...t} />)}
        </div>
    );
};

export default ToastContainer;
