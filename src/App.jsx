import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { PageSkeleton } from "./components/Skeleton.jsx";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
// Pages other than the home page load on demand.
const ComponentPage = lazy(() => import("./pages/ComponentPage.jsx"));
const Poster = lazy(() => import("./pages/Poster.jsx"));
const ComponentEditor = lazy(() => import("./pages/ComponentEditor.jsx"));
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      {/* full-screen editor lives outside the normal page layout */}
      <Route path="components/:slug/edit" element={<Suspense fallback={null}><ComponentEditor /></Suspense>} />
      <Route path="poster/:slug" element={<Suspense fallback={null}><Poster /></Suspense>} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="components/:slug" element={<Suspense fallback={<PageSkeleton />}><ComponentPage /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
