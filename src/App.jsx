import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import ComponentPage from "./pages/ComponentPage.jsx";
import ComponentEditor from "./pages/ComponentEditor.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      {/* full-screen editor lives outside the normal page layout */}
      <Route path="components/:slug/edit" element={<ComponentEditor />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="components/:slug" element={<ComponentPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
