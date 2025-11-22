import * as React from "react";

type Machine<S> = { [k: string]: { [k: string]: S } };
type MachineState<T> = keyof T;
type MachineEvent<T> = keyof UnionToIntersection<T[keyof T]>;

// 🤯 https://fettblog.eu/typescript-union-to-intersection/
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

/**
 * @description
 * This hook creates a finite state machine by wrapping the state logic
 * in the useReducer hook.
 */
export function useStateMachine<M>(
  initialState: MachineState<M>,
  machine: M & Machine<MachineState<M>>
) {
  return React.useReducer(
    (state: MachineState<M>, event: MachineEvent<M>): MachineState<M> => {
      const nextState = (machine[state] as any)[event];
      return nextState ?? state;
    },
    initialState
  );
}
