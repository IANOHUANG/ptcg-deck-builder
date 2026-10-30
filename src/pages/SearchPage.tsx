import { useEffect, useMemo, useRef, useState } from "react";
import { CardArt } from "../components/CardArt";
import { CardDetail } from "../components/CardDetail";
import { TypeMark } from "../components/TypeMark";
import {
  CATEGORY_LABEL,
  SEARCH_CATEGORIES,
  TYPE_LABEL,
  TYPE_ORDER,
  isTrainerCategory,
} from "../data/labels";
import { getCardDataSource } from "../data/source";
import type { CardSummary, PtcgType, SearchCategory, SerieGroup } from "../data/types";
import { useDeck } from "../deck/DeckContext";

const PAGE_SIZE = 24;

export function SearchPage() {
  const deck = useDeck();
  const source = useMemo(() => getCardDataSource(), []);
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [setId, setSetId] = useState("");
  const [category, setCategory] = useState<SearchCategory | "">("");
  const [type, setType] = useState<PtcgType | "">("");
  const [series, setSeries] = useState<SerieGroup[]>([]);
  const [seriesError, setSeriesError] = useState("");
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [partial, setPartial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState("");
  const [selected, setSelected] = useState<CardSummary | null>(null);
  const queryKey = JSON.stringify({ debounced, setId, category, type });
  const queryRef = useRef(queryKey);

  useEffect(() => {
    document.title = "搜尋卡牌｜牌組工作台";
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    let cancel = false;
    source
      .listSeries()
      .then((groups) => {
        if (!cancel) setSeries(groups);
      })
      .catch(() => {
        if (!cancel) setSeriesError("系列清單暫時無法載入，仍可用名稱或效果搜尋。");
      });
    return () => {
      cancel = true;
    };
  }, [source]);

  const setNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const group of series) {
      for (const set of group.sets) names.set(set.id, set.name);
    }
    return names;
  }, [series]);

  useEffect(() => {
    const queryChanged = queryRef.current !== queryKey;
    if (queryChanged) {
      queryRef.current = queryKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    if (!debounced && !setId && !category && !type) {
      setCards([]);
      setHasMore(false);
      setPartial(false);
      setError("");
      setLoading(false);
      return;
    }

    let cancel = false;
    setLoading(true);
    setError("");
    source
      .search({
        text: debounced,
        setId,
        category: category || undefined,
        type: type || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((result) => {
        if (cancel) return;
        setCards((current) => {
          if (page === 1) return result.cards;
          const seen = new Set(current.map((card) => card.id));
          return [...current, ...result.cards.filter((card) => !seen.has(card.id))];
        });
        setHasMore(result.hasMore);
        setPartial(result.partial);
      })
      .catch(() => {
        if (cancel) return;
        if (page === 1) setCards([]);
        setError("無法取得卡牌資料，請稍後再試。");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [category, debounced, page, queryKey, setId, source, type]);

  function chooseCategory(next: SearchCategory) {
    setCategory((current) => {
      const value = current === next ? "" : next;
      if (isTrainerCategory(value)) setType("");
      return value;
    });
  }

  async function addSummary(summary: CardSummary) {
    setAddingId(summary.id);
    try {
      const details = await source.getCard(summary.id);
      deck.addCard(details);
    } catch {
      deck.flash("無法加入這張卡，請稍後再試。");
    } finally {
      setAddingId("");
    }
  }

  const idle = !debounced && !setId && !category && !type;
  const typeDisabled = isTrainerCategory(category);

  return (
    <>
      <form
        className="panel filters"
        onSubmit={(event) => {
          event.preventDefault();
          setDebounced(text.trim());
        }}
      >
        <div className="search-row">
          <label className="field">
            名稱或文字
            <input
              type="search"
              value={text}
              placeholder="例如：皮卡丘、博士的研究、重洗牌庫"
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button className="primary" type="submit">
            搜尋
          </button>
        </div>
        <label className="field">
          系列
          <select value={setId} onChange={(event) => setSetId(event.target.value)}>
            <option value="">全部系列</option>
            {series.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {group.sets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {seriesError ? <p className="error-text">{seriesError}</p> : null}
        <div>
          <div className="note">分類</div>
          <div className="chip-row" role="group" aria-label="分類">
            {SEARCH_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={category === item}
                onClick={() => chooseCategory(item)}
              >
                {CATEGORY_LABEL[item]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="note">屬性{typeDisabled ? "（訓練家卡不使用屬性）" : ""}</div>
          <div className="chip-row" role="group" aria-label="屬性">
            {TYPE_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={type === item}
                disabled={typeDisabled}
                onClick={() => setType((current) => (current === item ? "" : item))}
              >
                <TypeMark type={item} size="sm" />
                {TYPE_LABEL[item]}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div className="toolbar">
        <span>
          {idle
            ? "選擇條件後會顯示卡牌"
            : loading && page === 1
              ? "搜尋中…"
              : `顯示 ${cards.length} 張${hasMore ? "，還有更多" : ""}${partial ? "（部分條件暫時查不到）" : ""}`}
        </span>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setText("");
            setDebounced("");
            setSetId("");
            setCategory("");
            setType("");
          }}
        >
          清除條件
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {idle ? (
        <div className="panel empty">
          <strong>搜尋繁中卡牌</strong>
          輸入卡名、效果或說明，也可以只選系列、分類或屬性。點卡片看詳細資料，或直接加入牌組。
        </div>
      ) : null}

      {loading && page === 1 ? (
        <div className="grid" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton" />
          ))}
        </div>
      ) : null}

      {!idle && !(loading && page === 1) && cards.length === 0 && !error ? (
        <div className="panel empty">
          <strong>找不到符合的卡牌</strong>
          試試更短的關鍵字，或放寬系列與屬性。
        </div>
      ) : null}

      {cards.length > 0 && !(loading && page === 1) ? (
        <div className="grid">
          {cards.map((card) => {
            const qty = deck.qtyOf(card.id);
            const setName = card.setName ?? setNames.get(card.setId);
            return (
              <article className="tile" key={card.id}>
                {qty > 0 ? <span className="qty-badge">{qty}</span> : null}
                <button type="button" className="tile-open" onClick={() => setSelected(card)}>
                  <CardArt name={card.name} src={card.image?.low} />
                  <div>
                    <h3>{card.name}</h3>
                    <p className="meta">
                      {setName ?? card.setId} · #{card.localId}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="primary add-btn"
                  onClick={() => void addSummary(card)}
                  disabled={addingId === card.id}
                >
                  {addingId === card.id ? "加入中…" : "加入牌組"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {hasMore && cards.length > 0 ? (
        <div className="toolbar">
          <span />
          <button type="button" className="ghost" disabled={loading} onClick={() => setPage((current) => current + 1)}>
            {loading ? "載入中…" : "載入更多"}
          </button>
        </div>
      ) : null}

      {selected ? <CardDetail summary={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
