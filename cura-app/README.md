# CURA - Clinical Referral Management System

A modern web application for managing clinical referrals, built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

## Tech Stack

### Frontend
- **Next.js 14** - React Framework with App Router
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **ShadCN/UI** - Component Library
- **Lucide React** - Icons

### Backend / Database
- **Supabase** - Backend as a Service
  - PostgreSQL Database
  - Authentication
  - Row Level Security (RLS)
  - Storage for file uploads

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   cd cura-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the schema from `supabase/schema.sql`
   - Copy your project URL and anon key from Project Settings > API

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
cura-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Homepage
│   │   ├── schedule/           # Schedule Planner
│   │   ├── profiles/           # User Profiles
│   │   └── activity-logs/      # Activity Logs
│   ├── components/
│   │   ├── ui/                 # ShadCN UI components
│   │   ├── layout/             # Header, Footer
│   │   ├── modals/             # Modal dialogs
│   │   ├── sidebar/            # Sidebar components
│   │   └── referrals/          # Referral components
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── database.ts         # TypeScript types
├── supabase/
│   └── schema.sql              # Database schema
└── public/                     # Static assets
```

## Features

- **Dashboard** - View and manage referrals
- **Create Referrals** - Submit new patient referrals
- **Schedule Planner** - Manage your schedule and events
- **User Profiles** - Search and view user profiles
- **Activity Logs** - Track all actions performed
- **Authentication** - Secure login with Supabase Auth
- **File Uploads** - Attach files to referrals

## Database Schema

### Tables
- `profiles` - User profiles (extends auth.users)
- `referrals` - Patient referrals
- `events` - Schedule events
- `activity_logs` - User activity tracking

### Row Level Security
All tables have RLS enabled with appropriate policies for data access control.

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT License
