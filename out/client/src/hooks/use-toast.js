// Toast hook for UI notifications
import { useState, useCallback } from "react";
const toasts = [];
export const useToast = () => {
    const [, forceUpdate] = useState({});
    const toast = useCallback(({ title, description, variant = "default" }) => {
        const id = Math.random().toString(36).slice(2);
        const newToast = {
            id,
            title,
            description,
            variant,
        };
        toasts.push(newToast);
        forceUpdate({});
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const index = toasts.findIndex((t) => t.id === id);
            if (index > -1) {
                toasts.splice(index, 1);
                forceUpdate({});
            }
        }, 5000);
        return { id };
    }, []);
    const dismiss = useCallback((toastId) => {
        const index = toasts.findIndex((t) => t.id === toastId);
        if (index > -1) {
            toasts.splice(index, 1);
            forceUpdate({});
        }
    }, []);
    return {
        toast,
        dismiss,
        toasts: [...toasts],
    };
};
