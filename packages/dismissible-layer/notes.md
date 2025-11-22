## Why tracking layers is important?

Suppose:

You open a main modal **dialog A** with `disableOutsidePointerEvents = true.`
`body.pointerEvents = 'none'.`
A is added to both layers and layersWithOutsidePointerEventsDisabled.
Inside A, you open another **dialog B** (or a submenu, alert dialog, sheet) also with `disableOutsidePointerEvents = true.`
layersWithOutsidePointerEventsDisabled.size is already > 0, so it does not re-touch body.pointerEvents. It just tracks B in the set.

You close **dialog B**.
Cleanup removes B from the set.
Size becomes 1 (only A left), so the body is still disabled.
You close **dialog A**.
Cleanup sees size === 1 before removing A.
It restores body.pointerEvents to the original value, making the page interactive again.

## Why setTimeout in the usePointerDownOutside hook?

The setTimeout delay is important:
If the component mounts as a result of a pointerdown (e.g. opening a menu on click), the original pointerdown would otherwise bubble up and be seen as an “outside” click immediately.

Delaying registration means:
The pointerdown that caused the mount happens.
Then the listener is added.
So that initial interaction doesn’t erroneously count as outside.

## How Dismissible Layer Dom Element Handles Pointer Events Style?

`isBodyPointerEventsDisabled`
true when at least one DismissibleLayer has disableOutsidePointerEvents = true.
In that case, document.body.style.pointerEvents has been set to 'none', so nothing on the page is clickable by default.
`isPointerEventsEnabled`
true for layers at or above the “top-most” layer that disabled outside pointer events.
Those layers should remain interactive even though the body is blocked.

Resulting styles

If `isBodyPointerEventsDisabled` is false
`pointerEvents: undefined` → leave pointer-events alone; normal browser behavior.
If `isBodyPointerEventsDisabled` is true:
If `isPointerEventsEnabled` is true
`pointerEvents: 'auto'` → this layer can receive pointer events, overriding body’s 'none'.
If `isPointerEventsEnabled` is false
`pointerEvents: 'none'` → this layer is still non-interactive, effectively “behind” another modal.

## Conceptual role of “branching”:

In DismissibleLayer, branching is a way to declare extra DOM subtrees that should count as “inside” the layer, even though they are not DOM-children of the main layer element.

Think:

You have a dialog or dropdown (the main DismissibleLayer).
Some of its UI is rendered elsewhere in the DOM:
via portals (e.g. ReactDOM.createPortal)
or as a floating sub-panel/popover anchored to the dialog

Without branching, clicks or focus inside that portal/sub-panel would look like they’re outside the layer and would dismiss it.

DismissibleLayerBranch fixes this by saying:
“Everything inside this element should still be treated as part of this layer.”

**Intuitive example**

Imagine:

`DismissibleLayer` wraps a dropdown menu.
A submenu or tooltip for an item is rendered using a portal somewhere else in the DOM.
You wrap that portal content in a `DismissibleLayerBranch`. Conceptually:

Without branch:
Clicking into the submenu’s portal looks “outside” the dropdown.
`DismissibleLayer` sees a pointerdown outside and calls onDismiss → dropdown closes unexpectedly.

With branch:
The submenu’s root element is registered as a branch.
Pointer/focus events inside it are recognized as part of the same layer.

So:
No “outside” event is fired.
The dropdown stays open while you interact with the submenu/tooltip.
