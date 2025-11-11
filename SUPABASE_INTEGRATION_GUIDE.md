# Supabase-Centric Integration Guide
## J-SAT - Java Skill Assessment Tool

This document details the complete implementation of the Supabase-centric authentication and role-based access control (RBAC) system.

---

## 🎯 Overview

The system implements a **gatekeeper pattern** using the `is_role_finalized` boolean flag in the profiles table to ensure secure role assignment and prevent unauthorized access.

### Key Security Features
- ✅ Automatic profile creation on signup via Postgres trigger
- ✅ Role finalization through secure RPC function
- ✅ RLS policies prevent direct role manipulation
- ✅ Recruiter verification code system
- ✅ Frontend and backend role enforcement

---

## 📊 Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate', 'recruiter', 'admin')),
    is_role_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### The Gatekeeper Flag
- **`is_role_finalized = FALSE`**: User has not chosen their role (gate closed)
- **`is_role_finalized = TRUE`**: User has finalized their role (gate open)

---

## 🔐 Security Implementation

### 1. Automatic Profile Creation
**Trigger:** `on_auth_user_created`
- Fires after new user signup in `auth.users`
- Creates profile with gate closed (`is_role_finalized = FALSE`)
- Extracts and splits full name from signup metadata

```sql
CREATE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  name_parts TEXT[];
BEGIN
  full_name := NEW.raw_user_meta_data->>'full_name';
  
  IF full_name IS NOT NULL AND full_name != '' THEN
    name_parts := string_to_array(trim(full_name), ' ');
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (
      NEW.id,
      name_parts[1],
      CASE 
        WHEN array_length(name_parts, 1) > 1 
        THEN array_to_string(name_parts[2:array_length(name_parts, 1)], ' ')
        ELSE NULL
      END
    );
  ELSE
    INSERT INTO public.profiles (id) VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Secure Role Finalization
**RPC Function:** `finalize_role(new_role TEXT)`
- Only way to set role and open the gate
- Uses `SECURITY DEFINER` to bypass RLS
- Automatically sets `is_role_finalized = TRUE`

```sql
CREATE FUNCTION public.finalize_role(new_role TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    role = new_role,
    is_role_finalized = TRUE
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. RLS Policy - Prevents Direct Update
**Critical Security Policy:**
```sql
CREATE POLICY "Users can update own profile metadata only" ON profiles 
    FOR UPDATE USING (auth.uid() = id) 
    WITH CHECK (
        auth.uid() = id 
        AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
        AND (is_role_finalized = (SELECT is_role_finalized FROM profiles WHERE id = auth.uid()))
    );
```

This policy:
- ✅ Allows users to update their `first_name` and `last_name`
- ❌ **PREVENTS** direct updates to `role` or `is_role_finalized`
- Forces all role changes through the `finalize_role()` RPC

### 4. Questions & Exams RLS
```sql
-- Questions Policies
CREATE POLICY "Allow all authenticated users to view questions" ON questions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin/Recruiter can manage questions" ON questions
    FOR ALL USING (EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'recruiter')
    ));

-- Exams Policies
CREATE POLICY "Allow all authenticated users to view exams" ON exams
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Admin/Recruiter can manage exams" ON exams
    FOR ALL USING (EXISTS(
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'recruiter')
    ));
```

---

## 🚦 Authentication Flow

### Phase 1: Signup
**File:** `app/auth/signup.html`

1. User fills out registration form (name, email, password)
2. `signup()` function creates auth user with metadata
3. Postgres trigger automatically creates profile with:
   - `role = 'candidate'` (default)
   - `is_role_finalized = FALSE`
   - Name split into first_name/last_name
4. User redirected to login page

### Phase 2: Login & Gatekeeper Check
**File:** `app/auth/login.html`, `app/js/auth.js`

```javascript
async function login(email, password) {
    // 1. Authenticate user
    const { data: authData, error: authError } = 
        await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) return { data: null, error: authError };

    // 2. Fetch profile
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_role_finalized')
        .eq('id', authData.user.id)
        .single();

    // 3. GATEKEEPER CHECK
    if (!profileData.is_role_finalized) {
        // Gate closed → Role Selection
        window.location.href = '/app/auth/role_selection.html';
    } else {
        // Gate open → Role Dashboard
        redirectUser(profileData.role);
    }
}
```

### Phase 3: Role Selection
**File:** `app/auth/role_selection.html`

#### For Candidates:
1. Click "I'm a Candidate" card
2. Directly calls `finalize_role('candidate')`
3. Redirect to candidate dashboard

#### For Recruiters:
1. Click "I'm a Recruiter" card
2. **Verification Modal** appears
3. Enter organization access code
4. Valid codes (currently hardcoded, replace with backend validation):
   - `RECRUIT2024`
   - `JSAT-RECRUITER`
   - `ADMIN-ACCESS`
5. On success, calls `finalize_role('recruiter')`
6. Redirect to recruiter dashboard

```javascript
// Recruiter verification
async function verifyRecruiterCode(code) {
    const validCodes = ['RECRUIT2024', 'JSAT-RECRUITER', 'ADMIN-ACCESS'];
    
    if (validCodes.includes(code)) {
        await handleRoleSelection('recruiter');
    } else {
        showVerificationMessage('Invalid access code');
    }
}
```

### Phase 4: Page Protection
**File:** `app/js/guard.js`

Every protected page uses `protectPage(authorizedRoles)`:

```javascript
// Example from candidate/exam.html
import { protectPage } from '../js/guard.js';

protectPage(['candidate']).then(({ user, profile }) => {
    if (user && profile) {
        // User authorized, render page
        renderDashboard();
    }
});
```

**Guard Checks:**
1. ✅ Is user authenticated?
2. ✅ Does profile exist?
3. ✅ Is `is_role_finalized = TRUE`?
4. ✅ Does user's role match `authorizedRoles`?

If any check fails → redirect appropriately

---

## 🎨 Frontend Role-Based UI

### Conditional Rendering Example
```javascript
// In candidate pages
if (profile.role === 'candidate') {
    // Show candidate-specific features
}

// In recruiter pages  
if (profile.role === 'recruiter') {
    // Show exam creation, analytics
}
```

### Navigation Guards
Each page imports `guard.js` and specifies allowed roles:
- **Candidate pages:** `protectPage(['candidate'])`
- **Recruiter pages:** `protectPage(['recruiter'])`
- **Admin pages:** `protectPage(['admin'])`
- **Multi-role pages:** `protectPage(['admin', 'recruiter'])`

---

## 🔄 Complete User Journey

### New User Registration
```
1. Signup page → Enter details
2. Backend → Create auth.users entry
3. Trigger → Create profiles entry (gate closed)
4. Redirect → Login page
5. Login → Authenticate
6. Gate Check → Closed, redirect to role selection
7. Role Selection → Choose candidate/recruiter
8. (If recruiter) → Verify code
9. RPC Call → finalize_role()
10. Gate Opens → Redirect to dashboard
```

### Returning User Login
```
1. Login page → Enter credentials
2. Backend → Authenticate
3. Fetch Profile → Check is_role_finalized
4. Gate Check → Already open?
   ✅ Yes → Redirect to role dashboard
   ❌ No → Redirect to role selection (shouldn't happen)
```

### Unauthorized Access Attempt
```
1. User tries to access /recruiter/dashboard.html
2. guard.js → Checks role
3. User role: 'candidate'
4. Required role: 'recruiter'
5. Action → Redirect to user's actual dashboard
```

---

## 🛡️ Security Best Practices

### ✅ Implemented
1. **RLS enabled** on all tables
2. **Secure RPC** for role finalization
3. **Policy prevents** direct role mutation
4. **Frontend guards** on all protected pages
5. **Backend validation** via RLS policies
6. **Recruiter verification** code system

### 🔐 Production Recommendations
1. **Move recruiter codes to database**
   - Create `recruiter_codes` table
   - Store hashed codes
   - Add expiration dates
   - Track code usage

2. **Implement rate limiting**
   - Limit verification attempts
   - Add cooldown periods

3. **Add audit logging**
   - Log role changes
   - Track verification attempts
   - Monitor suspicious activity

4. **Email verification**
   - Require email confirmation
   - Send notification on role finalization

5. **Enhanced validation**
   - Create separate RPC for recruiter verification
   - Validate codes server-side only
   - Add organization linking

---

## 📝 Implementation Checklist

- [x] Phase 1: Database Foundation
  - [x] profiles table with is_role_finalized
  - [x] Postgres trigger for auto-profile creation
  - [x] finalize_role() RPC function
  - [x] RLS policies on all tables
  - [x] Secure policy prevents role updates
  - [x] Questions table RLS policies

- [x] Phase 2: Signup Redirection
  - [x] Redirect to login after signup

- [x] Phase 3: Gatekeeper Intercept
  - [x] Login checks is_role_finalized
  - [x] Redirect to role_selection if FALSE
  - [x] Redirect to dashboard if TRUE

- [x] Phase 4: Role Selection
  - [x] Role selection UI
  - [x] RPC call to finalize_role
  - [x] Recruiter verification flow

- [x] Phase 5: RBAC Enforcement
  - [x] guard.js page protection
  - [x] Frontend role checks
  - [x] Import fixes
  - [x] Name field handling

---

## 🧪 Testing Guide

### Test Scenarios

**1. New User Signup**
```
- Register new account
- Verify redirect to login
- Login with credentials
- Confirm redirect to role_selection
- Select candidate role
- Verify redirect to candidate dashboard
```

**2. Recruiter Verification**
```
- Complete signup & login
- On role_selection, click recruiter
- Try invalid code → Should fail
- Enter valid code: RECRUIT2024
- Verify redirect to recruiter dashboard
```

**3. Security Tests**
```
- Login as candidate
- Try to access /recruiter/dashboard.html directly
- Should redirect to /candidate/exam.html
- Check browser console for guard.js redirect message
```

**4. Gate Bypass Attempt**
```
- Login as user
- Open browser console
- Try: await supabase.from('profiles').update({ role: 'admin' })
- Should fail due to RLS policy
```

---

## 📚 File Reference

### Database
- `database_schema.sql` - Complete schema, RLS, triggers, RPCs

### Authentication
- `app/auth/signup.html` - User registration
- `app/auth/login.html` - User login with gatekeeper
- `app/auth/role_selection.html` - Role selection + recruiter verification
- `app/js/auth.js` - Auth functions, login logic, redirects

### Protection
- `app/js/guard.js` - Page protection middleware

### Dashboards
- `app/candidate/exam.html` - Candidate dashboard
- `app/recruiter/dashboard.html` - Recruiter dashboard
- `app/admin/users.html` - Admin dashboard

---

## 🚀 Deployment Steps

1. **Apply Database Schema**
   ```bash
   psql your_db < database_schema.sql
   ```

2. **Verify Supabase Configuration**
   - Check `app/js/auth.js` has correct URL and anon key
   - Test RLS policies in Supabase dashboard

3. **Configure Recruiter Codes**
   - Update valid codes in `role_selection.html`
   - Or implement backend validation

4. **Test Authentication Flow**
   - Create test accounts for each role
   - Verify redirects work correctly
   - Test page protection

5. **Deploy Frontend**
   - Build assets if using build tools
   - Deploy to hosting provider
   - Verify all routes work

---

## 🐛 Troubleshooting

### Issue: Profile not created on signup
**Solution:** Check trigger exists and is active
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Issue: Can't access questions
**Solution:** Verify RLS policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'questions';
```

### Issue: Users can bypass role gate
**Solution:** Check finalize_role RPC exists
```sql
SELECT * FROM pg_proc WHERE proname = 'finalize_role';
```

### Issue: Import errors in exam.html
**Solution:** Verify imports use `../js/auth.js` not `../js/supabase.js`

---

## 📞 Support

For implementation questions or issues, refer to:
- Supabase Documentation: https://supabase.com/docs
- This project's README.md
- Database schema comments in `database_schema.sql`

---

**Last Updated:** 2025-11-11  
**Version:** 1.0.0  
**Author:** J-SAT Development Team
