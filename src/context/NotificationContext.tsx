import { createContext, useContext, useState, type ReactNode } from 'react';

interface NotificationContextType {
    opened: boolean;
    openNotifications: () => void;
    closeNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [opened, setOpened] = useState(false);

    const openNotifications = () => setOpened(true);
    const closeNotifications = () => setOpened(false);

    return (
        <NotificationContext.Provider value={{ opened, openNotifications, closeNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
