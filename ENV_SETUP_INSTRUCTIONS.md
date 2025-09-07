# Environment Setup Instructions

## Required Action: Update Environment Variables

### 1. API Environment (`/Users/ibrahimkashif/Desktop/CopperCore/apps/api/.env`)

Replace the placeholder values with your actual GitHub secret values:

```bash
# 1. Replace with your SUPABASE_URL_PREVIEW value
SUPABASE_URL=https://your-project.supabase.co

# 2. Replace with your SUPABASE_ANON_KEY_PREVIEW value  
SUPABASE_SERVICE_ROLE_KEY=your-preview-anon-key
```

### 2. Web Environment (`/Users/ibrahimkashif/Desktop/CopperCore/apps/web/.env.local`)

Update the frontend environment to match:

```bash
# Replace with your SUPABASE_URL_PREVIEW value
VITE_SUPABASE_URL=https://your-project.supabase.co

# Replace with your SUPABASE_ANON_KEY_PREVIEW value
VITE_SUPABASE_ANON_KEY=your-preview-anon-key

# API URL (should already be correct)
VITE_API_URL=http://localhost:3001
```

## Steps:
1. Open `/Users/ibrahimkashif/Desktop/CopperCore/apps/api/.env`
2. Replace `https://your-project.supabase.co` with your actual `SUPABASE_URL_PREVIEW` value
3. Replace `your-preview-anon-key` with your actual `SUPABASE_ANON_KEY_PREVIEW` value
4. Open `/Users/ibrahimkashif/Desktop/CopperCore/apps/web/.env.local`
5. Update the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with the same values
6. Save both files

## Why This Works:
- Using `SUPABASE_ANON_KEY_PREVIEW` as the service role key (Option A approach)
- API will handle the key type gracefully and provide appropriate logging
- Frontend and backend will use the same Supabase instance
- This allows the API to start without requiring a separate service role key

## After Update:
The API should start successfully and the Create User/Factory buttons should become responsive.