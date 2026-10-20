# Time Tracker

A small web app for consultants to track time spent on tasks for customers.

- **Timer**: pick a task and press Start. Choosing another task while it runs switches over (the running entry is closed). Only one timer can run at a time.
- **Manual entries**: add, edit or delete time if you forgot the timer.
- **Customers & tasks**: customers can have an optional hourly rate. Tasks can be archived when finished.
- **Reports**: hours and amounts per customer and task for today, this/last week or this/last month. Export to CSV for invoicing.

## Stack

- React + TypeScript + Vite
- [shadcn/ui](https://ui.shadcn.com) components (Radix + Tailwind CSS v4), in `src/components/ui`
- Express API in `server/`, with SQLite through Node's built-in `node:sqlite`, so there are no native dependencies to compile

The database is a single file at `data/tracker.db` (set `DB_FILE` to change it). Back it up by copying that file.

## Running

Requires Node.js 22.18 or newer.

```sh
npm install
npm run dev      # API on :3001, Vite on :5173 with /api proxied
```

For everyday use, build once and run a single server:

```sh
npm run build
npm start        # serves the app and API on http://localhost:3001 (PORT to change)
```

## Adding shadcn components

`components.json` is set up, so `npx shadcn@latest add <component>` works as usual.
