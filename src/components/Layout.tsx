import type { ReactNode } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { getCardDataSource } from "../data/source";
import { useDeck } from "../deck/DeckContext";

function AppLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const [params] = useSearchParams();
  const next = new URLSearchParams();
  const deck = params.get("d");
  if (deck) next.set("d", deck);
  const search = next.toString();
  return (
    <NavLink
      to={search ? `${to}?${search}` : to}
      end={to === "/"}
      className={({ isActive }) => [className, isActive ? "active" : ""].filter(Boolean).join(" ")}
    >
      {children}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const deck = useDeck();
  const source = getCardDataSource();
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="wrap header-row">
          <AppLink to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              牌
            </span>
            <span>
              <strong>牌組工作台</strong>
              <small>繁中寶可夢卡牌</small>
            </span>
          </AppLink>
          <nav className="nav" aria-label="主要">
            <AppLink to="/">搜尋</AppLink>
            <AppLink to="/deck">
              牌組 <span className="count-pill">已選 {deck.total}/60</span>
            </AppLink>
          </nav>
        </div>
      </header>
      <main className="page wrap">{children}</main>
      <footer className="site-footer">
        <div className="wrap">
          <p>{source.attribution}</p>
          <p>部分卡牌沒有圖片。文字搜尋包含卡名、效果與說明，尚未包含招式內文。分類資料偶有誤差。</p>
        </div>
      </footer>
      {deck.notice ? (
        <div className="toast" role="status">
          {deck.notice}
        </div>
      ) : null}
    </div>
  );
}
