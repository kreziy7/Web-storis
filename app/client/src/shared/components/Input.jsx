import React from 'react';
import './Input.css';

const Input = ({
    label,
    error,
    icon,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className={`input-container ${error ? 'input-has-error' : ''} ${className}`}>
            {label && <label htmlFor={inputId} className="input-label">{label}</label>}
            <div className="input-wrapper">
                {icon && <span className="input-icon">{icon}</span>}
                <input
                    id={inputId}
                    className={`input-field ${icon ? 'input-with-icon' : ''}`}
                    {...props}
                />
            </div>
            {error && <span className="input-error-text">{error}</span>}
        </div>
    );
};

export default Input;
