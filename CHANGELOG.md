# Changelog

## 0.3.0 (Mar 18, 2020)

- Add hooks which make it easier to work with async actions inside React components (`usePromise`, `usePromiseState`, and `useAsyncOperation`)

## 0.2.1 (May 23, 2019)

- Accept a React node as `failureFallback` for `RemoteSuspense` to better show static errors. [#2](https://github.com/ExtraHop/ts-remote-data-react/pull/2)

## 0.2.0 (May 21, 2019)

- Add `ActivityIndicator` component and hooks.
  This functionality enables background update UI when using `useRemoteLatest`.