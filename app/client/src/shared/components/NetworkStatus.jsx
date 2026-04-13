import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import './NetworkStatus.css';

const NetworkStatus = () => {
    const isOnline = useNetworkStatus();
    const [visible, setVisible] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setVisible(true);
            setWasOffline(true);
        } else if (wasOffline) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, wasOffline]);

    if (!visible) return null;

    return (
        <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="network-dot" />
            {isOnline ? 'Back online — syncing...' : 'You are offline. Changes will sync when reconnected.'}
        </div>
    );
};

export default NetworkStatus;
