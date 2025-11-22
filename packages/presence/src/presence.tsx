import { useComposeRefs } from "@nasaq/use-compose-refs";
import { useLayoutEffect } from "@nasaq/use-layout-effect";
import { useStateMachine } from "@nasaq/use-state-machine";
import React from "react";

interface PresenceProps {
  children:
    | React.ReactElement
    | ((props: { present: boolean }) => React.ReactElement);
  present: boolean;
}
function Presence(props: PresenceProps) {
  const { children, present } = props;
  const [node, setNode] = React.useState<HTMLElement>();
  const initState = present ? "mounted" : "unmounted";
  const [state, setState] = useStateMachine(initState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended",
    },
    unmounted: {
      MOUNT: "mounted",
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted",
    },
  });

  const isPresent = ["mounted", "unmountSuspended"].includes(state);
  // refs
  const stylesRef = React.useRef<CSSStyleDeclaration | null>(null);
  const prevAnimationNameRef = React.useRef<string>("none");
  const prevPresentRef = React.useRef(present);

  /*
    Maintains a reliable “last known animation while mounted” snapshot.
    Used synchronously with present changes to decide whether we’re entering unmountSuspended (ANIMATION_OUT) or unmounted (UNMOUNT) immediately.
    
    Works even if:
    No animationstart has fired yet.
    The node changed but animations didn’t trigger.
  */
  React.useEffect(() => {
    const currentAnimationName = getAnimationName(stylesRef.current);
    prevAnimationNameRef.current =
      state === "mounted" ? currentAnimationName : "none";
  }, [state]);

  // this hook handles the state machine update whenever the present changes
  useLayoutEffect(() => {
    const styles = stylesRef.current;
    const wasPresent = prevPresentRef.current;
    const hasPresentChanged = wasPresent !== present;

    // the first time this effect runs, nothing happens since hasPresentChanged is false
    if (hasPresentChanged) {
      const currentAnimationName = getAnimationName(styles);

      if (present) {
        // when the hasPresentChanged is true, and it changes to present:true
        // then, mount it immediately
        setState("MOUNT");
      } else if (
        styles?.display === "none" ||
        currentAnimationName === "none"
      ) {
        // when the hasPresentChanged is true, and animation is none meaning no css animation
        // computed on the children style, or the children is hidden
        // then, unmount it immediately
        setState("UNMOUNT");
      } else {
        const prevAnimationName = prevAnimationNameRef.current;
        // when hasPresentChanged is true, and it changes to present:false
        // and the currentAnimation !== prevAnimation
        // then, don't unmount until exit animation finishes
        if (wasPresent && prevAnimationName !== currentAnimationName) {
          setState("ANIMATION_OUT");
        } else {
          setState("UNMOUNT");
        }
      }
    }

    prevPresentRef.current = present;
  }, [present, setState]);

  /*
    Keeps prevAnimationNameRef in sync with the real animation that the browser actually started, especially:
    When multiple animations or dynamic CSS changes happen.

    Important for correctly handling:
    Chained animations.
    Comparing with event.animationName in animationend logic.
  */
  useLayoutEffect(() => {
    if (!node) {
      setState("ANIMATION_END");
      return;
    }
    let timeoutId: number;
    const ownerWindow = node.ownerDocument.defaultView ?? window;

    const handleAnimationStart = (event: AnimationEvent) => {
      if (event.target === node) {
        // the first time, this would be entrance animation
        // then it would be changed to exit animation
        prevAnimationNameRef.current = getAnimationName(stylesRef.current);
      }
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      const currentAnimationName = getAnimationName(stylesRef.current);
      // The event.animationName is unescaped for CSS syntax,
      // so we need to escape it to compare with the animationName computed from the style.
      const isCurrentAnimation = currentAnimationName.includes(
        CSS.escape(event.animationName)
      );
      if (event.target === node && isCurrentAnimation) {
        setState("ANIMATION_END");
        if (!prevPresentRef.current) {
          const currentFillMode = node.style.animationFillMode;
          node.style.animationFillMode = "forwards";
          // Reset the style after the node had time to unmount (for cases
          // where the component chooses not to unmount). Doing this any
          // sooner than `setTimeout` (e.g. with `requestAnimationFrame`)
          // still causes a flash.
          timeoutId = ownerWindow.setTimeout(() => {
            if (node.style.animationFillMode === "forwards") {
              node.style.animationFillMode = currentFillMode;
            }
          });
        }
      }
    };

    node.addEventListener("animationstart", handleAnimationStart);
    node.addEventListener("animationend", handleAnimationEnd);
    node.addEventListener("animationcancel", handleAnimationEnd);

    return () => {
      ownerWindow.clearTimeout(timeoutId);
      node.removeEventListener("animationstart", handleAnimationStart);
      node.removeEventListener("animationcancel", handleAnimationEnd);
      node.removeEventListener("animationend", handleAnimationEnd);
    };
  }, [node, setState]);

  const child = (
    typeof children === "function"
      ? children({ present: isPresent })
      : React.Children.only(children)
  ) as React.ReactElement<{
    ref?: React.Ref<HTMLElement>;
  }>;

  const refCallback = React.useCallback((node: HTMLElement) => {
    stylesRef.current = node ? getComputedStyle(node) : null;
    setNode(node);
  }, []);

  const composedRefs = useComposeRefs(refCallback, getElementRef(child));
  const forceMount = typeof children === "function";

  return isPresent || forceMount
    ? React.cloneElement(child, { ref: composedRefs })
    : null;
}

function getElementRef(
  element: React.ReactElement<{ ref?: React.Ref<unknown> }>
) {
  // React <=18 in DEV
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return (element as any).ref;
  }

  // React 19 in DEV
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }

  // Not DEV
  return element.props.ref || (element as any).ref;
}

function getAnimationName(styles: CSSStyleDeclaration | null) {
  return styles?.animationName || "none";
}

const Root = Presence;

export { Presence, Root };
export type { PresenceProps };
