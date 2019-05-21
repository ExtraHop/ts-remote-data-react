import { useRef, useDebugValue } from 'react';
import RemoteData from 'ts-remote-data';

import { useActivityIndicator } from '.';

export interface RemoteLatestOptions {
    /**
     * When `true`, the hook will not report stale data to `ActivityIndicator`.
     * This can be used to prevent an activity indicator showing when a
     * component is mounted but out of view.
     */
    hideIndicator: boolean;
    /**
     * When set, the amount of time to keep stale data before exposing the
     * activity indicator.
     */
    indicatorTimeout: number;
}

/**
 * Once a component has completed its initial load, it may not want to return to
 * the loading state while waiting for a data update to complete. This hook
 * takes a `RemoteData` and decides whether to return that value or the previous
 * value.
 *
 * This hook integrates with `ActivityIndicator` to report when it's showing
 * stale data. This enables UI to automatically show a background loading
 * visual when stale data is being displayed.
 *
 * @returns The previous value if and only if 1) the current data is in the
 * `NOT_ASKED` or `LOADING` state and 2) the previous value was in the
 * ready-state.
 */
export const useRemoteLatest = <T>(
    data: RemoteData<T>,
    options: Partial<RemoteLatestOptions> = {},
): RemoteData<T> => {
    const shown = useRef(data);

    // We now see if we can trade in for something better than what we've
    // got. If the incoming data is in one of the settled states, we'll snap
    // to it no matter what we were previously showing. Similarly, if we
    // weren't in the ready state, we'll accept anything.
    if (
        RemoteData.isReady(data) ||
        RemoteData.isFailure(data) ||
        !RemoteData.isReady(shown.current)
    ) {
        shown.current = data;
    }

    const isShowingOld = shown.current !== data;
    useActivityIndicator(
        isShowingOld && !options.hideIndicator,
        options.indicatorTimeout,
    );
    useDebugValue(`Showing ${isShowingOld ? 'old' : 'live'} data`);

    return shown.current;
};
