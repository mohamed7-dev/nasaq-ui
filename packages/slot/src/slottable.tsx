import { SLOTTABLE_IDENTIFIER } from "./constants";

const SlottableName = "Slottable";
interface SlottableProps {
  children: React.ReactNode;
}
interface SlottableComponent extends React.FC<SlottableProps> {
  __nasaqId: symbol;
}

function createSlottable(name: string) {
  const Slottable: SlottableComponent = ({ children }: SlottableProps) => {
    return <>{children}</>;
  };
  Slottable.displayName = name;
  Slottable.__nasaqId = SLOTTABLE_IDENTIFIER;
  return Slottable;
}

const Slottable = createSlottable(SlottableName);

export { createSlottable, Slottable };
export type { SlottableProps };
