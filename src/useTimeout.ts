import { useEffect, useRef, useDebugValue } from 'react';

/**
 * A declarative timeout
 *
 * @param callback The function executed when the timeout elapses.
 * @param delay If a number, the time in ms to delay firing. Passing
 * `null` or `false` will clear the timeout. Note that changing this
 * value resets the timeout, rather than amending it: If you pass 1000ms,
 * then 500ms later pass 750ms, the callback will fire at 1250ms.
 *
 * @internal
 */
export const useTimeout = (
    callback: () => void,
    delay: number | null | false,
): void => {
    const currentCallback = useRef(callback);
    useEffect(() => {
        currentCallback.current = callback;
    }, [callback]);
    useEffect(() => {
        const fire = (): void => currentCallback.current();
        if (typeof delay !== 'number') return;
        const id = setTimeout(fire, delay);
        return () => clearTimeout(id);
    }, [delay]);
    useDebugValue(delay, v => (typeof delay === 'number' ? delay : 'Stopped'));
};
