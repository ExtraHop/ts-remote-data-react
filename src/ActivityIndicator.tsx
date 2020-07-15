// COPYRIGHT 2020 BY EXTRAHOP NETWORKS, INC.
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.

import React, {
    createContext,
    FC,
    ReactNode,
    useState,
    useRef,
    useMemo,
    useContext,
    useEffect,
    useDebugValue,
} from 'react';
import { isElement } from 'react-is';
import { useTimeout } from './useTimeout';

/**
 * Internal counter used to uniquely identify data dependencies.
 */
let uniqueId = 0;

const ActivityIndicatorContext = createContext({
    register(): () => void {
        return () => {};
    },
});

/**
 * Context for tracking the state of the activity indicator. We separate this
 * from the `ActivityIndicatorContext` as we expect this context to be consumed
 * infrequently, and don't want to force a rerender of all components sending
 * status to the indicator whenever that status changes.
 */
const ActivityStatusContext = createContext(false);

/**
 * An activity indicator which should be unconditionally rendered because it
 * knows how to hide itself when there's no background activity going on.
 * This is useful for loading indicators that should have exit animations, as
 * the component will stay mounted through the animation.
 */
type SelfHidingIndicator = (isLoading: boolean) => ReactNode;

/**
 * The `ActivityIndicator` component provides a way to show some UI when there
 * are background data updates in progress. For example, this would be used to
 * render a thin indeterminate progress bar under a site's top nav.
 *
 * This component wraps around the components for which it should show an
 * indicator. It's common to have an instance near the root of the app, with
 * a handful of other uses for overlay or other similar components.
 */
export const ActivityIndicator: FC<{
    /**
     * This can be a `ReactNode` which the monitor will automatically mount and
     * unmount based on whether or not activity is occurring, or a function
     * which takes whether or not the indicator should be visible.
     *
     * The provided node will be rendered as an immediate sibling of the
     * component children; for displaying visually distant indicators, a portal
     * is recommended.
     *
     * If this is omitted, no visual will be displayed. This can be used in
     * conjunction with `useActivityIndicatorStatus` to render the visual
     * indicator as a descendant of this component, rather than an immediate
     * child.
     */
    indicator?: ReactNode | SelfHidingIndicator;
}> = ({ indicator, children }) => {
    const registered = useRef(new Set<number>());
    /**
     * Whether or not the indicator should be visible right now.
     */
    const [isIndicating, setIndicateStatus] = useState(false);
    /**
     * The value for the mutator function context. This is consumed by
     * `useActivityIndicator` to talk to this component. We memoize this
     * once so it never causes rerenders.
     */
    const registrar = useMemo(
        () => ({
            register() {
                const id = uniqueId++;
                const wasEmpty = !registered.current.size;
                registered.current.add(id);
                if (wasEmpty) setIndicateStatus(true);
                return () => {
                    registered.current.delete(id);
                    if (!registered.current.size) setIndicateStatus(false);
                };
            },
        }),
        [],
    );

    return (
        <ActivityIndicatorContext.Provider value={registrar}>
            <ActivityStatusContext.Provider value={isIndicating}>
                {children}
                {typeof indicator === 'function' && !isElement(indicator)
                    ? indicator(isIndicating)
                    : isIndicating && indicator}
            </ActivityStatusContext.Provider>
        </ActivityIndicatorContext.Provider>
    );
};

/**
 * Register a data dependency with the nearest `ActivityIndicator` parent to show
 * an indicator when there is stale data on display or a background operation in
 * progress.
 *
 * @param hasActivity Whether or not the hook caller has stale data (e.g. the
 * presented data isn't the latest data) or is performing some background task.
 * @param timeoutBeforeShow Amount of time in ms that `hasActivity` must be
 * `true` uninterrupted before it will ask the context to render the indicator.
 * This defaults to 250ms.
 */
export const useActivityIndicator = (
    hasActivity: boolean,
    timeoutBeforeShow: number = 250,
): void => {
    const context = useContext(ActivityIndicatorContext);
    const [show, setShow] = useState(false);
    useTimeout(() => setShow(true), hasActivity && timeoutBeforeShow);
    useEffect(() => (show ? context.register() : undefined), [context, show]);
    useDebugValue(
        hasActivity ? (show ? 'Showing' : 'Waiting to show') : 'Not stale',
    );

    if (!hasActivity && show) setShow(false);
};

/**
 * Get whether or not the ancestor `ActivityIndicator` is currently indicating.
 * This can be used to insert the visual indicator element as a descendant of
 * the context provider, rather than an immediate child.
 */
export const useActivityIndicatorStatus = (): boolean => {
    const status = useContext(ActivityStatusContext);
    useDebugValue(status);
    return status;
};
