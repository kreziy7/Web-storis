import React, { useEffect } from 'react';
import Button from './Button';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) => (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title || 'Confirm Action'}
        footer={
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={() => { onConfirm(); onClose(); }}>
                    {confirmLabel}
                </Button>
            </div>
        }
    >
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
);

export default Modal;
