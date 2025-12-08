import React, { type KeyboardEvent } from "react";
import {
  AUTOFOCUS_ON_MOUNT,
  AUTOFOCUS_ON_UNMOUNT,
  EVENT_OPTIONS,
  FOCUS_SCOPE_NAME,
} from "./constants";
import { Primitive } from "@nasaq/primitive";
import { useComposeRefs } from "@nasaq/use-compose-refs";
import {
  focus,
  focusFirst,
  focusScopesStack,
  getActiveElementsInContainer,
  getTabbableEdges,
  removeLinks,
} from "./utils";
import { useCallbackRef } from "@nasaq/use-callback-ref";

type FocusScopeRef = React.ComponentRef<typeof Primitive.div>;

interface FocusScopeProps
  extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * When `true`, tabbing from last item will focus first tabbable
   * and shift+tab from first item will focus last tabbable.
   * @defaultValue false
   */
  loop?: boolean;

  /**
   * When `true`, focus cannot escape the focus scope via keyboard,
   * pointer, or a programmatic focus.
   * @defaultValue false
   */
  trapped?: boolean;

  /**
   * Event handler called when auto-focusing on mount.
   * Can be prevented.
   */
  onMountAutoFocus?: (event: Event) => void;

  /**
   * Event handler called when auto-focusing on unmount.
   * Can be prevented.
   */
  onUnmountAutoFocus?: (event: Event) => void;
}

const FocusScope = React.forwardRef<FocusScopeRef, FocusScopeProps>(
  function FocusScope(props, forwardedRef) {
    const {
      loop,
      trapped,
      onMountAutoFocus: onMountAutoFocusProp,
      onUnmountAutoFocus: onUnmountAutoFocusProp,
      ...rest
    } = props;
    const [container, setContainer] = React.useState<HTMLElement | null>(null);
    const composedRefs = useComposeRefs(forwardedRef, (node) =>
      setContainer(node)
    );
    const lastFocusedElement = React.useRef<HTMLElement | null>(null);
    const onMountAutoFocus = useCallbackRef(onMountAutoFocusProp);
    const onUnmountAutoFocus = useCallbackRef(onUnmountAutoFocusProp);

    const focusScope = React.useRef({
      paused: false,
      pause() {
        this.paused = true;
      },
      resume() {
        this.paused = false;
      },
    }).current;

    // this effect is responsible for focus trapping
    React.useEffect(() => {
      if (!trapped) return;
      const handleFocusIn = (e: FocusEvent) => {
        if (!container || focusScope.paused) return;
        // Why?: it brings the focus back to the last focused element in the container
        // if the currently focused element is outside the container
        const focusedElement = e.target as HTMLElement | null;
        if (container?.contains(focusedElement)) {
          lastFocusedElement.current = focusedElement;
        } else {
          // it means that the the focusedElement is outside the scope (container)
          // so we need to re-focus the last focused element
          focus(lastFocusedElement.current, { select: true });
        }
      };

      const handleFocusOut = (e: FocusEvent) => {
        if (!container || focusScope.paused) return;
        // why?: it brings the focus back to the last focused element when it's **about** to move
        // to an element outside the scope

        // get the element about to be focused
        const elementAboutToBeFocused = e.relatedTarget as HTMLElement | null;

        if (elementAboutToBeFocused) {
          if (!container.contains(elementAboutToBeFocused)) {
            focus(lastFocusedElement.current, { select: true });
          }
        }

        // e.target is set to null in 2 cases:
        // 1. when the user moves away from the tab, browser, or app
        // 2. when the focused element gets removed from  the dom (only in chrome)
        // ------> in this case, leave it to the browser to handle it
        return undefined;
      };

      // focusin unlike focus, bubbles that's why we are listening on document
      // it gets triggered when the focus moves to dom element
      document.addEventListener("focusin", handleFocusIn);
      // focusout unlike focus, bubbles that's why we are listening on document
      // it gets triggered when the focus leaves dom element and about to move to another one
      document.addEventListener("focusout", handleFocusOut);

      const handleMutations = (mutations: MutationRecord[]) => {
        // why?: if the focus moves back to the body which occurs when the focused element gets removed from the DOM
        // we need to re-focus the container

        const focusedElement = document.activeElement as HTMLElement | null;

        if (focusedElement === document.body) {
          mutations.forEach((mutation) => {
            if (mutation.removedNodes.length > 0) focus(container);
          });
        }
      };
      const mutation = new MutationObserver(handleMutations);

      if (container)
        mutation.observe(container, { childList: true, subtree: true });

      return () => {
        document.removeEventListener("focusin", handleFocusIn);
        document.removeEventListener("focusout", handleFocusOut);
        mutation.disconnect();
      };
    }, [container, trapped, focusScope.paused]);

    // this effect is responsible for auto-focusing when mounting and unmounting
    React.useEffect(() => {
      if (!container) return;

      focusScopesStack.add(focusScope); // add the current FocusScope to the stack which is useful in tracking nested focus scopes

      // when mounted: focus the first active element in the container

      // keep the last focused element to move focus back to it when the focus scope unmounts
      // in the context of modals this is going to be the trigger button
      const previouslyFocusedElement =
        document.activeElement as HTMLElement | null;

      if (container.contains(previouslyFocusedElement)) {
        return undefined;
      } else {
        const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
        container.addEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
        container.dispatchEvent(mountEvent);
        if (!mountEvent.defaultPrevented) {
          focusFirst(removeLinks(getActiveElementsInContainer(container)), {
            select: true,
          });

          // for some reason the fist focused element in the container is not focused (may be there are no active elements)
          // so we fallback to focusing the container itself
          if (document.activeElement === previouslyFocusedElement) {
            focus(container);
          }
        }
      }

      return () => {
        container.removeEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
        const unmountEvent = new CustomEvent(
          AUTOFOCUS_ON_UNMOUNT,
          EVENT_OPTIONS
        );
        container.addEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
        container.dispatchEvent(unmountEvent);
        if (!unmountEvent.defaultPrevented) {
          // when unmounting: the focus must return back to the previously focused element if any
          // or body if there is no previouslyFocusedElement
          focus(previouslyFocusedElement ?? document.body, { select: true });
        }
        // we need to remove the listener after we `dispatchEvent`
        container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);

        focusScopesStack.remove(focusScope);
      };
    }, [container, onMountAutoFocus, onUnmountAutoFocus, focusScope]);

    // this listens to the keydown event on the container only
    // to enable focus looping when focus are at the edges
    const handleKeydown = React.useCallback(
      (e: KeyboardEvent) => {
        if ((!loop && !trapped) || focusScope.paused) return;

        const isTabKey =
          e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey;
        const focusedElement = document.activeElement as HTMLElement | null;

        if (isTabKey && focusedElement) {
          const container = e.currentTarget as HTMLElement;
          const [first, last] = getTabbableEdges(container);
          const hasTabbableElementsInside = first && last;
          if (hasTabbableElementsInside) {
            if (!e.shiftKey && focusedElement === last) {
              e.preventDefault();
              if (loop) focus(first, { select: true });
            } else if (e.shiftKey && focusedElement === first) {
              e.preventDefault();
              if (loop) focus(last, { select: true });
            }
          }
        }
      },
      [loop, trapped, focusScope.paused]
    );

    return (
      <Primitive.div
        tabIndex={-1}
        {...rest}
        ref={composedRefs}
        onKeyDown={handleKeydown}
      />
    );
  }
);

FocusScope.displayName = FOCUS_SCOPE_NAME;

const Root = FocusScope;
export {
  FocusScope,
  //
  Root,
};
export type { FocusScopeProps };
