import React from "react";
import { type PointerDownOutsideEvent } from "./types";
import { dispatchAndHandleCustomEvents } from "./_utils";
import { POINTER_DOWN_OUTSIDE } from "./constants";
import { useCallbackRef } from "@nasaq/use-callback-ref";

/**
 * @description
 * It runs only when the pointerdown event is outside the element.
 */
export function usePointerDownOutside(
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void,
  ownerDocument: Document = globalThis?.document
) {
  // by default, when the pointerdown event is inside the element, it will be true
  // and when it is outside, it will be false
  const isPointerInsideReactTreeRef = React.useRef(false);
  const handlePointerDownOutside = useCallbackRef(
    onPointerDownOutside
  ) as EventListener;
  const handleClickRef = React.useRef(() => {});

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target && !isPointerInsideReactTreeRef.current) {
        const eventDetail = {
          originalEvent: event,
        };
        function handleAndDispatchPointerDownOutsideEvent() {
          dispatchAndHandleCustomEvents(
            POINTER_DOWN_OUTSIDE,
            handlePointerDownOutside,
            eventDetail,
            { discrete: true }
          );
        }
        /**
         * On touch devices, we need to wait for a click event because browsers implement
         * a ~350ms delay between the time the user stops touching the display and when the
         * browser executes events. We need to ensure we don't reactivate pointer-events within
         * this timeframe otherwise the browser may execute events that should have been prevented.
         *
         * Additionally, this also lets us deal automatically with cancellations when a click event
         * isn't raised because the page was considered scrolled/drag-scrolled, long-pressed, etc.
         *
         * This is why we also continuously remove the previous listener, because we cannot be
         * certain that it was raised, and therefore cleaned-up.
         */
        if (event.pointerType === "touch") {
          ownerDocument.removeEventListener("click", handleClickRef.current);
          handleClickRef.current = handleAndDispatchPointerDownOutsideEvent;
          ownerDocument.addEventListener("click", handleClickRef.current, {
            once: true,
          });
        } else {
          handleAndDispatchPointerDownOutsideEvent();
        }
      }

      // reset the ref to false after the pointerdown event
      isPointerInsideReactTreeRef.current = false;
    };

    const timerId = window.setTimeout(() => {
      // this event gets triggered after the pointerdown event on the element(in capture phase vs bubble phase)
      /**
       * if this hook executes in a component that mounts via a `pointerdown` event, the event
       * would bubble up to the document and trigger a `pointerDownOutside` event. We avoid
       * this by delaying the event listener registration on the document.
       * This is not React specific, but rather how the DOM works, ie:
       * ```
       * button.addEventListener('pointerdown', () => {
       *   console.log('I will log');
       *   document.addEventListener('pointerdown', () => {
       *     console.log('I will also log');
       *   })
       * });
       */
      ownerDocument.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      ownerDocument.removeEventListener("pointerdown", handlePointerDown);
      ownerDocument.removeEventListener("click", handleClickRef.current);
    };
  }, [ownerDocument, handlePointerDownOutside]);

  return {
    // this is what we use to track if the pointerdown event is inside the element
    onPointerDownCapture: () => (isPointerInsideReactTreeRef.current = true),
  };
}
