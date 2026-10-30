import { useState } from "react";

export function CardArt({
  name,
  src,
  className = "art",
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={className}>
        <div className="art-fallback" role="img" aria-label={name}>
          <span>{name}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
      <img src={src} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </div>
  );
}
