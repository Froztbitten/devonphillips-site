import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect clicks outside a specified element.
 * @param {() => void} handler - The function to call when a click outside is detected.
 * @returns {React.RefObject<HTMLElement>} A ref to attach to the element to monitor.
 */
export const useClickAway = (handler) => {
    const ref = useRef(null);

    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) return;
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);

    return ref;
};