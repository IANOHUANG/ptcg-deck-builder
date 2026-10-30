import { useEffect, useState } from "react";
import {
  formatAbilityType,
  formatRarity,
  formatStage,
  formatSuffix,
  CATEGORY_LABEL,
  TYPE_LABEL,
} from "../data/labels";
import { getCardDataSource } from "../data/source";
import type { CardDetails, CardSummary } from "../data/types";
import { useDeck } from "../deck/DeckContext";
import { CardArt } from "./CardArt";
import { TypeMark, TypePips } from "./TypeMark";

export function CardDetail({ summary, onClose }: { summary: CardSummary; onClose: () => void }) {
  const deck = useDeck();
  const [card, setCard] = useState<CardDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    setCard(null);
    setError("");
    getCardDataSource()
      .getCard(summary.id)
      .then((next) => {
        if (!cancel) setCard(next);
      })
      .catch(() => {
        if (!cancel) setError("無法載入這張卡的詳細資料。");
      });
    return () => {
      cancel = true;
    };
  }, [summary.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const shown = card ?? summary;
  const qty = deck.qtyOf(summary.id);

  return (
    <div className="backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="card-title">
        <div className="detail-layout">
          <CardArt name={shown.name} src={card?.image?.high ?? summary.image?.high ?? summary.image?.low} />
          <div className="detail-copy">
            <div className="dialog-top">
              <div>
                <h2 id="card-title">
                  {shown.name}
                  {card?.suffix ? ` ${formatSuffix(card.suffix)}` : ""}
                </h2>
                <p className="meta">
                  {card?.setName ?? summary.setName ?? summary.setId} · #{shown.localId}
                </p>
              </div>
              <button type="button" className="ghost" onClick={onClose} autoFocus>
                關閉
              </button>
            </div>

            {error ? <p className="error-text">{error}</p> : null}
            {!card && !error ? <p className="note">正在讀取卡牌資料…</p> : null}

            {card ? (
              <>
                <div className="facts">
                  <span className="fact">{CATEGORY_LABEL[card.category]}</span>
                  {card.energyKind ? <span className="fact">{card.energyKind === "basic" ? "基本能量" : "特殊能量"}</span> : null}
                  {card.types.map((type) => (
                    <span className="fact" key={type}>
                      <TypeMark type={type} size="sm" /> {TYPE_LABEL[type]}
                    </span>
                  ))}
                  {card.hp ? <span className="fact">HP {card.hp}</span> : null}
                  {formatStage(card.stage) ? <span className="fact">{formatStage(card.stage)}</span> : null}
                  {card.evolveFrom ? <span className="fact">進化自 {card.evolveFrom}</span> : null}
                  {formatRarity(card.rarity) ? <span className="fact">{formatRarity(card.rarity)}</span> : null}
                  {card.regulationMark ? <span className="fact">規則標記 {card.regulationMark}</span> : null}
                </div>

                {card.abilities.map((ability) => (
                  <article className="ability" key={`${ability.name}-${ability.effect}`}>
                    <strong>
                      {formatAbilityType(ability.type) ? `${formatAbilityType(ability.type)} · ` : ""}
                      {ability.name}
                    </strong>
                    {ability.effect ? <p>{ability.effect}</p> : null}
                  </article>
                ))}

                {card.attacks.map((attack) => (
                  <article className="attack" key={`${attack.name}-${attack.damage ?? ""}`}>
                    <div className="attack-head">
                      <TypePips types={attack.cost} />
                      <strong>{attack.name}</strong>
                      {attack.damage ? <span className="damage">{attack.damage}</span> : <span />}
                    </div>
                    {attack.effect ? <p>{attack.effect}</p> : null}
                  </article>
                ))}

                {card.effect ? (
                  <div className="stat-row">
                    <strong>效果</strong>
                    <p>{card.effect}</p>
                  </div>
                ) : null}
                {card.description ? (
                  <div className="stat-row">
                    <strong>說明</strong>
                    <p>{card.description}</p>
                  </div>
                ) : null}

                <div className="facts">
                  {card.weaknesses.map((item) => (
                    <span className="fact" key={`w-${item.rawType}${item.value}`}>
                      弱點 {item.type ? <TypeMark type={item.type} size="sm" /> : item.rawType} {item.value}
                    </span>
                  ))}
                  {card.resistances.map((item) => (
                    <span className="fact" key={`r-${item.rawType}${item.value}`}>
                      抵抗力 {item.type ? <TypeMark type={item.type} size="sm" /> : item.rawType} {item.value}
                    </span>
                  ))}
                  {typeof card.retreat === "number" ? (
                    <span className="fact">
                      撤退 <TypePips types={Array.from({ length: card.retreat }, () => "colorless" as const)} />
                      {card.retreat === 0 ? "0" : ""}
                    </span>
                  ) : null}
                  {card.illustrator ? <span className="fact">繪師 {card.illustrator}</span> : null}
                  {card.legal ? (
                    <span className="fact">
                      標準 {card.legal.standard ? "是" : "否"} · 開放 {card.legal.expanded ? "是" : "否"}
                    </span>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="stepper" aria-label="牌組張數">
              <button type="button" onClick={() => deck.setQty(summary.id, qty - 1)} disabled={!card || qty === 0}>
                −
              </button>
              <span>牌組中 {qty} 張</span>
              <button type="button" className="primary" onClick={() => card && deck.addCard(card)} disabled={!card}>
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
