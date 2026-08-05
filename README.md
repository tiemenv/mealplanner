# 🍳 The Weekly Plate

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
- **Collections** — ready-made sets of meals anyone can browse and import, either whole or dish by dish. Imports skip anything already in your library. Curating collections is gated behind a **creator** role (see below).

## Tech / architecture

- `src/models/*` — Mongoose models (`UserProfile`, `Group`, `Invite`, `Meal`, `MealPlan`, `Collection`).
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

### 4. Give yourself the creator role (optional)

Curating collections is limited to users with a `creator` role. The role lives in Clerk's `publicMetadata`, which only the backend can write, and is mirrored into the session token so the app can read it without an API call on every request.

1. **Set the role.** [Clerk dashboard](https://dashboard.clerk.com) → **Users** → your user → **Metadata** → **Public** → **Edit**, then save:

   ```json
   { "role": "creator" }
   ```

2. **Put it in the session token.** Clerk dashboard → **Sessions** → **Customize session token** → **Edit**, then save the following. If you already have custom claims, merge this into them:

   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```

3. **Sign out and back in**, so a token containing the new claim is issued.

You should now see **New collection** on `/collections` and a **My collections** page. Without the role those routes redirect back to the public collection list.

To grant the role from code instead (for example from a webhook or an internal action):

```ts
const client = await clerkClient();
await client.users.updateUserMetadata(userId, {
  publicMetadata: { role: "creator" },
});
```

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables above in the Vercel project settings.
3. (Optional) Create a **Blob** store under the project's Storage tab — Vercel injects `BLOB_READ_WRITE_TOKEN` automatically to enable image uploads.
4. Make sure your Clerk instance's allowed origins include your Vercel domain.

## Notes

- Diet labels are intentionally simple (`veg` / `non-veg`). The slider sets a *target* ratio; the generator gets as close as your library allows (e.g. if a meal type has no veg options, those slots stay non-veg).
- Locked slots are always preserved across regenerations and count toward the veg/non-veg balance.
