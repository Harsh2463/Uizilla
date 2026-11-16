# Motion Library

An animated React component library. Home page lists component cards; each card opens its own page with a live demo, usage snippet and props.

Stack: React 18, Vite, React Router, Tailwind CSS v4.

## Run
```bash
npm install
npm run dev
npm run build   # production build in dist/
```

## Structure
```
src/
  library/
    round-carousel/
      RoundCarousel.jsx   # the component
      meta.jsx            # name, description, demo, usage, props table, editor controls
    rotunda-carousel/
      RotundaCarousel.jsx # WebGL ring seen from inside (single file)
      meta.jsx
    grainy-carousel/
      GrainyCarousel.jsx  # endless strip that dissolves into grain (single file)
      meta.jsx
    gallery-tunnel/
      GalleryTunnel.jsx   # endless gridded tunnel, plain WebGL (single file)
      meta.jsx
    rotating-gallery/
      RotatingGallery.jsx # twisting endless column (single file)
      meta.jsx
    depth-gallery/
      DepthGallery.jsx    # scroll-driven image corridor, plain DOM (single file)
      meta.jsx
    color-tunnel/
      ColorTunnel.jsx     # tunnel of curved colour cards with curved words, Night and Studio variants, plain WebGL 2 (single file)
      meta.jsx
    zoom-gallery/
      ZoomGallery.jsx     # pictures bursting out of the centre in straight or spiral paths, plain DOM, no animation library (single file)
      meta.jsx
    spiral-images/
      SpiralImages.jsx    # pictures flowing along an even-spaced spiral, plain canvas 2D (single file)
      meta.jsx
    spotlight-frames/
      SpotlightFrames.jsx # accordion of slats with a travelling selector box, plain DOM and CSS (single file)
      meta.jsx
    clothing-flip/
      ClothingFlip.jsx    # Magazine Flip for clothes: a drifting rail, hover to face front, click for a caption view, plain WebGL (single file)
      meta.jsx
    magazine-flip/
      MagazineFlip.jsx    # product corridor with tap-to-open details panel, plain WebGL (single file)
      meta.jsx
  registry/index.js       # list of all components (home page reads this)
  pages/                  # Home, ComponentPage, NotFound
  components/             # Layout, InView
```

## Edit and customize
Each component page has an **Edit and customize** button. It opens a full-screen editor (`/components/<slug>/edit`) with a property sidebar, a live preview (Full / Tablet / Phone widths) and **Export code** to download or copy the edited `.jsx` / `.tsx`. Edits live only in the editor's state, so leaving the page restores the original; the source files are never modified.

To make a component editable, add a `controls` array to its `meta.jsx` (see round-carousel). `RoundCarousel.tsx.txt` is the TypeScript twin used for `.tsx` exports; keep it in sync with the `.jsx`. Components without a `sourceTs` export `.jsx` only (every component except Round Carousel).

## Images from any host
WebGL needs to read a picture's pixels, which a host that sends no `Access-Control-Allow-Origin` header forbids. Every component that needs this takes an `imageProxy` prop (default `https://images.weserv.nl/?url={url}`): when a picture's own host blocks it, the URL is retried through that proxy, which re-serves it with the header. Pass your own proxy route, or `""` to switch it off and fall back to a built-in picture.

Note that the proxy is a third-party service: your image addresses are sent to it, and it can be slow or go down. For a production shop, host the pictures yourself or point `imageProxy` at your own route.

## Use a component in another project
Each component is ONE self-contained file (inline styles, no extra packages or CSS). Open its page and click **Copy code** / **Download**, or copy `src/library/<slug>/<Component>.jsx` directly, paste it into your project and render it.

## Add a new component
1. Create `src/library/<slug>/MyComponent.jsx` (keep it self-contained: only `react` imports, inline styles) and `meta.jsx` (copy `round-carousel/meta.jsx`).
2. Import the meta in `src/registry/index.js` and add it to the `components` array.

It appears on the home page and gets its own route at `/components/<slug>` automatically.

## Deploying
Routes use the browser history API. `public/_redirects` (Netlify) and `vercel.json` (Vercel) already send every path to `index.html`.
