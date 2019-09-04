# ts-remote-data-react

This package provides React hooks and components to work with the `RemoteData` type defined by [`ts-remote-data`](https://www.npmjs.com/package/ts-remote-data).

## Example

Imagine a UI that synchronously renders a line chart.

```typescriptreact
import React, { FunctionComponent } from 'react';

const LineChart: FunctionComponent<{
    timeRange: { start: number; end: number; };
    values: Series[];
    error?: unknown;
}> = props => (
    <TimeAxisChart range={props.timeRange}>
        <LineSeriesLayer data={props.values} error={props.error} />
    </TimeAxisChart>
);
```

This component works, but it's not the easiest thing to work with.
It can't be rendered until we know the values for both `timeRange` and `values`.
What happens while those are being fetched from the server?
How about if something goes wrong fetching the values?
It'd be easy to forget to check `error` before trying to do something with `values`, and if the caller is passing `[]` in the error case, we might not even realize something's gone wrong until our code is running.

We'd like the following behaviors:

1. We will wait 200ms for the server to give us the current time range, but if it takes longer than that we want a loading spinner.
2. As soon as the time range is available, we'll start rendering axes, with no series data.
3. In case of error, we'd like to show that error in lieu of any series information.
4. Once the series data is available, if the user changes the viewed time range, we'll animate the outgoing data to its new x-axis position, then seamlessly swap in the new data without bouncing back to a loading state.

To do this, we'll use the `RemoteSuspense` component and the `useRemoteLatest` hook this package provides.

```typescriptreact
import React, { FunctionComponent } from 'react';
import RemoteData from 'ts-remote-data';
import { RemoteSuspense, useRemoteLatest } from 'ts-remote-data-react';

const LineChart: FunctionComponent<{
    timeRange: RemoteData<{ start: number; end: number }>;
    values: RemoteData<Series[]>;
}> = props => {
    const values = useRemoteLatest(props.values);
    return (
        <RemoteSuspense
            data={props.timeRange}
            loadingTimeout={200}
            loadingFallback={<LoadingSpinner />}
        >
            {timeRange => (
                <TimeAxisChart range={timeRange}>
                    <LineSeriesLayer
                        data={RemoteData.getOr(values, [])}
                        error={RemoteData.asFailure(values)}
                    />
                </TimeAxisChart>
            )}
        </RemoteSuspense>
    );
};
```

Let's step through this to understand exactly what's happening.

First, by accepting a `RemoteData` for the `timeRange` and `values` props, our chart is saying that it can be rendered immediately.
Because every `T` is a `RemoteData<T>`, we can change the prop types of our component **without updating any calling code**. This makes it really easy to incrementally add better loading states to our existing codebase.

Once we're inside the component, we wrap the values we're passed in `useRemoteLatest`.
After `values` is in the ready state, we'll keep showing that value if the component is rerendered with `values` going back to the loading state.
This way, if the user changes the time range, our `LineSeriesLayer` will keep getting the old data, so it can animate the series moving out of view to the left or right, and then will instantly bring in the new data once it's ready.

Next, the `RemoteSuspense` component lets us keep `TimeAxisChart` unmodified by adapting our `RemoteData` into something a synchronously-available value for its child function.
The component is similar to `React.Suspense`, with a couple key differences:

1. Because failure is a first-class concept in `RemoteData`, we have separate fallbacks for the loading and failure states.
   In this case, we're not using `failureFallback`, but we are using the `loadingFallback` to show a spinner.
   The `loadingTimeout` indicates that we'll wait 200ms to render the spinner, rather than the component's default 150ms.
2. Within the `RemoteSuspense` child, we reference the render prop argument, rather than the value in `props`.
   We think this is more explicit - for example, you can see that `timeRange` is protected by the `RemoteSuspense` but that `values` is not - and that the control flow is less surprising.
   Using `RemoteData.all` and in the `data` prop and then array destructuring of the render prop argument, you can very concisely join multiple data dependencies together before rendering the children.

Finally, we use the `RemoteData.getOr` and `RemoteData.asFailure` functions to satisfy the prop types of `LineSeriesLayer` while making sure that `LineChart` cannot simultaneously have an error and series data.

## Activity Indicator

Now that we have a `LineChart` component which handles remote data for us, we can use that in a page. However, imagine we get a complaint: When users change the time range the new data can take 2 seconds to arrive. Users think the page is not responding, and are confused.

We don't want to go back to tearing down the chart and showing a loading spinner; that undoes the work we've done on making a smooth experience. Worse, if there were several charts on-screen, the user would see an entire meadow's worth of loading spinners come into bloom.

We want something to show **an** indicator when background activity is occurring. In keeping with React's declarative philosophy, we'd like this to be declarative, and we'd rather it not be something devs have to remember to add themselves.

This is the problem `ActivityIndicator` solves. It takes advantage of the fact that displaying stale data strongly implies background activity to automatically track when data updates are in-flight, and then renders an element of your choice when that update is taking too long.

The `ActivityIndicator` is not designed for use on initial data loads, as those cases are best handled closer to the not-yet-initialized UI by using `RemoteSuspense`. However, it is possible to directly declare background activity is occurring using the `useActivityIndicator` hook; this can be very useful when some task is in progress that doesn't have a clear UI surface.

## usePromise and useAsyncOperation

React's `useEffect` hook deliberately doesn't support async operations, as components need to think about the possibility of user input invalidating an async task before it completes.
However, it's common to need an ad-hoc `fetch` or similar call inside a component, and combining `useEffect` with `useState` every time is boilerplate that can hide subtle race conditions or other bugs.

This package provides three hooks to solve the issue: `usePromise`, `usePromiseState`, and `useAsyncOperation`.

`usePromise` is appropriate in cases where your component receives a `Promise` that it didn't initiate.
For example, if you have a module-scope function which - after being called once - always returns the same promise, your component doesn't "own" that promise; it is merely subscribing to the results.
Calling `usePromise(somePromise)` will return a `RemoteData<T>` and will add `then` and `catch` handlers to the promise.
If you change the promise before it completes, further updates to the old promise will be ignored.

`usePromiseState` is the async equivalent of `useState`.
Like `usePromise`, it gives you a `RemoteData` view of some Promise, but you control when it updates, and changing it forces a rerender.
If a user can initiate an async action, such as testing connectivity to a cloud service, you can have the `onClick` event of the button set the promise and start the test.

`useAsyncOperation` is for cases where your component needs to make a new promise.
For example, the user chooses a category of products and you then fetch the best sellers in that category.
This hook takes two arguments: The async function to invoke, and the dependencies array.
To allow cancellation of outstanding requests due to user actions, the provided async function will be given an `AbortSignal` as its first argument.
When the `deps` change, the signal will be invoked; this allows you to cancel outstanding fetches or other now-irrelevant async work.

## Tips / Best Practices

* Rather than directly using `RemoteSuspense` in your feature code, create components for your project which capture your common data fetching behaviors.
  For example, `RemoteDataPanel` might include a `div` wrapper for adding CSS grid properties and would pull in your own centered loading spinner, while `RemoteDataLine` would show a skeleton line until its data was ready.
* When using `useRemoteLatest`, you may want a data change _not_ to preserve old data - for example, a text-based search may want to immediately throw out old results when the user changes their search string.
  In this case, wrap the component calling `useRemoteLatest` in a component whose `key` prop is set to be the value that should cause old results not to appear.
  React's own behavior with keys will then cause the component to be recreated, which will prevent it from accessing the old data.
* `useAsyncOperation` provides an `AbortSignal` so your function can avoid doing extra work if the result becomes irrelevant.
  While it's not _necessary_ to consume the signal - the hook will still prevent a stale promise from causing re-renders - but checking the signal between calculation steps or passing it to `fetch` will reduce the CPU and network usage of your app.
