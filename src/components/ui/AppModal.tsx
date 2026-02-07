import { Modal, type ModalProps, LoadingOverlay } from '@mantine/core';

interface AppModalProps extends ModalProps {
    loading?: boolean;
}

export function AppModal({ children, loading, ...props }: AppModalProps) {
    return (
        <Modal
            centered
            radius="lg"
            transitionProps={{ transition: 'fade', duration: 300 }}
            overlayProps={{
                backgroundOpacity: 0.6,
                blur: 8,
            }}
            styles={{
                header: { borderBottom: '1px solid #eee', marginBottom: '1rem', paddingBottom: '0.75rem' },
                title: { fontWeight: 700 }
            }}
            {...props}
        >
            <LoadingOverlay visible={!!loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            {children}
        </Modal>
    );
}
