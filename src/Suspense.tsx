import React, {
    ReactElement,
    ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';
import RemoteData from 'ts-remote-data';

const useTimeout = (
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
};

interface RemoteSuspenseProps<T> {
    /**
     * The piece of data that the children need to render. To combine multiple
     * data dependencies in a single panel, use `RemoteData.all`.
     */
    data: RemoteData<T>;
    /**
     * The amount of time, in milliseconds, that the component will hold the
     * `LOADING` value before rendering `loadingFallback`. This has a default
     * value to avoid flashing loading indicators on loads that are shorter than
     * a person can perceive.
     */
    loadingTimeout?: number;
    /**
     * The elements to show while `data === RemoteData.LOADING`.
     */
    loadingFallback?: ReactNode;
    /**
     * A function called to render an error view when `data` is in the failure
     * state.
     *
     * @param error The error attached to `data`
     */
    failureFallback?(error: unknown): ReactNode;
    /**
     * Callback invoked when the data is ready.
     *
     * @param data The ready value of the `data` prop.
     */
    children(data: T): ReactNode;
}

/**
 * Analagous to React's native `Suspense` component, `RemoteSuspense` is a panel
 * that can be used to wrap elements which expect synchronously-available data
 * until their data dependencies resolve.
 *
 * It is expected that most projects will wrap this in their own panel component
 * which uses the project's standard loading indicator.
 */
export const RemoteSuspense = <T extends unknown>({
    data,
    loadingTimeout = 150,
    loadingFallback = null,
    failureFallback = () => null,
    ...props
}: RemoteSuspenseProps<T>): ReactElement => {
    const [showLoading, setShowLoading] = useState(false);
    const isLoading = data === RemoteData.LOADING;
    useTimeout(() => setShowLoading(true), isLoading && loadingTimeout);
    if (!isLoading && showLoading) setShowLoading(false);

    if (data === RemoteData.NOT_ASKED) return <React.Fragment />;
    if (data === RemoteData.LOADING) {
        return <>{showLoading && loadingFallback}</>;
    }
    if (RemoteData.isFailure(data)) return <>{failureFallback(data.error)}</>;
    return <>{props.children(data)}</>;
};
