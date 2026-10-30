import { useEffect, useState } from "react";
import { CardArt } from "../components/CardArt";
import { TypePips } from "../components/TypeMark";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "../data/labels";
import { useDeck } from "../deck/DeckContext";
import type { DeckCard } from "../deck/rules";
import { DECK_LIMIT } from "../deck/rules";

export function DeckPage() {
  const deck = useDeck();
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    document.title = "我的牌組｜牌組工作台";
  }, []);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, [deck.cards]);

  const ratio = Math.min(100, Math.round((deck.total / DECK_LIMIT) * 100));
  const meterClass = deck.total > DECK_LIMIT ? "over" : deck.total === DECK_LIMIT ? "full" : "";
  const pending = deck.cards.filter((card) => !card.loaded && !card.error);
  const failed = deck.cards.filter((card) => card.error);
  const ready = deck.cards.filter((card) => card.loaded);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      deck.flash("已複製分享連結");
    } catch {
      deck.flash("無法自動複製，請手動選取下方連結");
    }
  }

  return (
    <>
      <div className="deck-head">
        <div>
          <h1>我的牌組</h1>
          <p className="note">已選 {deck.total}/60。基本能量不限同名張數，其他卡同名最多 4 張。</p>
          <div className={`meter ${meterClass}`} aria-hidden="true">
            <span style={{ width: `${ratio}%` }} />
          </div>
        </div>
        <div className="actions">
          <button type="button" className="primary" onClick={() => void copyLink()} disabled={deck.cards.length === 0}>
            複製分享連結
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (deck.cards.length === 0) return;
              if (window.confirm("要清空目前的牌組嗎？")) deck.clear();
            }}
            disabled={deck.cards.length === 0}
          >
            清空牌組
          </button>
        </div>
      </div>

      {deck.issues.length > 0 ? (
        <div className="issues">
          {deck.issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      ) : null}

      {deck.cards.length === 0 ? (
        <div className="panel empty">
          <strong>牌組還是空的</strong>
          到搜尋頁把卡牌加進來。連結與這個瀏覽器都會記住目前的牌組。
        </div>
      ) : null}

      {pending.length > 0 ? (
        <section className="group">
          <h2>正在讀取 {pending.length} 張</h2>
          <div className="deck-list">
            {pending.map((card) => (
              <DeckRow key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      {failed.length > 0 ? (
        <section className="group">
          <h2>無法載入</h2>
          <button type="button" className="ghost" onClick={deck.retryFailed}>
            重試
          </button>
          <div className="deck-list">
            {failed.map((card) => (
              <DeckRow key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      {CATEGORY_ORDER.map((category) => {
        const group = ready
          .filter((card) => card.category === category)
          .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
        if (group.length === 0) return null;
        const count = group.reduce((sum, card) => sum + card.qty, 0);
        return (
          <section className="group" key={category}>
            <h2>
              {CATEGORY_LABEL[category]} · {count}
            </h2>
            <div className="deck-list">
              {group.map((card) => (
                <DeckRow key={card.id} card={card} />
              ))}
            </div>
          </section>
        );
      })}

      {deck.cards.length > 0 ? (
        <div className="panel share-box">
          <strong>分享連結</strong>
          <p className="note">網址裡已經包含牌組。對方打開連結會看到同一組卡，也會存進對方的瀏覽器。</p>
          <input className="share-link" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
        </div>
      ) : null}
    </>
  );
}

function DeckRow({ card }: { card: DeckCard }) {
  const deck = useDeck();
  return (
    <article className="panel deck-row">
      <CardArt name={card.name} src={card.imageLow} />
      <div className="deck-copy">
        <h3>{card.loaded ? card.name : card.error ? "無法載入" : "讀取中…"}</h3>
        <p className="meta">
          {card.setName ?? card.setId ?? card.id}
          {card.localId ? ` · #${card.localId}` : ""}
          {card.isBasicEnergy ? " · 基本能量" : ""}
        </p>
        {card.types.length > 0 ? <TypePips types={card.types} /> : null}
      </div>
      <div className="stepper">
        <button type="button" aria-label={`減少 ${card.name}`} onClick={() => deck.setQty(card.id, card.qty - 1)}>
          −
        </button>
        <input
          aria-label={`${card.name} 張數`}
          inputMode="numeric"
          value={card.qty}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isInteger(next)) deck.setQty(card.id, next);
          }}
        />
        <button type="button" aria-label={`增加 ${card.name}`} onClick={() => deck.setQty(card.id, card.qty + 1)}>
          +
        </button>
      </div>
    </article>
  );
}
