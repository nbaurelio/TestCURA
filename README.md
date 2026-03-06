# CURA - Clinical Undergraduate Referral Application

A comprehensive dental clinic referral management system built for clinical workflow optimization.

## 🎯 Features

### Referral Management
- Create new patient and existing patient referrals
- Auto-generated chart numbers (YEAR-00001 format)
- Clinical pathway selection (Section → Discipline → Treatment)
- Accept, update, and delete referrals
- Pinned referrals section for accepted cases
- Status tracking with visual badges

### Search & Filter
- Global search with category filtering (Chart #, Medical Alert, Origin, Destination, etc.)
- Advanced filter by clinical destination (Section, Discipline, Treatment)
- Real-time search results
- Exact match filtering for non-accepted referrals

### Schedule Planner
- Weekly calendar view (6 AM - 9 PM)
- Create, edit, and delete events
- Continuous event blocks spanning multiple time slots
- Year navigation and "Today" quick jump
- Event details modal

### User Profile
- Profile management with avatar support
- Edit personal information
- Department and role tracking
- Real-time updates across components

### UI/UX
- Responsive design (mobile, tablet, desktop)
- Auto-rotating featured referrals carousel
- Cohesive beige and dark blue theme
- Smooth transitions and hover effects
- Confirmation dialogs for critical actions

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **State Management**: React Hooks

## 📁 Project Structure

```
TestCURA/
├── cura-app/                 # Main Next.js application
│   ├── src/
│   │   ├── app/              # App router pages
│   │   │   ├── home/         # Homepage with referrals
│   │   │   ├── schedule/     # Schedule planner
│   │   │   └── activity-logs/
│   │   ├── components/       # Reusable components
│   │   │   ├── layout/       # Header, Footer
│   │   │   ├── modals/       # Modal dialogs
│   │   │   ├── referrals/    # Referral cards
│   │   │   └── ui/           # shadcn/ui components
│   │   └── lib/              # Utilities and API
│   │       ├── api/          # Supabase API functions
│   │       └── data/         # Static data (taxonomy)
│   ├── public/               # Static assets
│   └── supabase/             # Database setup scripts
├── index.html                # Landing page
├── profiles.html             # Profiles page
├── schedule.html             # Schedule page
└── styles.css                # Global styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/TestCURA.git
cd TestCURA
```

2. Install dependencies
```bash
cd cura-app
npm install
```

3. Set up environment variables
Create a `.env.local` file in the `cura-app` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database
Run the SQL scripts in `cura-app/supabase/setup-without-auth.sql` in your Supabase SQL editor.

5. Run the development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📊 Database Schema

### Tables
- **profiles**: User information (name, email, department, role, avatar)
- **referrals**: Patient referral data (chart number, clinical pathways, status)
- **events**: Schedule appointments (title, description, location, times)
- **activity_logs**: System activity tracking

### Clinical Taxonomy
- 5 Clinical Sections (OM, OP, Prostho, Ortho, Any)
- Multiple Disciplines per section
- Treatment Services per discipline

## 🎨 Design System

### Colors
- **Primary**: `#D4A574` (Beige)
- **Secondary**: `#2C3E50` (Dark Blue)
- **Background**: `#FFFBEF` (Light Cream)
- **Accent**: `#F97316` (Orange - for status badges)

### Typography
- Font Family: Inter
- Responsive font sizes
- Font weights: 400 (regular), 600 (semibold), 700 (bold)

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 📝 Usage

### Creating a Referral
1. Click "MAKE NEW REFERRAL" button
2. Choose "New Patient" or "Existing Patient"
3. Fill in required information
4. Select clinical pathway (Section → Discipline → Treatment)
5. Optionally schedule an appointment
6. Submit

### Accepting a Referral
1. Find the referral card
2. Click "ACCEPT" button
3. Confirm in the dialog
4. Referral moves to pinned section with "Pending" status

### Using Advanced Filter
1. Select Clinical Section
2. Choose Discipline (enabled after section selection)
3. Pick Treatment Service (enabled after discipline selection)
4. Click "SEARCH"
5. Results show exact matches for non-accepted referrals

### Managing Schedule
1. Navigate to desired week/year
2. Click empty time slot to create event
3. Fill in event details
4. Click existing event to view/edit/delete
5. Events span multiple time slots automatically

## 🤝 Contributing

This is a college project for dental clinic workflow management. Contributions, issues, and feature requests are welcome!

## 📄 License

This project is for educational purposes.

## 👥 Authors

College Student Project - Dental Clinic Referral System

## 🙏 Acknowledgments

- Built with Next.js and Supabase
- UI components from shadcn/ui
- Icons from Lucide React
- Inspired by real dental clinic workflows
