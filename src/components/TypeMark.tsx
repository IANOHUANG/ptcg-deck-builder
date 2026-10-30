import { TYPE_LABEL } from "../data/labels";
import type { PtcgType } from "../data/types";

export function TypeMark({ type, size = "md" }: { type: PtcgType; size?: "sm" | "md" }) {
  return (
    <span className={`type-mark type-${type} ${size}`} title={TYPE_LABEL[type]}>
      {TYPE_LABEL[type]}
    </span>
  );
}

export function TypePips({ types, size = "sm" }: { types: PtcgType[]; size?: "sm" | "md" }) {
  if (types.length === 0) return null;
  return (
    <span className="pips">
      {types.map((type, index) => (
        <TypeMark key={`${type}-${index}`} type={type} size={size} />
      ))}
    </span>
  );
}
