export function debounce<T extends unknown[]>(func: (...args: T) => void, wait: number, immediate?: boolean) {
    let timeout: NodeJS.Timeout|number|null;
    return (...args: T) => {
        if (timeout) clearTimeout(timeout);
        if (immediate && timeout == null) func(...args);
        timeout = setTimeout(() => {
            timeout = null;
            if (!immediate) func(...args);
        }, wait);
    };
}
