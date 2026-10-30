import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DeckProvider } from "./deck/DeckContext";
import { DeckPage } from "./pages/DeckPage";
import { SearchPage } from "./pages/SearchPage";

export default function App() {
  return (
    <HashRouter>
      <DeckProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/deck" element={<DeckPage />} />
          </Routes>
        </Layout>
      </DeckProvider>
    </HashRouter>
  );
}
