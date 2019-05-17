import { useRef } from 'react';
import RemoteData from 'ts-remote-data';

/**
 * Once a component has completed its initial load, it may not want to return to
 * the loading state while waiting for a data update to complete. This hook
 * takes a `RemoteData` and decides whether to return that value or the previous
 * value.
 *
 * @returns The previous value if and only if 1) the current data is in the
 * `NOT_ASKED` or `LOADING` state and 2) the previous value was in the
 * ready-state.
 */
export const useRemoteLatest = <T>(data: RemoteData<T>): RemoteData<T> => {
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

    return shown.current;
};
