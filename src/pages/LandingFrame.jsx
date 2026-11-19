import { Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLandingPage } from "../landing/registry.js";
import { editors } from "../landing/editors.js";
import NotFound from "./NotFound.jsx";

// The bare page, no site chrome — this is what the preview iframe loads, so the
// page's own media queries react to the iframe's width.
//
// When it sits inside the Templates editor it also listens for the edited
// content and CSS variables the editor posts to it, so the preview updates live.
export default function LandingFrame() {
  const { slug } = useParams();
  const page = getLandingPage(slug);
  const [edits, setEdits] = useState(null);

  useEffect(() => {
    const on = (e) => {
      const d = e.data;
      if (e.origin === location.origin && d && d.__tpl === "edits" && d.slug === slug) setEdits(d);
    };
    window.addEventListener("message", on);
    // tell the editor we are up, so it sends what has been edited so far
    if (window.parent !== window) window.parent.postMessage({ __tpl: "ready", slug }, location.origin);
    return () => window.removeEventListener("message", on);
  }, [slug]);

  // CSS variables from the editor go in a style tag at the end of <head>, so they win over theme.css
  useEffect(() => {
    const sel = editors[slug]?.selector;
    if (!sel) return;
    let el = document.getElementById("__tpl-vars");
    if (!el) {
      el = document.createElement("style");
      el.id = "__tpl-vars";
      document.head.appendChild(el);
    }
    const body = Object.entries(edits?.vars || {})
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
    el.textContent = body ? `${sel}.${sel.slice(1)}, ${sel} { ${body} }` : "";
    // let the page repaint anything it reads from those variables
    window.dispatchEvent(new Event("resize"));
  }, [edits, slug]);

  if (!page) return <NotFound />;
  const { Component } = page;
  return (
    <Suspense fallback={<div style={{ background: "#000", minHeight: "100vh" }} />}>
      <Component content={edits?.content} />
    </Suspense>
  );
}
