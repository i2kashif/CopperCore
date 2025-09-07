# 🚀 Local Environment Setup

## Issue: API Not Starting
The API is failing because it can't find the Supabase environment variables. GitHub secrets are only available in CI/CD, not for local development.

## ✅ Quick Fix

You need to add your **actual Supabase project values** to the root `.env` file:

### 1. Get Your Supabase Values
From your Supabase project dashboard:
- Project URL: `https://your-project-id.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Update `/Users/ibrahimkashif/Desktop/CopperCore/.env`

Replace these lines:
```bash
SUPABASE_URL=https://your-actual-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here
```

With your **actual values**.

### 3. Save and Restart

The development servers should automatically restart and the API will start successfully.

## ⚙️ What This Does

- **API**: Uses your anon key as service role key (development mode)
- **Web**: Gets the same values via environment variable substitution  
- **Both apps**: Connect to your actual Supabase project instead of missing localhost

## ✅ Expected Result

After updating:
- ✅ API starts without errors
- ✅ Create User button works
- ✅ Create Factory button works
- ✅ Full UI becomes responsive

## 🔒 Security Note

The `.env` file is already in `.gitignore`, so your actual keys won't be committed to the repository.