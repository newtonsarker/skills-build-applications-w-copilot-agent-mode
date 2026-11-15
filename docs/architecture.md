# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Build the UI as a small React Router app using Bootstrap cards and accessible status/empty/error messaging. Each feature page will fetch from the shared API client, render loading states immediately, and fail gracefully with clear alerts when the backend is unavailable.
- Logic tier decision: Keep Express routes thin and delegate all business rules to service functions in `src/services/octofitService.ts`. Validation will convert malformed payloads into deliberate 4xx errors, while the router remains responsible only for HTTP shape and error forwarding.
- Data tier decision: Use Mongoose schemas to enforce required fields and types, keep references to `User` and `Team`, and let the service layer handle aggregation and seed reconciliation. Shared database configuration will centralize connection setup and environment variables instead of duplicating connection logic.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`, verify that both references exist, compute `points` from minutes and activity type, and persist `occurredAt` with a valid ISO timestamp. Invalid IDs or missing users/teams will return 400/404 style 4xx responses without leaking database cast errors.
- Team management approach: Require `name` and `mascot` on team creation, normalize members to ObjectId arrays, and keep the list endpoint returning team summaries with member IDs. When seeding demo data, reconcile an existing user’s previous team membership before moving them into the seeded Octocats team.
- Leaderboard approach: Aggregate `Activity` records by team, sum points, and sort descending. The API will return `{ teamName, totalPoints, rank }` with 1-based ranking values while preserving deterministic ordering for ties via team name or insertion order.
- Workout suggestions approach: Look up the target user by email, inspect the latest relevant activity pattern or fitness goal, and rank Workout documents by matching focus. The first suggestion will include a human-readable `reason` string and a 4xx response for unknown email addresses.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
