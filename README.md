# 牌組工作台

繁體中文寶可夢卡牌（PTCG）的卡牌搜尋與組牌工具。這是靜態網站，可以部署到 GitHub Pages。介面為繁體中文，視覺與程式都是獨立製作，不使用其他牌組網站的程式或素材。

## 功能

- **搜尋卡牌**：用卡名、效果或說明文字搜尋，並可用系列、分類（寶可夢／物品／裝備／支援者／競技場／能量）與屬性（草、火、水、雷、超、鬥、惡、鋼、妖、龍、無）篩選。結果以卡圖格子顯示，點開可看詳細資料。
- **組牌**：加入或移除卡牌、調整張數。整副最多 60 張；除基本能量外，同名卡最多 4 張（結尾括號裡的角色名會視為同一張，例如不同畫師的「博士的研究」）。頁首會顯示「已選 X/60」，牌組依分類分組。
- **保存**：牌組寫進網址（可分享）以及這個瀏覽器的 `localStorage`。

## 資料來源

使用 [TCGdex](https://tcgdex.dev/) 的公開 REST API，語言為繁體中文：

`https://api.tcgdex.net/v2/zh-tw`

卡名、系列名、效果與說明是繁體中文。分類、屬性、稀有度、進化階段在 API 裡是英文列舉，本站再翻成繁中。卡圖由 `assets.tcgdex.net` 即時載入，專案本身不打包卡圖。

沒有採用 Pokémon TCG API（pokemontcg.io）。該 API 已進入淘汰、沒有繁中資料，後繼的 Scrydex 目前也只有英文與日文。TCGdex 是目前不需金鑰、又能直接拿到繁中卡牌的公開來源。

### 限制

- 文字搜尋涵蓋卡名（`name`）、效果（`effect`）與寶可夢說明（`description`）。招式名稱與招式內文是巢狀欄位，列表 API 篩不到，所以打招式句子可能找不到卡；詳情頁仍會顯示招式。
- 全庫約 7400 張裡，只有一部分帶有圖片網址（抽查約 2100 張）。沒有圖片時以卡名牌面代替，基本能量與部分促銷卡特別常見。
- 少數卡片分類不準。例如有的物品被標成寶可夢，或被放在能量分類。若有 `trainerType`，畫面會優先採用它。
- TCGdex 把基本能量的 `energyType` 標成 `Normal` 而不是 `Basic`。本站用卡名是否以「基本」開頭（且不是特殊能量）來判斷 4 張上限的例外。
- 標準賽制／開放賽制標記可能不完整，只供參考。
- 這一版只強制 60 張與非基本能量同名 4 張，還沒有處理 ACE SPEC、光輝寶可夢等更嚴格的張數。
- 使用時瀏覽器要能連上 `api.tcgdex.net` 與 `assets.tcgdex.net`。

## 本地執行

需要 Node.js 22。

```bash
npm install
npm test
npm run dev
```

開發伺服器預設是 <http://localhost:5173>。

建置：

```bash
npm run build
npm run preview
```

產物在 `dist/`。`vite.config.ts` 的 `base` 是 `./`，因此同一個建置可以放在網域根目錄或專案子路徑。

## 部署到 GitHub Pages

1. 把 `main` 推上 GitHub。
2. 在儲存庫 **Settings → Pages → Build and deployment** 把 Source 設成 **GitHub Actions**。
3. `.github/workflows/pages.yml` 會在 `main` 被推送時執行測試、建置，並發佈 `dist/`。
4. 這個儲存庫的網址會是 <https://ianohuang.github.io/ptcg-deck-builder/>。

路由使用 hash（`#/`、`#/deck`），不需要額外的 404 轉址。牌組參數在 hash 的查詢字串裡，例如：

`#/deck?d=SV7-001*4~SVD-GRA*8`

格式是 `卡牌ID*張數`，多張卡以 `~` 連接。

## 換成別的繁中資料

資料層和畫面分開。契約在 `src/data/types.ts` 的 `CardDataSource`：

- `listSeries()`：系列與組合
- `search()`：依文字、系列、分類、屬性搜尋
- `getCard()` / `getCards()`：單卡詳情

`src/data/source.ts` 的 `createCardDataSource()` 目前只註冊 `tcgdex`。要換資料集時，實作同一個介面，在 switch 裡註冊，並用環境變數選擇：

```bash
VITE_CARD_SOURCE=tcgdex npm run dev
```

新的來源要自己填好 `CardDetails`，尤其是 `category`、`isBasicEnergy` 與圖片網址。組牌規則只看這些欄位，不依賴 TCGdex 的原始形狀。TCGdex 的欄位轉換集中在 `src/data/mapCard.ts`。
