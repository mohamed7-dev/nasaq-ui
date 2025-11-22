function checkWarning(element: any) {
  const getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  const mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  return mayWarn;
}

function getElementRef(element: React.ReactElement) {
  const mayWarnIn18Dev = checkWarning(element.props);
  // React <= 18 in dev
  if (mayWarnIn18Dev) {
    return (element as any).ref;
  }

  // React 19 in dev
  const mayWarnIn19Dev = checkWarning(element);
  if (mayWarnIn19Dev) {
    return (element.props as { ref: React.Ref<any> }).ref;
  }

  // In Production
  return (
    (element.props as { ref?: React.Ref<unknown> }).ref || (element as any).ref
  );
}

type AnyProps = Record<string, any>;

function mergeProps(childrenProps: AnyProps, slotProps: AnyProps) {
  const overriddenProps = { ...childrenProps };
  const isHandler = new RegExp(/^on[A-Z]/);
  for (const propName in childrenProps) {
    const childPropValue = childrenProps[propName];
    const slotPropValue = slotProps[propName];
    if (propName === "style") {
      overriddenProps[propName] = {
        ...slotPropValue,
        ...childPropValue,
      };
    } else if (propName === "className") {
      overriddenProps[propName] = [slotPropValue, childPropValue]
        .filter(Boolean)
        .join(" ");
    } else if (isHandler.test(propName)) {
      // merge handlers if both exist on the children and the slot
      if (childPropValue && slotPropValue) {
        overriddenProps[propName] = (...args: any[]) => {
          const result = childPropValue?.(...args);
          slotPropValue?.(...args);
          return result;
        };
      } else if (slotPropValue) {
        // if only the slot has the handler
        overriddenProps[propName] = slotPropValue;
      }
    }
  }

  // children props have higher priority over slot props
  return { ...slotProps, ...overriddenProps };
}

export { getElementRef, mergeProps, type AnyProps };
