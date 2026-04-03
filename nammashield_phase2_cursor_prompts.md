# NammaShield Phase 2 — Cursor Prompts

> Paste each numbered prompt into Cursor sequentially. Complete and verify each one before moving to the next.
> Stack: Next.js 16 App Router · Tailwind CSS 4 · Zustand · Shadcn UI · Supabase · Flask (Render) · Simulated Auth & Wallet

---

## SECTION 1 — REPO STRUCTURE UPDATE

### 1.1 — Add ML service folder and scaffold it

In the project root, create a new top-level folder called `ml/`. Inside it, create the following empty files with placeholder comments only: `risk_model.py`, `fraud_model.py`, `train_data.py`, `api.py`, `requirements.txt`, and `Procfile`. Also create a `ml/README.md` that describes this folder as the Flask ML microservice for NammaShield. Do not write any logic yet.

### 1.2 — Update root README

Update the root `README.md` to reflect the current Phase 2 stack. Replace any mention of Express or SQLite. The README should document: the project overview, the full folder structure (Next.js app in root, ML service in `ml/`), the tech stack (Next.js, Supabase, Flask on Render), the environment variables needed (list names only, no values), and a note that payments are wallet-simulated. Add a Phase 2 section with the submission video link placeholder.

### 1.3 — Add project context file

Create a file at `docs/PROJECT_CONTEXT.md` and copy the full content of the existing project context document into it. This file will be referenced by Cursor in future prompts as the source of truth for the project.

### 1.4 — Create environment variable files

