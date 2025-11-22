import React from "react";
import { Primitive } from "@nasaq/primitive";
import { useComposeRefs } from "@nasaq/use-compose-refs";
import { composeEventHandlers } from "@nasaq/core-primitive";
import { useEscapeKeydown } from "@nasaq/use-escape-keydown";
import { usePointerDownOutside } from "./_use-pointer-down-outside";
import type { FocusOutsideEvent, PointerDownOutsideEvent } from "./types";
import { CONTEXT_UPDATE, DISMISSIBLE_LAYER_NAME } from "./constants";
import { useFocusOutside } from "./_use-focus-outside";
import { DismissibleLayerContext, dispatchUpdate } from "./_utils";

interface DismissibleLayerProps
  extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * When `true`, hover/focus/click interactions will be disabled on elements outside
   * the `DismissibleLayer`. Users will need to click twice on outside elements to
   * interact with them: once to close the `DismissibleLayer`, and again to trigger the element.
   */
  disableOutsidePointerEvents?: boolean;

  /**
   * Handler called when the `DismissibleLayer` should be dismissed
   */
  onDismiss?: () => void;

  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;

  /**
   * Event handler called when the a `pointerdown` event happens outside of the `DismissibleLayer`.
   * Can be prevented.
   */
  onPointerDownOutside?: (event: PointerDownOutsideEvent) => void;

  /**
   * Event handler called when an interaction happens outside the `DismissibleLayer`.
   * Specifically, when a `pointerdown` event happens outside or focus moves outside of it.
   * Can be prevented.
   */
  onInteractOutside?: (
    event: PointerDownOutsideEvent | FocusOutsideEvent
  ) => void;
  /**
   * Event handler called when the focus moves outside of the `DismissibleLayer`.
   * Can be prevented.
   */
  onFocusOutside?: (event: FocusOutsideEvent) => void;
}

export type DismissibleLayerRef = React.ComponentRef<typeof Primitive.div>;

const DismissibleLayer = React.forwardRef<
  DismissibleLayerRef,
  DismissibleLayerProps
>(function DismissibleLayer(props, forwardedRef) {
  const {
    disableOutsidePointerEvents,
    onDismiss,
    onEscapeKeyDown,
    onPointerDownOutside,
    onInteractOutside,
    onFocusOutside,
    ...restProps
  } = props;
  const [node, setNode] = React.useState<DismissibleLayerRef | null>(null);
  const [_, forceUpdate] = React.useState({});
  const composedRefs = useComposeRefs(forwardedRef, (node) => setNode(node));
  const ownerDocument = node?.ownerDocument ?? globalThis?.document;
  const context = React.useContext(DismissibleLayerContext);

  //helpers
  const layers = Array.from(context.layers);
  const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1); // prettier-ignore
  const highestLayerWithOutsidePointerEventsDisabledIndex = layers.indexOf(highestLayerWithOutsidePointerEventsDisabled!); // prettier-ignore
  const index = node ? layers.indexOf(node) : -1;
  const isBodyPointerEventsDisabled =
    context.layersWithOutsidePointerEventsDisabled.size > 0;
  const isPointerEventsEnabled =
    index >= highestLayerWithOutsidePointerEventsDisabledIndex;

  // refs
  const originalPointerEvents = React.useRef<string | null>(null);

  // when component mounts, add add current layer to the context
  React.useEffect(() => {
    if (!node) return;
    if (disableOutsidePointerEvents) {
      // it runs for the first layer only
      if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
        originalPointerEvents.current = ownerDocument.body.style.pointerEvents;
        ownerDocument.body.style.pointerEvents = "none";
      }
      context.layersWithOutsidePointerEventsDisabled.add(node);
    }
    context.layers.add(node);
    dispatchUpdate();
    return () => {
      if (
        disableOutsidePointerEvents &&
        context.layersWithOutsidePointerEventsDisabled.size === 1 &&
        originalPointerEvents.current
      ) {
        ownerDocument.body.style.pointerEvents = originalPointerEvents.current;
      }
    };
  }, [node, ownerDocument, disableOutsidePointerEvents, context]);

  // when component unmounts, remove current layer from the context, and
  // keep pointer events disabled if there are other layers with outside pointer events disabled
  /**
   * We purposefully prevent combining this effect with the `disableOutsidePointerEvents` effect
   * because a change to `disableOutsidePointerEvents` would remove this layer from the stack
   * and add it to the end again so the layering order wouldn't be _creation order_.
   * We only want them to be removed from context stacks when unmounted.
   */
  React.useEffect(() => {
    return () => {
      if (!node) return;
      context.layers.delete(node);
      context.layersWithOutsidePointerEventsDisabled.delete(node);
      dispatchUpdate();
    };
  }, [node, ownerDocument, context]);

  // force re-render when context updates
  React.useEffect(() => {
    const handleUpdate = () => forceUpdate({});
    document.addEventListener(CONTEXT_UPDATE, handleUpdate);
    return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
  }, []);

  useEscapeKeydown((e) => {
    const isTopLayer = index === layers.length - 1;
    if (!isTopLayer) return;
    onEscapeKeyDown?.(e);
    if (!e.defaultPrevented && onDismiss) {
      e.preventDefault();
      onDismiss();
    }
  }, ownerDocument);

  const pointerDownOutside = usePointerDownOutside((e) => {
    const target = e.target as HTMLElement;
    const isPointerDownOnBranch = [...context.branches].some((branch) =>
      branch.contains(target)
    );
    // if the layer is above the highest layer with outside pointer events disabled
    // allow it to receive pointerdown events
    // also, if the pointer down event is on a branch prevent dismissing
    if (!isPointerEventsEnabled || isPointerDownOnBranch) return;
    onPointerDownOutside?.(e);
    onInteractOutside?.(e);
    if (!e.defaultPrevented) onDismiss?.();
  }, ownerDocument);

  const focusOutside = useFocusOutside((e) => {
    const target = e.target as HTMLElement;
    const isFocusInBranch = [...context.branches].some((branch) =>
      branch.contains(target)
    );
    // if the focus outside event targeted an element which is part of
    // a branch then don't dismiss
    if (isFocusInBranch) return;
    onFocusOutside?.(e);
    onInteractOutside?.(e);
    if (!e.defaultPrevented) onDismiss?.();
  });

  return (
    <Primitive.div
      {...restProps}
      style={{
        pointerEvents: isBodyPointerEventsDisabled
          ? isPointerEventsEnabled
            ? "auto"
            : "none"
          : undefined,
        ...restProps.style,
      }}
      ref={composedRefs}
      onPointerDownCapture={composeEventHandlers(
        restProps.onPointerDownCapture,
        // this is what we use to track if the pointerdown event is inside the element
        pointerDownOutside.onPointerDownCapture
      )}
      onFocusCapture={composeEventHandlers(
        restProps.onFocusCapture,
        focusOutside.onFocusCapture
      )}
      onBlurCapture={composeEventHandlers(
        restProps.onBlurCapture,
        focusOutside.onBlurCapture
      )}
    />
  );
});

DismissibleLayer.displayName = DISMISSIBLE_LAYER_NAME;

const Root = DismissibleLayer;
export { DismissibleLayer, Root };
export type { DismissibleLayerProps };
