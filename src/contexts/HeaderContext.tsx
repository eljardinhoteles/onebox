import { createContext, useContext, useState, type ReactNode } from 'react';

interface HeaderContextType {
    actions: ReactNode;
    setActions: (actions: ReactNode) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
    const [actions, setActions] = useState<ReactNode>(null);

    return (
        <HeaderContext.Provider value={{ actions, setActions }}>
            {children}
        </HeaderContext.Provider>
    );
}

export function useHeader() {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new Error('useHeader must be used within a HeaderProvider');
    }
    return context;
}
