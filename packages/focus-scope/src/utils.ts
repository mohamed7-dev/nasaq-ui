/**
 * @description
 * Get first and last tabbable elements in the list
 */
export function getTabbableEdges(container: HTMLElement) {
  const activeElements = getActiveElementsInContainer(container);
  const firstEl = findVisible(activeElements, container);
  const lastEl = findVisible(activeElements.reverse(), container);

  return [firstEl, lastEl] as const;
}

/**
 * @description
 * Get list of all active elements that can be tabbed into
 */
export function getActiveElementsInContainer(container: HTMLElement) {
  const nodes: HTMLElement[] = [];
  const treeWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node: any) => {
        // node is considered active if it's not hidden, or disabled, and also the tabIndex needs to be >= 0
        if (
          node.disabled ||
          node.hidden ||
          (node.tagName === "INPUT" && node.type === "hidden")
        )
          return NodeFilter.FILTER_SKIP;
        return node.tabIndex >= 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    }
  );

  while (treeWalker.nextNode())
    nodes.push(treeWalker.currentNode as HTMLElement);

  return nodes;
}

/**
 * @description
 * find the first visible element in a list
 */
function findVisible(elements: HTMLElement[], container: HTMLElement) {
  for (const element of elements) {
    if (!isHidden(element, { upTo: container })) return element;
  }
}

function isHidden(element: HTMLElement, { upTo }: { upTo: HTMLElement }) {
  if (getComputedStyle(element).visibility === "hidden") return true;

  while (element) {
    // we stop at upTo, and return false which indicates that the element is visible
    if (upTo !== undefined && element === upTo) return false;
    if (getComputedStyle(element).display === "none") return true;
    element = element.parentElement as HTMLElement;
  }

  return false;
}

type FocusableTarget = HTMLElement | { focus(): void };

/**
 * Focus an element and optionally select it
 */
export function focus(
  element?: FocusableTarget | null,
  { select = false } = {}
) {
  if (element && element.focus) {
    const previouslyFocusedElement = document.activeElement;

    element.focus({ preventScroll: true });
    // only select if its not the same element, it supports selection and we need to select
    if (
      element !== previouslyFocusedElement &&
      isSelectableInput(element) &&
      select
    )
      element.select();
  }
}

function isSelectableInput(
  element: any
): element is FocusableTarget & { select: () => void } {
  return element instanceof HTMLInputElement && "select" in element;
}

export function removeLinks(items: HTMLElement[]) {
  return items.filter((item) => item.tagName !== "A");
}

/**
 * Attempts focusing the first element in a list of candidates.
 * Stops when focus has actually moved.
 */
export function focusFirst(candidates: HTMLElement[], { select = false } = {}) {
  const previouslyFocusedElement = document.activeElement;
  for (const candidate of candidates) {
    focus(candidate, { select });
    // loop will be broken when at least one of the candidates gets focused
    if (document.activeElement !== previouslyFocusedElement) return;
  }
}

// ________________________________FocusScope_____________________________________________
type FocusScopeAPI = { paused: boolean; pause(): void; resume(): void };

// this stack keeps tracing of all focus scopes with active one being on top of the stack
// this is useful for nested scopes e.g. dialog that triggers another dialog
export const focusScopesStack = createFocusScopesStack();

function createFocusScopesStack() {
  let stack: FocusScopeAPI[] = [];

  return {
    add(focusScope: FocusScopeAPI) {
      // pause the currently active focus scope (at the top of the stack)
      const activeFocusScope = stack[0];
      if (focusScope !== activeFocusScope) {
        activeFocusScope?.pause();
      }
      // remove in case it already exists (because we'll re-add it at the top of the stack)
      stack = arrayRemove(stack, focusScope);
      stack.unshift(focusScope);
    },

    remove(focusScope: FocusScopeAPI) {
      stack = arrayRemove(stack, focusScope);
      stack[0]?.resume();
    },
  };
}

function arrayRemove<T>(array: T[], item: T) {
  const updatedArray = [...array];
  const index = updatedArray.indexOf(item);
  if (index !== -1) {
    updatedArray.splice(index, 1);
  }
  return updatedArray;
}
