import { dispatchDiscreteCustomEvent } from "@nasaq/primitive";
import { CONTEXT_UPDATE } from "./constants";
import React from "react";
import type { DismissibleLayerBranchRef } from "./dismissible-branch";
import type { DismissibleLayerRef } from "./dismissible-layer";

/**
 * @description
 * Dispatches and handles custom events (discrete and continuous)
 */
export function dispatchAndHandleCustomEvents<
  E extends CustomEvent,
  OriginalEvent extends Event
>(
  name: string,
  handler: ((event: E) => void) | undefined,
  detail: { originalEvent: OriginalEvent } & (E extends CustomEvent<infer D>
    ? D
    : never),
  { discrete }: { discrete: boolean }
) {
  const event = new CustomEvent(name, {
    bubbles: false,
    cancelable: true,
    detail,
  });
  const target = detail.originalEvent.target;

  if (discrete) {
    dispatchDiscreteCustomEvent(target, event);
  } else {
    target.dispatchEvent(event);
  }
}

/**
 * @description
 * Dispatches update event to the document to notify other layers about changes
 */
export function dispatchUpdate() {
  const event = new CustomEvent(CONTEXT_UPDATE);
  document.dispatchEvent(event);
}

export const DismissibleLayerContext = React.createContext({
  layers: new Set<DismissibleLayerRef>(),
  layersWithOutsidePointerEventsDisabled: new Set<DismissibleLayerRef>(),
  branches: new Set<DismissibleLayerBranchRef>(),
});
