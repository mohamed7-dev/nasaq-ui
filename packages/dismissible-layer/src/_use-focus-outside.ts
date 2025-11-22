import React from "react";
import { type FocusOutsideEvent } from "./types";
import { useCallbackRef } from "@nasaq/use-callback-ref";
import { dispatchAndHandleCustomEvents } from "./_utils";
import { FOCUS_OUTSIDE } from "./constants";

/**
 * @description
 * It runs only when the focus event is outside the element(react tree root).
 */
function useFocusOutside(
  onFocusOutside?: (event: FocusOutsideEvent) => void,
  ownerDocument: Document = globalThis?.document
) {
  const handleFocusOutside = useCallbackRef(onFocusOutside) as EventListener;
  const isFocusInsideReactTreeRef = React.useRef(false);

  React.useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      if (event.target && !isFocusInsideReactTreeRef.current) {
        const eventDetail = { originalEvent: event };
        dispatchAndHandleCustomEvents(
          FOCUS_OUTSIDE,
          handleFocusOutside,
          eventDetail,
          {
            discrete: false,
          }
        );
      }
    };
    ownerDocument.addEventListener("focusin", handleFocus);
    return () => ownerDocument.removeEventListener("focusin", handleFocus);
  }, [ownerDocument, handleFocusOutside]);

  return {
    onFocusCapture: () => (isFocusInsideReactTreeRef.current = true),
    onBlurCapture: () => (isFocusInsideReactTreeRef.current = false),
  };
}

export { useFocusOutside };
