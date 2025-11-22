import * as React from "react";

/**
 * @description
 * This is a polyfill for `useLayoutEffect` that works in both client and server side.
 */
const useLayoutEffect = globalThis.document ? React.useLayoutEffect : () => {};

export { useLayoutEffect };
