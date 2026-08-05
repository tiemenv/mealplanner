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
| `MONGODB_URI` | A MongoDB connection string (e.g. [MongoDB Atlas](https://www.mongodb.com/atlas)). Must end with an explicit database name. |
| `MONGODB_DB_EXPECTED` | The database this environment may use — `weeklyplate_dev` locally. See [Environments](#environments). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk dashboard](https://dashboard.clerk.com) → API Keys. Use the **development** instance locally. |
| `BLOB_READ_WRITE_TOKEN` | *(optional)* Vercel Blob store token for image uploads. Without it, the meal form falls back to pasting an image URL. |

The app validates all of these at boot (`src/lib/env.ts`) and refuses to start on a bad combination, so a misconfigured environment fails immediately rather than on its first query.

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

> Both steps are **per Clerk instance**. `publicMetadata` and the session-token claim do not carry from development to production, so a user who is a creator in dev is not one in production until you repeat this on the production instance. If the claim is missing, `isCreator` is silently `false` and the creator routes just redirect away.

You should now see **New collection** on `/collections` and a **My collections** page. Without the role those routes redirect back to the public collection list.

To grant the role from code instead (for example from a webhook or an internal action):

```ts
const client = await clerkClient();
await client.users.updateUserMetadata(userId, {
  publicMetadata: { role: "creator" },
});
```

## Environments

Development and production are fully separate: no dependency is shared between them.

One Vercel project holds both. Every variable is scoped so that **Production** carries the live values while **Preview** and **Development** carry the dev ones — which means every pull-request deployment automatically runs against dev resources.

| Dependency | Production | Preview + Development |
| --- | --- | --- |
| MongoDB | `test` database (see below) | `weeklyplate_dev` database |
| Clerk | production instance (`pk_live`/`sk_live`) | development instance (`pk_test`/`sk_test`) |
| Vercel Blob | production store | separate dev store |
| Google Gemini | key from the production GCP project | key from a separate GCP project, for its own quota |
| Unsplash | production app | separate Demo app |
| Spoonacular | production key | second key, or unset |

MongoDB is the one that needs care: both databases live on the **same Atlas cluster**, so the database name at the end of `MONGODB_URI` is the only thing keeping them apart.

`MONGODB_DB_EXPECTED` declares which database an environment may use, and the app refuses to boot if `MONGODB_URI` disagrees — including when the URI names no database at all. Setting the variable is what switches the check on; leave it unset and you get a warning in the logs instead, so an unconfigured deployment still runs.

Each boot logs the environment and database in use, so a mix-up shows up in the Vercel logs:

```
[boot] environment=preview mongodb=weeklyplate_dev
```

### Naming the production database

The original `MONGODB_URI` ended at `/?appName=mealplanner` with no database name, which means MongoDB fell back to its default and **all existing data lives in the `test` database**. Keeping production on `test` avoids moving any data: append `/test` to the production URI so the current behaviour becomes explicit, and point dev at `/weeklyplate_dev`.

Renaming `test` to something meaningful is a separate, optional migration — MongoDB has no rename operation, so it means a `mongodump` of `test` followed by a `mongorestore` into the new name, then swapping the URI. Worth doing when convenient, but not a prerequisite for splitting the environments.

Because isolation is by database name only, the two environments still share cluster compute, credentials and network rules — a heavy dev query can affect production. Moving dev to its own Atlas project (its own free M0 cluster, own users, own network rules) is the upgrade path if that becomes a problem.

One thing worth knowing: meal `imageUrl` values point at a specific Blob store. Copying production data down to dev leaves those URLs resolving to production blobs. Reads work fine, but dev is then displaying production assets.

### Seeding and scripts

Anything that writes requires you to name the target database, and it must match `MONGODB_URI`:

```bash
npm run seed -- --db=weeklyplate_dev
npx tsx --conditions=react-server scripts/collection-check.ts --db=weeklyplate_dev
```

Both scripts also refuse to run at all when `NODE_ENV` or `VERCEL_ENV` is `production`. This matters most for `npm run seed -- --wipe`, which deletes meals.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Link your checkout with `vercel link`, then pull local values with `vercel env pull .env.local` so local config stops drifting from the dashboard.
3. Add the environment variables above, scoped per environment as in the table — set the production values on **Production** only, and the dev values on **Preview** and **Development**.
4. Create two **Blob** stores under the Storage tab and connect each to its own environments, so `BLOB_READ_WRITE_TOKEN` differs per scope rather than being injected everywhere.
5. Make sure each Clerk instance's allowed origins include the domains it serves.

## Notes

- Diet labels are intentionally simple (`veg` / `non-veg`). The slider sets a *target* ratio; the generator gets as close as your library allows (e.g. if a meal type has no veg options, those slots stay non-veg).
- Locked slots are always preserved across regenerations and count toward the veg/non-veg balance.
