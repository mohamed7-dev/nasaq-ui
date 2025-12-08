## Why focusin, focusout, and mutation observer?

### focusin:

- Fires when something gets focus.
- If focus goes outside the scope → move it back to the last in-scope element.

### focusout:

- Fires when something loses focus.
- If focus is about to move to an element outside the scope → move it back inside.
- Ignores transitions where relatedTarget is null (app/tab change, Chrome removal quirk).

### Mutation observer:

- When the focused node is removed and focus falls back to body, refocus the container.

---

## e.Target, e.currentTarget, e.relatedTarget, and document.activeELement

## Quick intuition

Think of a browser event as:

- **`event.target`**: “Where did this event _start_?”
- **`event.currentTarget`**: “Which element is _currently running_ this listener?”
- **`document.activeElement`**: “Which element is _currently focused_ right now?”
- **`event.relatedTarget`** (for focus/blur, mouseover/out, etc.): “Where is focus/mouse _coming from or going to_?”

Now, how they behave in the contexts

---

## `event.target`

- Always the **original element** that triggered the event.
- It does **not** change as the event bubbles.

Examples:

- `focusin` on `document`:

  - Listener: `document.addEventListener('focusin', handleFocusIn)`
  - When a button inside your dialog gets focus:

    - `event.target` → that **button** (the focused element)
    - This is why in your `focusin` handler:

      ```ts
      const target = event.target as HTMLElement | null;
      ```

      `target` is the element that just received focus.

- `click` on document with event delegation:
  - `document.addEventListener('click', handler)`
  - User clicks `<button>`:
    - `event.target` → that `<button>`

So in your `focusin` handler, `event.target` is **“the element that got focus just now”**, which is equivalent to `document.activeElement` at that moment (for normal cases).

---

## `event.currentTarget`

- The element that **has the listener attached** and is **currently handling** the event.
- Changes as event bubbles through the DOM.

Examples:

- For:

  ```ts
  document.addEventListener("focusin", handleFocusIn);
  ```

  Inside [handleFocusIn](cci:1://file:///home/mohamed/Documents/project-to-create/primitives/packages/react/focus-scope/src/focus-scope.tsx:74:6-82:7):

  - `event.currentTarget` → always `document`
  - `event.target` → the element that received focus (input, button, etc.)

- If you had:

  ```ts
  container.addEventListener("focusin", handler);
  ```

  and focus goes to a child inside `container`:

  - `event.target` → that child element
  - `event.currentTarget` → `container`

You rarely use `currentTarget` when listening on `document` for delegation, because `currentTarget` is always just `document`.

---

## `document.activeElement`

- Global property: “which element is _currently focused_?”
- Updated by the browser whenever focus changes.
- Equivalent to `event.target` in a `focusin` **at that moment**, but can differ if:
  - You’re reading it **later**, after another focus change.
  - Some weird browser quirks or shadow DOM.

In your code:

```ts
const focusedElement = document.activeElement as HTMLElement | null;
```

in the mutation observer:

- They check: if `document.activeElement === document.body`, it often means:
  - The previously focused element was removed.
  - Browser fell back to focusing `body`.

Then they refocus the container to keep trapping focus.

---

## `event.relatedTarget`

- Used for **transitions** between two elements.
- For focus events:
  - In `focusout`:
    - `event.target` → element that is losing focus.
    - `event.relatedTarget` → element that is about to _receive_ focus (can be `null`).
  - In `focusin`:
    - `event.target` → element that is gaining focus.
    - `event.relatedTarget` → element that just _lost_ focus.

In your handler:

```ts
function handleFocusOut(event: FocusEvent) {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (relatedTarget === null) return;
  if (!container.contains(relatedTarget)) {
    focus(lastFocusedElementRef.current, { select: true });
  }
}
```

- They use `relatedTarget` to see **where focus is going next**.
- If that next element is outside `container`, they pull focus back inside.
- If `relatedTarget === null`, they ignore:
  - User switched tab/app.
  - Chrome removed the focused element → no new focus target.

---

## Comparing in the focus-trap context

When `focusin` happens:

- `event.target` → element that just **got focus** (usually same as `document.activeElement` right then).
- `event.currentTarget` → `document` (because listener is on `document`).
- `document.activeElement` → same as `event.target` (at that instant).
- `event.relatedTarget` → element that lost focus.

When `focusout` happens:

- `event.target` → element that is **losing focus**.
- `event.currentTarget` → `document`.
- `document.activeElement` → still that element, until the focus change completes.
- `event.relatedTarget` → element that is going to **gain focus** (or `null`).
