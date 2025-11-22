import React from "react";
import { createSlot } from "@nasaq/slot";

const NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul",
] as const;
type Primitives = {
  [E in (typeof NODES)[number]]: PrimitiveForwardRefComponent<E>;
};
type PrimitivePropsWithRef<E extends React.ElementType> =
  React.ComponentPropsWithRef<E> & {
    asChild?: boolean;
  };

interface PrimitiveForwardRefComponent<E extends React.ElementType>
  extends React.ForwardRefExoticComponent<PrimitivePropsWithRef<E>> {}

const Primitive = NODES.reduce((acc, node) => {
  const Slot = createSlot(`Primitive.${node}`);
  const Node = React.forwardRef(
    (props: PrimitivePropsWithRef<typeof node>, forwardedRef: any) => {
      const { asChild, ...primitiveProps } = props;
      const Comp: any = asChild ? Slot : node;

      if (typeof window !== "undefined") {
        (window as any)[Symbol.for("nasaq")] = true;
      }

      return <Comp {...primitiveProps} ref={forwardedRef} />;
    }
  );

  Node.displayName = `Primitive.${node}`;
  return { ...acc, [node]: Node };
}, {} as Primitives);

export { Primitive, Primitive as Root };
export type { PrimitivePropsWithRef };
