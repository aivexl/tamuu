import { ref } from "vue";

interface ToastProps {
    id: string;
    title?: string;
    description?: string;
    variant?: "default" | "destructive" | "success";
    action?: any;
    duration?: number;
}

const toasts = ref<ToastProps[]>([]);
let count = 0;

function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}

function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
}

function toast(props: Omit<ToastProps, "id">) {
    const id = genId();
    const newToast = { ...props, id };
    toasts.value = [newToast, ...toasts.value].slice(0, 3); // Limit to 3

    if (props.duration !== Infinity) {
        setTimeout(() => {
            dismiss(id);
        }, props.duration || 5000);
    }

    return {
        id,
        dismiss: () => dismiss(id),
    };
}

export function useToast() {
    return {
        toasts,
        toast,
        dismiss,
    };
}
