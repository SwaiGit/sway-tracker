# Sway Task Tracker

A weekly task management web app for the Sway team — works on desktop and mobile browsers.

## Features

- Personal & Professional (SWAY) dashboards
- Weekly navigation with day-by-day task checklists
- General To Do + Things To Buy (or Leads) sidebar lists
- Drag-and-drop tasks between days and sidebar
- Progress ring and completion stats
- Live Calgary weather + world clocks
- Email/password authentication via Supabase
- Data persists in localStorage (cloud sync via Supabase planned)
- Full mobile support — works as a browser web app on iOS/Android

## Stack

- Next.js 14 (App Router)
- Supabase Auth
- Vercel (deployment)

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Deployment to Vercel

1. Push this folder to a GitHub repo
2. In Vercel, import the repo
3. Add the environment variables from `.env.example` in Vercel's dashboard
4. Deploy — Vercel handles everything automatically

## Supabase setup

1. Create a Supabase project at supabase.com
2. In the SQL editor, run the contents of `supabase/schema.sql`
3. In Authentication settings, add your Vercel domain to the redirect URLs

## Database schema

The schema is in `supabase/schema.sql` — run it in the Supabase SQL editor to set up your tables.

## Adding the app to your phone

On iPhone: open in Safari → Share → Add to Home Screen  
On Android: open in Chrome → menu → Add to Home Screen

This turns it into a full-screen app icon on your phone.
