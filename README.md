# 🍳 Mealmate

A weekly meal planner built with **Next.js (App Router)**, **MongoDB**, **Clerk**, **Tailwind CSS** and **shadcn/ui** — ready to deploy on **Vercel**.

Build a library of your meals (tagged by diet, meal type and cuisine), then auto-generate a varied, balanced weekly plan with the veg / non-veg mix you want. Plan solo, or invite your household into a shared group.

## Features

- **Auth** with Clerk (sign in / up, user button, protected routes).
- **Meal library** — add/edit/delete meals with:
  - `Vegetarian` / `Non-veg` diet label
  - multi-select meal types (`Breakfast`, `Lunch`, `Dinner`)
  - cuisine tag (pick an existing one or add a new one inline)
  - image (upload via Vercel Blob, or paste a URL), ingredients and recipe
  - search & filter by name, diet, meal type and cuisine
- **Weekly planner** — 7 days × breakfast/lunch/dinner (21 slots):
  - one-click generation that maximises **variety** (avoids repeats)
  - a **veg vs non-veg slider** to set the target weekly mix
  - **lock** slots you like, **shuffle** a single slot, **swap** in a specific meal, or **clear** a slot
  - browse and plan any week (past / future)
- **Groups** — create one shared workspace, **invite members by email**, accept/decline invites, manage members. While in a group you use the **shared** library and plans (personal mode otherwise; one group at a time).

## Tech / architecture

- `src/models/*` — Mongoose models (`UserProfile`, `Group`, `Invite`, `Meal`, `MealPlan`).
- `src/lib/workspace.ts` — resolves the signed-in user and their **active workspace** (`user:<clerkId>` or `group:<groupId>`). All meals and plans are keyed by this `ownerKey`, so switching between personal and group context is automatic.
- `src/lib/generate.ts` — pure meal-plan generation (veg ratio + variety) and single-slot regeneration.
- Mutations use **server actions** (`src/app/(app)/**/actions.ts`); pages are server components.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
| --- | --- |
| `MONGODB_URI` | A MongoDB connection string (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas)). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk dashboard](https://dashboard.clerk.com) → API Keys. |
| `BLOB_READ_WRITE_TOKEN` | *(optional)* Vercel Blob store token for image uploads. Without it, the meal form falls back to pasting an image URL. |

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables above in the Vercel project settings.
3. (Optional) Create a **Blob** store under the project's Storage tab — Vercel injects `BLOB_READ_WRITE_TOKEN` automatically to enable image uploads.
4. Make sure your Clerk instance's allowed origins include your Vercel domain.

## Notes

- Diet labels are intentionally simple (`veg` / `non-veg`). The slider sets a *target* ratio; the generator gets as close as your library allows (e.g. if a meal type has no veg options, those slots stay non-veg).
- Locked slots are always preserved across regenerations and count toward the veg/non-veg balance.
