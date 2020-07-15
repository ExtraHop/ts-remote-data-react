// COPYRIGHT 2020 BY EXTRAHOP NETWORKS, INC.
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.

import { useCallback, useEffect, useMemo } from 'react';
import RemoteData from 'ts-remote-data';

import { usePromise } from './usePromise';

/**
 * Noop function that cannot return.
 */
const never = (): never => {
    throw new Error('Invariant violation');
};

/**
 * Create an async operation that will be canceled whenever its dependencies
 * change, and that will force a rerender when the promise completes.
 *
 * @see usePromise for the case when your component receives a promise it does
 * not initiate.
 *
 * @param op The async function to run. This is given an abort signal which will
 * be triggered if the `deps` change and invalidate the outstanding promise.
 * Callers are not required to heed this, however, as stale promises will not
 * cause rerenders.
 *
 * @param deps The array of values that are used by the operation. Value changes
 * to these will result in a new promise being created and the old one being
 * sent an abort signal.
 *
 * @returns A `RemoteData` representation of the promise's results. The hook
 * forces a rerender when the promise resolves or rejects. If `op === undefined`
 * the hook will return `RemoteData.NOT_ASKED`.
 */
export const useAsyncOperation = <T extends unknown>(
    op: ((signal: AbortSignal) => Promise<T>) | undefined,
    // tslint:disable-next-line: no-any
    deps: ReadonlyArray<any>,
): RemoteData<T> => {
    const runner = useCallback(op || never, deps);
    const controller = useMemo(() => new AbortController(), [runner]);
    const promise = useMemo(
        () => (op ? runner(controller.signal) : undefined),
        [runner, controller],
    );
    useEffect(() => () => controller.abort(), [controller, promise]);
    return usePromise(promise);
};
