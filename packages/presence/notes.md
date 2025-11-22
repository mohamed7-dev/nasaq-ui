## 2. What this effect is doing, conceptually

- It runs whenever the DOM `node` for the child is set.
- When there is a node:

  - It attaches listeners for:
    - `animationstart`
    - `animationend`
    - `animationcancel`
  - It uses those events to:
    - Detect when an animation actually starts.
    - Detect when the _current_ animation finishes or is canceled.
    - Then it tells the state machine “the exit animation is done” by `setState('ANIMATION_END')`.
    - On exit, it also temporarily forces `animation-fill-mode: forwards` to avoid a React 18 flicker.

- When there is **no** node:
  - It sends `ANIMATION_END` directly, treating it like “the animation finished / node disappeared”.

---

## 3. How this plays out for a real dialog

Imagine a dialog:

```tsx
function Dialog({ open }: { open: boolean }) {
  return (
    <Presence present={open}>
      {({ present }) => (
        <div
          role="dialog"
          className="DialogContent"
          data-state={present ? "open" : "closed"}
        >
          Dialog content
        </div>
      )}
    </Presence>
  );
}
```

And the CSS:

```css
.DialogContent[data-state="open"] {
  animation: dialogOpen 200ms ease-out;
}

.DialogContent[data-state="closed"] {
  animation: dialogClose 200ms ease-in;
}

@keyframes dialogOpen {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dialogClose {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}
```

### 3.1 When you open the dialog (`open = true`)

1. `Dialog` renders with `present = true`.
2. state machine is set to `'mounted'`, `isPresent = true`.
3. Presence renders the `div.role="dialog"`; `ref` is attached, so:

- `stylesRef.current = getComputedStyle(node)`.
- `node` is stored.

4. CSS sees `data-state="open"` and starts the `dialogOpen` animation.
5. Browser fires `animationstart`:
   - runs:
     - Because `event.target === node`, it sets:
       - `prevAnimationNameRef.current = getAnimationName(stylesRef.current)`  
         (the current animation name, something like `"dialogOpen"`).
   - This gives the hook a “baseline” for when it later checks if animation changed.

No special unmount behavior here; it just animates in.

---

### 3.2 When you close the dialog (`open = false`)

1. Parent sets `open = false` → `present = false` goes into Presence.
2. The earlier `useLayoutEffect` runs:
   - It detects `hasPresentChanged`.
   - It looks at `prevAnimationNameRef` (stored from before) and `currentAnimationName`.
   - Because CSS changed `data-state` to `"closed"`, the computed `animationName` now corresponds to `dialogClose`.
   - `prevAnimationName !== currentAnimationName` → `isAnimating = true`.
   - `wasPresent && isAnimating` → `send('ANIMATION_OUT')`.
3. State machine moves from `'mounted'` to `'unmountSuspended'`:

   - `isPresent` is still `true`, so [Presence] **keeps the dialog in the DOM** while the exit animation runs.

4. Browser starts the exit animation (`dialogClose`):

   - `animationstart` fires again; it updates `prevAnimationNameRef.current` to the current animation name.
   - This ensures that when multiple animations chain, the hook tracks the active one.

5. When the exit animation finishes, browser fires `animationend`:

   ```ts
   const currentAnimationName = getAnimationName(stylesRef.current);
   const isCurrentAnimation = currentAnimationName.includes(
     CSS.escape(event.animationName)
   );
   if (event.target === node && isCurrentAnimation) {
     send("ANIMATION_END");
     if (!prevPresentRef.current) {
       const currentFillMode = node.style.animationFillMode;
       node.style.animationFillMode = "forwards";
       timeoutId = ownerWindow.setTimeout(() => {
         if (node.style.animationFillMode === "forwards") {
           node.style.animationFillMode = currentFillMode;
         }
       });
     }
   }
   ```

   Step-by-step:

   - It checks:
     - **Same element?** `event.target === node`.
     - **Same animation?** computed `animationName` contains `event.animationName` (escaped).
   - If both match, this is the **end of the active animation we care about**:
     - `send('ANIMATION_END')`
       - State machine moves `'unmountSuspended' → 'unmounted'`.
       - `isPresent` becomes `false` → [Presence] unmounts the dialog.
     - `if (!prevPresentRef.current)`:
       - This condition means: we are in a “not logically present anymore” state (i.e. `present` is false).
       - To avoid a concurrency flicker, it:
         - Saves the current inline `animationFillMode`.
         - Sets `node.style.animationFillMode = 'forwards'`:
           - The element keeps the final keyframe styles (e.g. fully faded out) for at least one more frame.
         - Then schedules a `setTimeout` to restore the original fill mode, in case the node continues to live or be reused.

The effect cleanup ensures all listeners are removed, and the timeout is cleared if needed.

---

## 4. Why the `animationFillMode = 'forwards'` trick matters

In React 18 concurrent rendering, state updates are not always applied **exactly** in the same frame as the DOM event. The sequence during close can be:

1. `animationend` fires.
2. [handleAnimationEnd] calls `send('ANIMATION_END')`.
3. React schedules state update; unmount might happen a frame later.
4. In that “in-between” frame:
   - Without `fill-mode: forwards`, the browser can snap the dialog back to its non-animated styles (e.g. fully visible) for one frame.
   - That creates a visible flash of content right before it disappears.

By forcing `animationFillMode = 'forwards'` for that moment:

- The dialog visually stays at the final keyframe (e.g. opacity: 0).
- React can safely unmount on the next frame with no visible flash.
- After a small timeout, they reset `animationFillMode` so they don’t permanently mutate styles.

---

## 5. Summary in dialog terms

- **Open:** `present = true` → mount immediately; CSS handles enter animation.
- **Close with animation:** `present = false` + exit animation → keep dialog DOM in place (`unmountSuspended`) until `animationend`, then unmount.
- **Close without animation:** `present = false` + no `animationName` → unmount immediately.
- **Concurrent React safety:** On exit animation end, temporarily apply `animation-fill-mode: forwards` to avoid one-frame flicker before unmount.
