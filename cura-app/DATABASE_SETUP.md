# Database Setup Guide

## Step 1: Set Up Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Go to **Settings** → **API** in your Supabase dashboard
4. Copy your **Project URL** and **anon/public key**

## Step 2: Configure Environment Variables

Update your `.env.local` file with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Run Database Schema

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the schema

This will create:
- `profiles` table
- `referrals` table (with updated fields)
- `events` table
- `activity_logs` table
- Row Level Security (RLS) policies
- Storage bucket for attachments

## Step 4: Enable Authentication (Optional)

If you want to use authentication:

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Email** provider
3. Configure email templates if needed

For development, you can create test users:
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Create a test user with email and password

## Step 5: Test the Connection

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Open your browser and go to `http://localhost:3000`

3. Click **MAKE NEW REFERRAL** → **New Patient**

4. Fill out the form and click **SAVE**

5. Check your Supabase dashboard:
   - Go to **Table Editor** → **referrals**
   - You should see your new referral entry

## Troubleshooting

### "User not authenticated" error

The current implementation requires authentication. You have two options:

**Option A: Temporary - Disable RLS for testing**
```sql
-- Run this in SQL Editor for testing only
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
```

**Option B: Implement authentication (recommended)**
You'll need to add a login page and authentication flow. Let me know if you need help with this.

### TypeScript errors

The TypeScript errors you're seeing are related to the Supabase client types. They should resolve once:
1. Your database schema is created in Supabase
2. Your environment variables are set correctly
3. You restart the development server

### Connection errors

If you see connection errors:
1. Verify your `.env.local` file has the correct credentials
2. Make sure you've restarted the dev server after updating `.env.local`
3. Check that your Supabase project is active and running

## Next Steps

Once the database is connected and working:

1. **Add Authentication**: Implement user login/signup
2. **Fetch Referrals**: Update the homepage to load referrals from the database
3. **Real-time Updates**: Add Supabase real-time subscriptions for live updates
4. **File Uploads**: Implement attachment uploads to Supabase Storage

Let me know which feature you'd like to implement next!
