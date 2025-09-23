# QuizEthic - Secure Online Quiz Platform

A Next.js-based quiz platform with advanced anti-cheating features powered by Supabase

## ✅ Project Status

Your project is **working correctly**! The development server starts successfully and all dependencies are properly configured.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or later)
- pnpm (recommended) or npm
- Supabase account

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [Supabase](https://supabase.com)
2. Go to your project's SQL Editor
3. Run the database schema:
   ```sql
   -- Copy and run the contents of scripts/001_create_database_schema.sql
   -- Then run scripts/002_create_user_trigger.sql
   ```

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   copy .env.example .env.local  # Windows
   cp .env.example .env.local    # macOS/Linux
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Start Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:3000` (or `http://localhost:3001` if 3000 is in use).

## 🏗️ Project Structure

```
├── app/                    # Next.js 14 app directory
│   ├── auth/              # Authentication pages
│   ├── student/           # Student dashboard & features
│   ├── teacher/           # Teacher dashboard & features
│   └── admin/             # Admin panel
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Authentication components
│   └── anti-cheating/    # Anti-cheating monitoring
├── lib/                  # Utility functions
│   └── supabase/         # Supabase client configuration
├── scripts/              # Database setup scripts
└── styles/               # Global styles
```

## 🔧 Features

- **Multi-role Authentication**: Students, Teachers, and Admins
- **Anti-cheating Technology**: 
  - Webcam monitoring
  - Tab switching detection
  - Fullscreen enforcement
  - Copy-paste prevention
- **Quiz Management**: Create, edit, and manage quizzes
- **Real-time Monitoring**: Live cheating detection and logging
- **Comprehensive Analytics**: Performance tracking and reporting

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Package Manager**: pnpm

## 📋 Current Status

✅ **Dependencies**: All packages installed correctly
✅ **Configuration**: TypeScript, Next.js, and Tailwind properly configured  
✅ **Development Server**: Running successfully on port 3001
✅ **Database Schema**: Complete SQL scripts provided
⚠️ **Environment Variables**: Need to be configured with your Supabase credentials

## 🔨 Next Steps

1. **Set up Supabase**: Create your project and run the database scripts
2. **Configure Environment Variables**: Add your Supabase credentials to `.env.local`
3. **Test Authentication**: Create a test teacher and student account
4. **Create Your First Quiz**: Use the teacher dashboard to create a quiz
5. **Test Anti-cheating Features**: Try taking a quiz as a student

## 🐛 Troubleshooting

- **Port already in use**: The app automatically tries port 3001 if 3000 is busy
- **Environment variables**: Make sure `.env.local` exists with valid Supabase credentials
- **Database errors**: Ensure you've run both SQL scripts in your Supabase project
- **Package manager**: Use `pnpm` instead of `npm` (this project is configured for pnpm)

## 📞 Support

If you encounter any issues, check:
1. All environment variables are set correctly
2. Supabase project is active and database scripts have been run
3. Dependencies are installed with `pnpm install`
4. Development server is running with `pnpm dev`