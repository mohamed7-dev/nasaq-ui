import React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T | null) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
function composeRefs<T>(...refs: PossibleRef<T>[]) {
  // @ts-expect-error - exact type of the node is unknown
  return (node) => {
    let hasCleanup = false;
    const react19Cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (typeof cleanup === "function" && !hasCleanup) {
        hasCleanup = true;
      }
      return cleanup;
    });
    // in react < 19, returning a value from a ref cb is not supported
    if (hasCleanup) {
      // return the cleanup function
      return () => {
        for (let i = 0; i < react19Cleanups.length; i++) {
          const cleanup = react19Cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}

/**
 * A custom hook that composes multiple refs
 * Accepts callback refs and RefObject(s)
 */
function useComposeRefs<T>(...refs: PossibleRef<T>[]): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}

export { composeRefs, useComposeRefs };
