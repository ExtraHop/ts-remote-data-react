// COPYRIGHT 2020 BY EXTRAHOP NETWORKS, INC.
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.

import { useDebugValue, useEffect, useState } from 'react';
import RemoteData from 'ts-remote-data';

/**
 * Create a `RemoteData` view of a `Promise`, which will trigger a rerender
 * when the promise settles. This should be used when a component is given a
 * promise by some external async operation; for operations initiated by the
 * component, see {@link useAsyncOperation} instead.
 *
 * @param promise The current promise to watch. If the promise changes, further
 * updates to the old promise will be ignored. If `undefined` is passed, then
 * `NOT_ASKED` will be returned.
 */
export const usePromise = <T extends unknown>(
    promise?: Promise<T>,
): RemoteData<T> => {
    const [data, setData] = useState<RemoteData<T>>(
        // Promises have no concept of a "not-started" state, so if we are given
        // a non-void promise we jump straight to the `LOADING` state to remain
        // in sync.
        promise ? RemoteData.LOADING : RemoteData.NOT_ASKED,
    );

    useEffect(() => {
        /**
         * We shouldn't call `setData` on promise settling if a new promise was
         * passed or if the component was unmounted before settling. To track
         * that, we use this boolean, which is flipped to `false` during effect
         * cleanup.
         */
        let isStillRelevant = true;
        if (!promise) {
            setData(RemoteData.NOT_ASKED);
            return;
        }

        setData(RemoteData.LOADING);

        promise.catch(RemoteData.failWith).then(result => {
            if (isStillRelevant) setData(result);
        });

        return () => {
            isStillRelevant = false;
        };
    }, [promise]);

    useDebugValue(data);

    return data;
};
