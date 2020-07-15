// COPYRIGHT 2020 BY EXTRAHOP NETWORKS, INC.
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.

import { Dispatch, SetStateAction, useDebugValue, useState } from 'react';
import RemoteData from 'ts-remote-data';

import { usePromise } from './usePromise';

/**
 * A representation of the states valid in the `usePromiseState` hook. Promises
 * have no native way of existing without being started, so `undefined` is used
 * to represent that case.
 */
type PromiseStateValue<T> = Promise<T> | undefined;

/**
 * A `useState` wrapper around `usePromise`. When a promise is created in
 * response to a user action and needs to be stored, this hook is appropriate.
 *
 * @param initialValue The initial state. When passing `undefined`, explicitly
 * declare the type of the value in the promise using the type parameter.
 *
 * @template T The value in the promise when it resolves.
 *
 * @returns A `RemoteData` representation of the current promise state, and a
 * setter function that can be used to update the promise and trigger a render.
 */
export const usePromiseState = <T>(
    initialValue?: PromiseStateValue<T> | (() => PromiseStateValue<T>),
): [RemoteData<T>, Dispatch<SetStateAction<PromiseStateValue<T>>>] => {
    const [promise, setPromise] = useState(initialValue);
    const value = usePromise(promise);
    useDebugValue(value);
    return [value, setPromise];
};
