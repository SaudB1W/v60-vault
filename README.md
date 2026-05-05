# The V60 Vault

A premium digital journal for V60 pour-over recipes. Built with React, React Router, and Tailwind CSS.

## Run it

This app uses two servers — Vite for the front end and `json-server` for the API.
Run them in **two separate terminals**:

```bash
# Terminal 1 — front end
npm install
npm run dev          # http://localhost:5173
```

```bash
# Terminal 2 — API
npm run server       # http://localhost:3001
```

To build for production:

```bash
npm run build
npm run preview
```

### Default credentials

The seeded admin account:

```
admin@v60vault.com / admin123
```

Two regular users (`role: "user"`) are also seeded — see [db.json](db.json).
Create your own account at `/signup`.

### Auth, ratings, and comments

- Auth state is stored in `localStorage` under `v60_user`.
- Ratings are persisted to the API (`/ratings`); each user gets one row per bean,
  and the detail page shows the average across all users.
- Comments are persisted to `/comments`. Anyone signed in can post; only the
  admin sees the 🗑 delete button.

## What it does

- **Landing page (`/`)** — a responsive grid of bean cards (2 cols mobile → 3 cols desktop).
- **Bean detail (`/bean/:id`)** — hero header, dark "Brew Dashboard" panel with water temp / ratio / total time, a numbered list of pours with volumes and tasting notes, a 5-star rating, and a brew-notes section.
- **Persistence** — ratings and comments are stored in `localStorage`, keyed per bean (`v60vault:rating:<id>`, `v60vault:comments:<id>`). No backend required.

## Add a new bean

Open [src/data/beans.js](src/data/beans.js) and append another object to the `beans` array. The shape:

```js
{
  id: 'kebab-case-unique-id',
  name: 'Display Name',
  origin: 'Country',
  flag: '🇪🇹',
  variety: 'Heirloom',
  elevation: '1,950–2,200 m',
  processing: 'Washed',           // Washed | Natural | Honey | Anaerobic …
  roastLevel: 'Light',            // Light | Medium-Light | Medium | Medium-Dark | Dark
  description: 'A short tasting blurb.',
  brew: {
    waterTemp: '94°C',
    totalTime: '2:45',
    ratio: '1:16 (15g : 240g)',
    pours: [
      { label: 'Bloom',  volume: '45 ml',             notes: '…' },
      { label: 'Pour 1', volume: '95 ml (to 140 g)',  notes: '…' },
      { label: 'Pour 2', volume: '100 ml (to 240 g)', notes: '…' },
    ],
  },
  rating: 0,
  comments: [],
}
```

Save the file — Vite hot-reloads, the new card appears on the landing page, and the route `/bean/<id>` works automatically.

## Stack

- React 18 + React Router v6
- Tailwind CSS (Play CDN, configured inline in [index.html](index.html))
- Vite 5
- `localStorage` for ratings + comments

## File map

```
src/
  main.jsx                  app entry, mounts <BrowserRouter>
  App.jsx                   route table
  index.css                 CSS variables, grain texture, base styles
  data/beans.js             single source of truth for beans
  components/
    V60Logo.jsx             inline SVG dripper mark
    BeanCard.jsx            grid card on the landing page
    StarRating.jsx          5-star localStorage-backed rating
    Comments.jsx            brew-notes thread, localStorage-backed
  pages/
    LandingPage.jsx         hero + bean grid
    BeanDetailPage.jsx      hero, dashboard, pours, rating, notes
```
