import ReactDom from "react-dom";

function dispatchDiscreteCustomEvent<E extends CustomEvent>(
  target: E["target"],
  event: E
) {
  if (target) ReactDom.flushSync(() => target.dispatchEvent(event));
}

export { dispatchDiscreteCustomEvent };
