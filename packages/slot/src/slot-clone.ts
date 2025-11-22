import React from "react";
import { type AnyProps, getElementRef, mergeProps } from "./utils";
import { composeRefs } from "@nasaq/use-compose-refs";

const SlotCloneName = "SlotClone";
interface SlotCloneProps {
  children: React.ReactNode;
}
type SlotCloneRef = HTMLElement;
function createSlotClone(name: string) {
  const SlotClone = React.forwardRef<SlotCloneRef, SlotCloneProps>(
    (props, forwardedRef) => {
      const { children, ...slotProps } = props;
      // children expected to be only one jsx element
      if (React.isValidElement(children)) {
        const childrenRef = getElementRef(children);
        const mergedProps = mergeProps(children.props as AnyProps, slotProps);
        // exclude fragment and don't pass ref to fragment (react 19 compatibility issue)
        if (children.type !== React.Fragment) {
          mergedProps.ref = forwardedRef
            ? composeRefs(forwardedRef, childrenRef)
            : childrenRef;
        }
        return React.cloneElement(children, mergedProps);
      }

      // otherwise return null or throw an error
      return React.Children.count(children) > 1
        ? React.Children.only(null)
        : null;
    }
  );
  SlotClone.displayName = `${name}.SlotClone`;
  return SlotClone;
}

const SlotClone = createSlotClone(SlotCloneName);

export { SlotClone, createSlotClone };
