const listeners = new Set();

export const networkMonitor = {
    isOnline() {
        return navigator.onLine;
    },

    onOnline(callback) {
        window.addEventListener('online', callback);
        listeners.add({ type: 'online', callback });
        return () => {
            window.removeEventListener('online', callback);
            listeners.delete({ type: 'online', callback });
        };
    },

    onOffline(callback) {
        window.addEventListener('offline', callback);
        listeners.add({ type: 'offline', callback });
        return () => {
            window.removeEventListener('offline', callback);
            listeners.delete({ type: 'offline', callback });
        };
    },
};
