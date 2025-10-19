# MPLAN Dashboard MVP

This project provides a minimal **MPLAN** dashboard web app built with Next.js, Tailwind CSS, and Supabase.  It allows you to:

- List daily updates for all companies on the current date (using the `daily_report` view).
- Visualise progress for each company on the dashboard with a simple bar chart.
- Add new daily updates for companies via a form.

You can use this codebase as a starting point to build out a more comprehensive marketing management platform.

## ⚙️ Prerequisites

Before running the app you need:

1. **Node.js** and **npm** installed on your machine.
2. A **Supabase project** with the tables/view described in our previous discussion:
   - `companies` table for storing companies.
   - `daily_updates` table for daily progress entries.
   - `daily_report` view joining the above tables for convenient reporting.
3. A pair of Supabase keys (the project URL and anon/public key).

## 🧑‍💻 Getting Started

1. **Clone or copy** this repository to your local machine.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the `.env.example` file to `.env.local` and fill in your Supabase credentials:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and set:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app should be running at http://localhost:3000.

5. Navigate to:
   - `/` → Displays the dashboard for today's updates with a bar chart.
   - `/create-update` → Form to create a new daily update entry.

## 📁 Project Structure

```
mplan_dashboard_mvp/
├── lib/                 # Supabase client
│   └── supabaseClient.js
├── pages/               # Next.js pages
│   ├── index.js         # Dashboard showing daily updates and a bar chart
│   ├── create-update.js # Page for inputting daily updates
│   └── _app.js          # Top-level component loading global CSS
├── styles/
│   └── globals.css      # Tailwind base and utilities
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
├── package.json         # Project metadata and dependencies
├── .env.example         # Template for environment variables
└── README.md            # Instructions and overview
```

## 🚀 Next Steps

This MVP only scratches the surface.  To extend it you could:

- Add authentication and authorisation (using Supabase Auth).
- Implement a page for creating and editing companies.
- Build additional analytics (trends over time, comparisons between dates).
- Add notifications or reminders via serverless functions.
- Design a nicer UI/UX using your favourite component library.

Feel free to customise and expand the code to fit your exact marketing workflow!
