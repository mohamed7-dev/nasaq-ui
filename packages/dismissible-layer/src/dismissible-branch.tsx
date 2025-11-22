import { Primitive } from "@nasaq/primitive";
import { useComposeRefs } from "@nasaq/use-compose-refs";
import React from "react";
import { DismissibleLayerContext } from "./_utils";
import { DISMISSIBLE_LAYER_BRANCH_NAME } from "./constants";

export type DismissibleLayerBranchRef = React.ComponentRef<
  typeof Primitive.div
>;
type DismissibleLayerBranchProps = React.ComponentPropsWithoutRef<
  typeof Primitive.div
>;

const DismissibleLayerBranch = React.forwardRef<
  DismissibleLayerBranchRef,
  DismissibleLayerBranchProps
>(function DismissibleLayerBranch(props, forwardedRef) {
  const ref = React.useRef<DismissibleLayerBranchRef>(null);
  const composedRefs = useComposeRefs(forwardedRef, ref);
  const context = React.useContext(DismissibleLayerContext);

  React.useEffect(() => {
    const node = ref.current;
    if (node) {
      context.branches.add(node);
      return () => {
        context.branches.delete(node);
      };
    }
  }, [context.branches]);

  return <Primitive.div {...props} ref={composedRefs} />;
});

DismissibleLayerBranch.displayName = DISMISSIBLE_LAYER_BRANCH_NAME;

const Branch = DismissibleLayerBranch;
export { DismissibleLayerBranch, Branch };
export type { DismissibleLayerBranchProps };
