# BuddhaChat Official Site

Official landing page for [BuddhaChat](https://www.buddhachat.online/) — a contemplative AI experience rooted in Buddhist wisdom.

## Tech Stack

- **React 19** + **Vite 8**
- Scroll-scrubbed video hero
- 3D card carousel with physics-based momentum
- Responsive layout with profile-aware offset system
- No third-party animation libraries

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Testing

```bash
npm test
```

## Project Structure

```
src/
├── components/sunyata/   # All page section components
├── content/              # Scene configuration and story data
├── lib/                  # Scroll math, responsive offsets, asset store
├── pages/
│   ├── SunyataLanding.jsx   # Main landing page
│   └── StoryPage.jsx        # Story viewer (?story= query param)
└── index.css             # Global styles and animations
```

## Editor Mode

Append `?edit=1` to the URL to enable the visual scene editor for adjusting layout, positions, and content.

## Performance Notes

- Archive carousel RAF loop is gated behind `IntersectionObserver` — pauses when off-screen
- Scroll-scrubbed video uses an easing loop with a `1/30s` settle threshold to minimize frame decodes
- Noise overlay uses a CSS `background-image` data URI (rasterized once) instead of live SVG `feTurbulence`
- Resize event handler is debounced at 150ms to prevent cascading re-renders
