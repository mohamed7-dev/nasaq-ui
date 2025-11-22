import { beforeEach, describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { Slot } from "./slot";
import React from "react";
import { Slottable } from "./slottable";

describe("given a slotted trigger", () => {
  afterEach(cleanup);
  describe("with onClick on itself", () => {
    const handleClick = vi.fn();

    beforeEach(() => {
      handleClick.mockReset();
      render(
        <Trigger as={Slot} onClick={handleClick}>
          <button>Click me</button>
        </Trigger>
      );
      const button = screen.getByRole("button", { name: "Click me" });
      fireEvent.click(button);
    });
    it("should call onClick on itself", () => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("with onClick on child", () => {
    const handleClick = vi.fn();

    beforeEach(() => {
      handleClick.mockReset();
      render(
        <Trigger as={Slot}>
          <button onClick={handleClick}>Click me child</button>
        </Trigger>
      );
      const button = screen.getByRole("button", { name: "Click me child" });
      fireEvent.click(button);
    });
    it("should call onClick on child", () => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("with onClick on itself AND the child", () => {
    const handleTriggerClick = vi.fn();
    const handleChildClick = vi.fn();

    beforeEach(() => {
      handleTriggerClick.mockReset();
      handleChildClick.mockReset();
      render(
        <Trigger as={Slot} onClick={handleTriggerClick}>
          <button type="button" onClick={handleChildClick}>
            Click me (child and trigger)
          </button>
        </Trigger>
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Click me (child and trigger)" })
      );
    });

    it("should call the Trigger's onClick", () => {
      expect(handleTriggerClick).toHaveBeenCalledTimes(1);
    });

    it("should call the child's onClick", () => {
      expect(handleChildClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("with onClick on itself AND undefined onClick on the child", () => {
    const handleTriggerClick = vi.fn();

    beforeEach(() => {
      handleTriggerClick.mockReset();
      render(
        <Trigger as={Slot} onClick={handleTriggerClick}>
          <button type="button" onClick={undefined}>
            Click me
          </button>
        </Trigger>
      );
      fireEvent.click(screen.getByRole("button"));
    });

    it("should call the Trigger's onClick", () => {
      expect(handleTriggerClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("with undefined onClick on itself AND onClick on the child", () => {
    const handleChildClick = vi.fn();

    beforeEach(() => {
      handleChildClick.mockReset();
      render(
        <Trigger as={Slot} onClick={undefined}>
          <button type="button" onClick={handleChildClick}>
            Click me
          </button>
        </Trigger>
      );
      fireEvent.click(screen.getByRole("button"));
    });

    it("should call the child's onClick", () => {
      expect(handleChildClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe("given a button with slottable children", () => {
  afterEach(cleanup);
  describe("without asChild", () => {
    it("should render a button with icons on the left and right", async () => {
      const tree = render(
        <Button iconLeft={<span>Left</span>} iconRight={<span>Right</span>}>
          Button <em>text</em>
        </Button>
      );
      expect(tree.container).toMatchSnapshot();
    });
  });
  describe("with asChild", () => {
    it("should render a link with icons on the left and right", async () => {
      const tree = render(
        <Button
          iconLeft={<span>Left</span>}
          iconRight={<span>Right</span>}
          asChild
        >
          <a href={"https://www.google.com"}>
            Button <em>text</em>
          </a>
        </Button>
      );
      expect(tree.container).toMatchSnapshot();
    });
  });
});

type TriggerProps = React.ComponentProps<"button"> & { as: React.ElementType };

const Trigger = ({ as: Comp = "button", ...props }: TriggerProps) => (
  <Comp {...props} />
);

const Button = React.forwardRef<
  React.ComponentRef<"button">,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
  }
>(
  (
    { children, asChild = false, iconLeft, iconRight, ...props },
    forwardedRef
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp {...props} ref={forwardedRef}>
        {iconLeft}
        <Slottable>{children}</Slottable>
        {iconRight}
      </Comp>
    );
  }
);
Button.displayName = "Button";
