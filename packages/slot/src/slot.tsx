import React from "react";
import { SLOTTABLE_IDENTIFIER } from "./constants";
import type { Slottable, SlottableProps } from "./slottable";
import { createSlotClone } from "./slot-clone";

const SlotName = "Slot";
type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
};
type SlotRef = HTMLElement;

function createSlot(name: string) {
  const SlotClone = createSlotClone(name);
  const Slot = React.forwardRef<SlotRef, SlotProps>((props, forwardRef) => {
    const { children, ...slotProps } = props;
    const checkIsSlottable = (
      child: React.ReactNode
    ): child is React.ReactElement<SlottableProps, typeof Slottable> => {
      return (
        React.isValidElement(child) &&
        typeof child.type === "function" &&
        "__nasaqId" in child.type &&
        child.type.__nasaqId === SLOTTABLE_IDENTIFIER
      );
    };
    const childrenArr = React.Children.toArray(children);
    const slottableChild = childrenArr.find((child) => checkIsSlottable(child));
    if (slottableChild) {
      // the new elem is the one passed as the child of the slottable
      const newElement = slottableChild.props.children;
      const newChildren = childrenArr.map((child) => {
        if (child === slottableChild) {
          // make sure we return only one element
          if (React.Children.count(newElement) > 1)
            return React.Children.only(null);
          return React.isValidElement(newElement)
            ? (newElement.props as { children: React.ReactNode }).children
            : null;
        } else {
          return child;
        }
      });
      return (
        <SlotClone {...slotProps} ref={forwardRef}>
          {React.isValidElement(newElement)
            ? React.cloneElement(newElement, undefined, newChildren)
            : null}
        </SlotClone>
      );
    }
    return (
      <SlotClone {...slotProps} ref={forwardRef}>
        {children}
      </SlotClone>
    );
  });
  Slot.displayName = `${name}.Slot`;

  return Slot;
}
const Slot = createSlot(SlotName);

export { Slot, Slot as Root, createSlot };
export type { SlotProps };
