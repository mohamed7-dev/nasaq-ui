import * as React from "react";
import { useCallbackRef } from "@nasaq/use-callback-ref";

/**
 * @description
 * This hook listens for when the escape key is down and calls the provided callback.
 */
function useEscapeKeydown(
  onEscapeKeyDownProp?: (event: KeyboardEvent) => void,
  ownerDocument: Document = globalThis?.document
) {
  const onEscapeKeyDown = useCallbackRef(onEscapeKeyDownProp);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscapeKeyDown(event);
      }
    };
    ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      ownerDocument.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
  }, [onEscapeKeyDown, ownerDocument]);
}

export { useEscapeKeydown };