In the project root, create a `.env.local.example` file listing all environment variable keys that will be needed across the project: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ML_API_URL`, and `NEXT_PUBLIC_APP_URL`. Also create an `ml/.env.example` with `PORT` and `FLASK_ENV`. Add both `.env.local` and `ml/.env` to `.gitignore` if not already there.

---

## SECTION 2 — SUPABASE SETUP

### 2.1 — Install Supabase client

Install the `@supabase/supabase-js` package. Create a file at `src/lib/supabase/client.ts` that initialises and exports a Supabase browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Create a separate file at `src/lib/supabase/server.ts` that initialises and exports a Supabase server client using the service role key, for use in server components and API routes only.

### 2.2 — Write SQL migration: workers table

Create a file at `supabase/migrations/001_workers.sql`. Write the SQL to create a `workers` table with these columns: `id` (uuid, primary key, default gen_random_uuid()), `phone` (text, unique), `name` (text), `partner_id` (text), `city` (text), `zone` (text), `device_fingerprint` (text), `wallet_balance` (numeric, default 0), `streak_weeks` (integer, default 0), `is_onboarded` (boolean, default false), `created_at` (timestamptz, default now()). No foreign keys yet.

### 2.3 — Write SQL migration: policies table

Create a file at `supabase/migrations/002_policies.sql`. Write the SQL to create a `policies` table with these columns: `id` (uuid, primary key), `worker_id` (uuid, references workers), `tier` (text), `weekly_premium` (numeric), `coverage_amount` (numeric), `risk_score` (numeric), `start_date` (date), `end_date` (date), `status` (text, default 'active'), `created_at` (timestamptz, default now()).

### 2.4 — Write SQL migration: trigger_events, claims, gps_logs, payout_log tables

Create a file at `supabase/migrations/003_core_tables.sql`. Write SQL to create these four tables:

`trigger_events`: id (uuid, pk), event_type (text), zone (text), city (text), severity (text), threshold_value (numeric), started_at (timestamptz), ended_at (timestamptz), source (text), is_simulated (boolean, default false), created_at (timestamptz default now()).

`claims`: id (uuid, pk), worker_id (uuid, references workers), policy_id (uuid, references policies), trigger_event_id (uuid, references trigger_events), active_score (numeric), fraud_score (numeric), covered_hours (numeric), payout_amount (numeric), status (text), rejection_reason (text), created_at (timestamptz default now()).

`gps_logs`: id (uuid, pk), worker_id (uuid, references workers), lat (numeric), lng (numeric), is_active (boolean), logged_at (timestamptz default now()).

`payout_log`: id (uuid, pk), claim_id (uuid, references claims), worker_id (uuid, references workers), amount (numeric), wallet_balance_after (numeric), status (text), processed_at (timestamptz default now()).

### 2.5 — Write SQL migration: zone bounding boxes table

Create a file at `supabase/migrations/004_zones.sql`. Write SQL to create a `zones` table with columns: `id` (uuid, pk), `city` (text), `zone_name` (text), `lat_min` (numeric), `lat_max` (numeric), `lng_min` (numeric), `lng_max` (numeric), `historical_disruption_freq` (numeric, default 0.5), `income_band_min` (numeric), `income_band_max` (numeric). Then insert seed data for at least 3 zones each in Chennai, Mumbai, Delhi, and Bengaluru with realistic lat/lng bounding boxes and income band values from the README.

### 2.6 — Create Supabase types file

Create a file at `src/lib/supabase/types.ts` that exports TypeScript interfaces for each table: `Worker`, `Policy`, `TriggerEvent`, `Claim`, `GpsLog`, `PayoutLog`, and `Zone`. Field names and types must exactly match the SQL migrations written above.

---

## SECTION 3 — SIMULATED AUTH

### 3.1 — Create auth store

Create a Zustand store at `src/lib/authStore.ts`. It should hold: `workerId` (string or null), `workerPhone` (string or null), `isAuthenticated` (boolean), `isLoading` (boolean). It should expose actions: `loginWithPhone(phone)` which sets a simulated session by looking up or creating a worker row in Supabase by phone number, `logout()` which clears the state, and `rehydrate()` which checks localStorage for a saved workerId and restores session on app load.

### 3.2 — Update onboarding Step 1 (phone entry) to use auth store

Find the existing Step 1 component in the onboarding flow. Replace the hardcoded/mock phone submit handler with a call to `loginWithPhone(phone)` from the auth store. After successful login, the store should set `isAuthenticated = true` and save the `workerId` to localStorage. No OTP, no SMS — just phone number entry that creates or retrieves the worker record in Supabase. Show a loading state while the Supabase call is in flight.

### 3.3 — Add route protection to dashboard

In `src/app/dashboard/layout.tsx`, add a check on mount using the auth store. If `isAuthenticated` is false and `isLoading` is false, redirect to `/onboarding`. Call `rehydrate()` from the auth store on layout mount so that a page refresh does not log the user out. The redirect should be client-side only — do not use middleware for this.

---

## SECTION 4 — ONBOARDING CONNECTION TO SUPABASE

### 4.1 — Connect Step 2 (Partner ID / name entry) to Supabase

Find the existing Step 2 component. Replace the mock submit handler with a Supabase update call that saves `name` and `partner_id` to the workers table for the current `workerId` from the auth store. Keep the existing UI and form validation exactly as-is. Only replace the data layer.

### 4.2 — Connect Step 3 (city + zone selection) to Supabase and ML

Find the existing Step 3 component. On city + zone selection, do two things: (1) Save `city` and `zone` to the workers table in Supabase. (2) Call the Flask ML endpoint `POST /ml/risk-score` with `{ city, zone, streak_weeks: 0 }` and display the returned `risk_score`, `tier`, and `weekly_premium` in the UI. Use the `NEXT_PUBLIC_ML_API_URL` environment variable for the Flask base URL. Show a loading spinner while the ML call is in flight. If the ML service is unreachable, fall back to a hardcoded default tier of Standard with premium ₹100.

### 4.3 — Connect Step 4 (plan activation) to Supabase

Find the existing plan activation/confirmation step. Replace the mock handler with: (1) Insert a new row into the `policies` table using the risk score and tier returned from the ML call in Step 3. Set `start_date` to today, `end_date` to 7 days from today, `status` to `active`. (2) Set `is_onboarded = true` and `wallet_balance = 0` on the workers row. (3) Update the Zustand auth store to reflect the onboarded state. (4) Redirect to `/dashboard` on success.

---

## SECTION 5 — ML FLASK SERVICE

### 5.1 — Write requirements.txt and Procfile for Flask service

In the `ml/` folder, write `requirements.txt` with these packages: `flask`, `flask-cors`, `scikit-learn`, `numpy`, `pandas`, `joblib`, `gunicorn`. Write `Procfile` with a single line that starts the Flask app using gunicorn on the port from the `PORT` environment variable.

### 5.2 — Write synthetic training data generator

In `ml/train_data.py`, write a script that generates a CSV file called `risk_training_data.csv` with 1000 rows. Each row has these columns: `weather_risk` (float 0–1), `aqi_risk` (float 0–1), `zone_exposure` (float 0–1, mapped from a zones lookup), `streak_weeks` (integer 0–12), and `risk_score` (float 0–100, computed as the weighted formula: weather_risk×30 + aqi_risk×25 + zone_exposure×25 + (1 - streak_weeks/12)×20). Use numpy random to vary the inputs. Running this script should produce and save the CSV.

### 5.3 — Write and train the risk model

In `ml/risk_model.py`, write a script that loads `risk_training_data.csv`, trains a `GradientBoostingRegressor` from scikit-learn, evaluates it with MAE on a 20% test split, and saves the trained model to `ml/risk_model.pkl` using joblib. Running this script directly should train and save the model. Include a `predict(features_dict)` function that loads the pkl and returns `{ risk_score, tier, weekly_premium }` based on the tier thresholds in the README (0–30 Basic ₹50, 31–60 Standard ₹100, 61–80 Pro ₹150, 81–100 Surge ₹200).

### 5.4 — Write synthetic fraud training data and fraud model

In `ml/fraud_model.py`, write a script that generates 500 rows of synthetic fraud training data with columns: `claim_velocity` (float 0–1, claims per 4 weeks normalised), `zone_coherence_score` (float 0–1), `same_device_cluster` (binary 0/1), `label` (1=fraud, 0=legit). Create fraud scenarios: same device 3+ claims in a week, claim on every single trigger event, cluster of claims from 3 devices within 10 minutes. Train a `GradientBoostingClassifier`, save it as `ml/fraud_model.pkl`. Include a `score(features_dict)` function that returns `{ fraud_score, decision }` where decision is `auto_approve` if score < 0.3, `watchlist` if 0.3–0.7, `review` if > 0.7.

### 5.5 — Write the Flask API

In `ml/api.py`, create a Flask app with these two endpoints:

`POST /ml/risk-score`: accepts `{ city, zone, streak_weeks }`, calls the risk model predict function, returns `{ risk_score, tier, weekly_premium }`.

`POST /ml/fraud-score`: accepts `{ worker_id, claim_velocity, zone_coherence_score, same_device_cluster }`, calls the fraud model score function, returns `{ fraud_score, decision }`.

Both endpoints should have CORS enabled for all origins. Both should return a 500 with an error message if the model pkl file is not found. Add a `GET /health` endpoint that returns `{ status: "ok" }`.

### 5.6 — Add Render deployment config

In `ml/`, create a `render.yaml` file that defines a web service: runtime Python, build command runs `pip install -r requirements.txt` then runs `python risk_model.py` then `python fraud_model.py` to train and save both pkl files, start command uses the Procfile. Also create `ml/.python-version` with the Python version `3.11.0`.

---

## SECTION 6 — TRIGGER ENGINE

### 6.1 — Create weather service (Next.js API route)

Create a Next.js API route at `src/app/api/triggers/weather/route.ts`. This route, when called with `GET ?city=Chennai&zone=zone_1`, should call the OpenWeatherMap API using the free tier current weather endpoint with the zone's approximate lat/lng (look up from the zones table in Supabase). Check if rainfall > 15mm/hr OR temperature > 42°C with feels_like > 48°C. If a threshold is crossed, insert a row into `trigger_events` in Supabase and return the event. If no threshold is crossed, return null. Use `OPENWEATHERMAP_API_KEY` from env vars.

### 6.2 — Create simulation trigger endpoint

Create a Next.js API route at `src/app/api/triggers/simulate/route.ts`. This route accepts a `POST` with body `{ event_type, city, zone, severity, threshold_value }`. It inserts a row directly into `trigger_events` with `is_simulated: true` and immediately kicks off the claims engine (see Section 7). This endpoint is used by the admin panel to fire a disruption during the demo. No auth check needed for demo purposes.

### 6.3 — Create trigger monitor cron

Create a Next.js API route at `src/app/api/cron/trigger-monitor/route.ts`. This route, when called, iterates over all distinct active city+zone combinations from the policies table, calls the weather service for each, and if a trigger fires, kicks off the claims engine for that zone. Add a `vercel.json` or equivalent config at the project root that schedules this route to run every 15 minutes. Document in comments that for local testing, this route can be called manually.

---

## SECTION 7 — CLAIMS ENGINE

### 7.1 — Create active score calculator

Create a utility function at `src/lib/claims/activeScore.ts`. This function accepts `worker_id` and `trigger_event_id`, queries `gps_logs` in Supabase for that worker during the trigger window (started_at to ended_at of the trigger event), and returns an `active_score` (number of active GPS pings / expected pings). If there are no GPS logs for the worker, return a simulated active score of 0.65 as a fallback for the demo.

### 7.2 — Create payout calculator

Create a utility function at `src/lib/claims/payoutCalc.ts`. This function accepts `{ covered_hours, city, tier, weekly_premium }` and implements the exact payout formula from the README: `covered_hours = total_disruption_hours - 2` (deductible), `hourly_rate = city_income_band_midpoint / 56`, `raw_payout = covered_hours × hourly_rate × 0.70`, `final_payout = min(raw_payout, 1.5 × weekly_premium)`. Export a city income band lookup object matching the values in the README.

### 7.3 — Create the main claims engine

Create a server-side function at `src/lib/claims/claimsEngine.ts`. This function accepts a `trigger_event_id`. It should: (1) Fetch the trigger event from Supabase. (2) Find all workers with active policies in the matching city + zone. (3) For each worker: compute active_score, call the Flask fraud-score endpoint, compute payout using the payout calculator. (4) Insert a row into `claims` with the computed values and a status of `auto_approved`, `watchlist`, or `flagged` based on fraud decision. (5) If status is `auto_approved` or `watchlist`: update `workers.wallet_balance += payout_amount`, insert a row into `payout_log`. (6) Return a summary of how many claims were processed.

### 7.4 — Wire claims engine into simulation and cron routes

Update both `src/app/api/triggers/simulate/route.ts` and `src/app/api/cron/trigger-monitor/route.ts` to call the claims engine after a trigger event is created. Pass the new trigger event's id. The response from both routes should include the claims engine summary so it is visible in the admin panel.

---

## SECTION 8 — GPS LOGGING (SIMULATED)

### 8.1 — Create GPS logging API route

Create a Next.js API route at `src/app/api/gps/log/route.ts`. It accepts `POST` with body `{ worker_id, lat, lng, is_active }` and inserts a row into `gps_logs`. Rate-limit inserts to one per worker per minute by checking the latest log timestamp before inserting.

### 8.2 — Add GPS polling to dashboard layout

In `src/app/dashboard/layout.tsx`, add a client-side effect that runs after mount. Every 5 minutes, call `navigator.geolocation.getCurrentPosition` and POST the result to `/api/gps/log` with the current worker id from the auth store. If geolocation is denied or unavailable, silently skip — do not show any error to the user. This should not affect the UI at all.

### 8.3 — Add GPS simulation for demo

In the admin panel page at `src/app/dashboard/admin/page.tsx`, add a button labelled "Simulate GPS Activity for All Workers". When clicked, it should call a new API route `POST /api/gps/simulate` which inserts 12 synthetic GPS log rows (1 per hour for the past 12 hours, all `is_active: true`) for every worker currently in the Supabase workers table. This ensures active_score calculations return valid results during the demo.

---

## SECTION 9 — DASHBOARD DATA CONNECTION

### 9.1 — Replace mock data on main dashboard

In `src/app/dashboard/page.tsx`, replace all references to `mockData` with live Supabase queries. Fetch the current worker's record (wallet_balance, streak_weeks, city, zone), their active policy (tier, weekly_premium, coverage_amount, end_date), and the 3 most recent trigger events for their city. Pass this data as props to the existing UI components. Keep the existing component structure and visual design exactly the same — only replace the data source.

### 9.2 — Replace mock data on policy page

In `src/app/dashboard/policy/page.tsx`, replace mock data with a live Supabase query for the worker's active policy row. Display all real fields: tier, weekly_premium, coverage_amount, risk_score, start_date, end_date, status. If no active policy exists, show a CTA to complete onboarding.

### 9.3 — Replace mock data on claims page

In `src/app/dashboard/claims/page.tsx`, replace mock data with a live Supabase query that fetches all claims for the current worker, joined with their related trigger_event (event_type, city, zone, started_at) and payout_log (amount, processed_at). Display each claim row using the existing `TriggerRow` component or equivalent. Show real payout amounts, real active scores, real fraud scores, and real statuses.

### 9.4 — Replace mock data on risk calculator page

In `src/app/dashboard/calculator/page.tsx`, keep the interactive UI as-is. Replace the hardcoded premium output with a live call to `POST /ml/risk-score` whenever the city, zone, or streak slider changes. Debounce the call by 500ms to avoid hammering the ML service on every slider tick. Show the real returned risk_score, tier, and weekly_premium.

### 9.5 — Add wallet balance display

In the dashboard sidebar or topbar (whichever shows user info in `src/app/dashboard/layout.tsx`), add a wallet balance display showing the current worker's `wallet_balance` from Supabase in ₹ format. Subscribe to real-time changes on the workers table for this worker using Supabase's real-time channel so the balance updates live when a payout is processed without requiring a page refresh.

---

## SECTION 10 — ADMIN PANEL CONNECTION

### 10.1 — Replace mock data on admin page

In `src/app/dashboard/admin/page.tsx`, replace all mock data with live Supabase queries. Show: total active workers count, total active policies count, total payouts this week (sum from payout_log), current portfolio loss ratio (total_payouts / total_premiums_collected), and a live list of the 10 most recent trigger events with their claim count.

### 10.2 — Build the trigger simulation UI

In the admin panel, build a trigger simulation form with these fields: event type (dropdown: Heavy Rain, Extreme Heat, Severe AQI, Civil Shutdown, Flash Flood), city (dropdown), zone (dropdown, populated based on city selection), severity (dropdown: moderate, severe, extreme), and duration in hours (number input, default 5). A "Fire Trigger" button calls `POST /api/triggers/simulate`. After the call returns, display the claims engine summary inline: how many workers were affected, total payout amount, how many were auto-approved vs flagged.

### 10.3 — Build claims review queue in admin panel

In the admin panel, add a section that queries all claims with status `watchlist` or `flagged` from Supabase, ordered by created_at desc. For each claim show: worker name, trigger type, payout amount, fraud score, active score, and two buttons — "Approve" and "Reject". Approve should update the claim status to `auto_approved` and trigger a wallet update. Reject should update status to `rejected` and set a rejection reason. Both actions call new API routes `POST /api/claims/approve` and `POST /api/claims/reject`.

---

## SECTION 11 — POLICY AUTO-RENEWAL

### 11.1 — Create policy renewal cron

Create a Next.js API route at `src/app/api/cron/renew-policies/route.ts`. When called, it queries all policies where `end_date = today` and `status = active`. For each, it creates a new policy row with a new 7-day window, using the same worker's current city and zone to re-call the ML risk-score endpoint for an updated premium. It does not deduct any real money — this is simulated. Add this route to the same cron schedule config as the trigger monitor, set to run daily at 6 AM IST. Also update the worker's `streak_weeks` by incrementing it if they had no claims in the expiring policy window, or resetting to 0 if they did.

---

## SECTION 12 — FINAL INTEGRATION & DEMO PREP

### 12.1 — Add real-time claim notification in dashboard

In `src/app/dashboard/page.tsx` or the dashboard layout, subscribe to real-time inserts on the `claims` table filtered by the current `worker_id` using Supabase real-time. When a new claim is inserted with status `auto_approved`, show a toast notification using Shadcn UI's toast component with the message: "₹[amount] credited — [event_type] detected in your zone." This is the key UX moment for the demo.

### 12.2 — Verify the full demo flow end to end

Manually test this exact sequence and fix any broken steps: (1) Open the app in a fresh browser tab (no session). (2) Enter a phone number on onboarding Step 1 — worker row should be created in Supabase. (3) Complete all onboarding steps — policy row should appear in Supabase with real ML-calculated premium. (4) Dashboard shows live wallet balance (₹0), active policy, risk score. (5) Open admin panel, use GPS simulation button to seed activity logs. (6) Fire a trigger simulation for the same city and zone as the onboarded worker. (7) Dashboard updates in real-time: wallet balance increases, claims page shows new claim, toast notification appears. Document any steps that fail as GitHub issues.

### 12.3 — Add loading and empty states throughout

Audit every dashboard page and replace any remaining hardcoded mock data fallbacks with proper loading skeletons (use Shadcn Skeleton component) and empty states. Specifically check: dashboard main page, policy page, claims page, calculator page, and admin panel. Each page should handle three states cleanly: loading (skeleton), empty (no data yet with a helpful message), and populated (live data).

### 12.4 — Update environment variables documentation

Update `README.md` and `.env.local.example` with the final list of all environment variables used across the project. Add a section called "Local Development Setup" with exact steps: clone repo, copy .env.local.example to .env.local, fill in Supabase URL and anon key, fill in OpenWeatherMap key, fill in ML API URL (either local Flask or Render URL), run `npm install`, run `npm run dev`. This is what judges and reviewers will follow.

### 12.5 — Prepare GitHub repo for submission

Ensure the following are all present and correct in the repo: `README.md` with Phase 2 video link filled in, all SQL migration files in `supabase/migrations/`, `ml/` folder with all Python files committed (pkl files excluded via .gitignore), `.env.local.example` with all keys listed, and no hardcoded API keys or secrets anywhere in the codebase. Run a final search across all files for any string matching `supabase.co` or `sk_` or `pk_` to catch accidental key leaks.

---

## APPENDIX — QUICK REFERENCE

| What | Where |
|---|---|
| Supabase browser client | `src/lib/supabase/client.ts` |
| Supabase server client | `src/lib/supabase/server.ts` |
| TypeScript types | `src/lib/supabase/types.ts` |
| Auth store | `src/lib/authStore.ts` |
| Active score util | `src/lib/claims/activeScore.ts` |
| Payout calc util | `src/lib/claims/payoutCalc.ts` |
| Claims engine | `src/lib/claims/claimsEngine.ts` |
| Trigger simulate API | `src/app/api/triggers/simulate/route.ts` |
| Weather trigger API | `src/app/api/triggers/weather/route.ts` |
| Cron: trigger monitor | `src/app/api/cron/trigger-monitor/route.ts` |
| Cron: policy renewal | `src/app/api/cron/renew-policies/route.ts` |
| GPS log API | `src/app/api/gps/log/route.ts` |
| Claims approve API | `src/app/api/claims/approve/route.ts` |
| Claims reject API | `src/app/api/claims/reject/route.ts` |
| Flask entry point | `ml/api.py` |
| Risk model | `ml/risk_model.py` |
| Fraud model | `ml/fraud_model.py` |
| ML SQL migrations | `supabase/migrations/001–004` |
