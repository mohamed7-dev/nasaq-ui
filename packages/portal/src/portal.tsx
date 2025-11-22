import React from "react";
import { Primitive } from "@nasaq/primitive";
import ReactDOM from "react-dom";
import { PORTAL_NAME } from "./constants";
import { useLayoutEffect } from "@nasaq/use-layout-effect";

type PortalRef = React.ComponentRef<typeof Primitive.div>;
interface PortalProps
  extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * @description
   * If passed, This container will be used as the parent to the portaled content.
   */
  container?: Element | DocumentFragment | null;
}

const Portal = React.forwardRef<PortalRef, PortalProps>(function Portal(
  props,
  forwardedRef
) {
  const { container: containerProp, ...rest } = props;
  const [mounted, setMounted] = React.useState(false);
  useLayoutEffect(() => setMounted(true), []);

  // if container is not specified, by default the body element will be used
  const container = containerProp || (mounted && globalThis?.document?.body);

  return container
    ? ReactDOM.createPortal(
        <Primitive.div {...rest} ref={forwardedRef} />,
        container
      )
    : null;
});

Portal.displayName = PORTAL_NAME;

const Root = Portal;

export {
  Portal,
  //
  Root,
};

export type { PortalProps };
