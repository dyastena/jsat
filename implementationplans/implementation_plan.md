# Supabase Login and Signup Implementation Plan (v5)

This document outlines the step-by-step plan to implement a secure login and signup system for the J-SAT platform using the new Supabase-optimized `database_schema.sql` and integrating with the existing frontend files.

## 1. Analysis of the `database_schema.sql`

The new "Production-Ready" schema is designed to fully leverage Supabase features:

*   **Direct Supabase Auth Integration:** The `users` table now directly references the `auth.users` table, creating a seamless link between Supabase's authentication and our application's user data.
*   **Advanced Row Level Security (RLS):** RLS is enabled on all tables with specific policies for different user roles, ensuring that users can only access the data they are permitted to see. The schema also includes helper functions (`is_admin`, `is_recruiter`, `is_candidate`) to simplify RLS policies.
*   **Comprehensive Auditing:** A full audit trail is implemented to track all changes to sensitive tables.
*   **Triggers and Functions:** The schema includes triggers and functions to automate tasks like creating user profiles, updating timestamps, and logging changes.
*   **Storage Policies:** Granular storage policies are in place for fine-grained access control to files in Supabase Storage.
*   **Performance-Tuned:** The schema includes views and additional indexes for optimized query performance.
*   **Realtime Ready:** Realtime is enabled on key tables like `notifications` and `leaderboard`.

## 2. Supabase Integration Strategy

The new schema is already tightly integrated with Supabase. Our strategy is to use the Supabase client libraries on the frontend to interact with the backend.

### 2.1. User Management

Supabase Auth will handle all user authentication (signup, login, password reset). The `handle_new_user` function in the schema will automatically create a corresponding entry in the `public.users` table when a new user signs up.

### 2.2. Profile Management

The `handle_new_user` function also automatically creates a `candidate_profiles` entry for new users with the `candidate` role.

## 3. Step-by-Step Implementation Plan

### 3.1. Supabase Project Setup

1.  **Create a new Supabase project:** If you haven't already, create a new project on the [Supabase website](https://supabase.com/).
2.  **Database Schema:** Apply the new `database_schema.sql` to your Supabase database. This will set up all the tables, roles, policies, and functions.
3.  **Enable Email Verification:** In your Supabase project settings, under "Authentication" -> "Settings", enable "Enable email confirmations".

### 3.2. Managing Supabase Credentials

To avoid hardcoding your Supabase URL and anon key in your HTML files, we will use a separate `config.js` file to store these values. This file should not be committed to version control.

1.  **Create `config.js`:** Create a file named `config.js` in the root of your project with the following content:

    ```javascript
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    ```

2.  **Add to `.gitignore`:** Create a `.gitignore` file in the root of your project if you don't have one already and add the following line to it:

    ```
    config.js
    ```

### 3.3. Integrating with Existing Frontend Files

We will add JavaScript to the existing HTML files to handle authentication without changing the HTML structure.

#### 3.3.1. `login.html` Integration

We will add `<script>` tags to the end of the `<body>` in `login.html` to include the configuration and the login script.

**Add these script tags to `login.html`:**

```html
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
<script>
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const loginForm = document.querySelector('form');
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            alert('Login successful!');
            // Redirect to the appropriate dashboard based on user role
            const { data: { user } } = await supabase.auth.getUser();
            const userRole = user.user_metadata.role;
            if (userRole === 'admin') {
                window.location.href = '/pages/admin/users.html';
            } else if (userRole === 'recruiter') {
                window.location.href = '/pages/recruiter/dashboard.html';
            } else {
                window.location.href = '/pages/candidate/exam.html';
            }
        }
    });
</script>
```

#### 3.3.2. `signup.html` Integration

We will modify the existing script in `signup.html` to use the `config.js` file.

**Replace the existing `<script>` in `signup.html` with this:**

```html
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
<script>
    // Initialize Lucide Icons
    lucide.createIcons();

    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Step Navigation Functions
    function goToStep2() {
        const fullname = document.getElementById('fullname');
        const email = document.getElementById('email');
        if (!fullname.value || !email.value) {
            fullname.reportValidity();
            email.reportValidity();
            return;
        }
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '100%';
        document.getElementById('step-label').textContent = 'Step 2 of 2';
        document.getElementById('step-title').textContent = 'Security';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        lucide.createIcons();
    }

    function goToStep1() {
        document.getElementById('step-2').classList.add('hidden');
        document.getElementById('step-1').classList.remove('hidden');
        document.getElementById('progress-bar').style.width = '50%';
        document.getElementById('step-label').textContent = 'Step 1 of 2';
        document.getElementById('step-title').textContent = 'Personal Information';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        lucide.createIcons();
    }

    function togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    }

    document.getElementById('signup-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullname,
                    role: 'candidate' // Default role for signup
                }
            }
        });

        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            alert('Signup successful! Please check your email to verify your account.');
            document.getElementById('signup-form').reset();
            goToStep1();
        }
    });
</script>
```

#### 3.3.3. `index.html` Session Management

We will add a script to `index.html` to check for an active user session and update the navigation bar accordingly.

**Add these script tags to `index.html`:**

```html
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
<script>
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    document.addEventListener('DOMContentLoaded', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const navLinks = document.querySelector('.flex.items-center.gap-4');

        if (session) {
            const { data: { user } } = await supabase.auth.getUser();
            const userRole = user.user_metadata.role;
            let dashboardLink = '/';

            if (userRole === 'admin') {
                dashboardLink = '/pages/admin/users.html';
            } else if (userRole === 'recruiter') {
                dashboardLink = '/pages/recruiter/dashboard.html';
            } else {
                dashboardLink = '/pages/candidate/exam.html';
            }

            navLinks.innerHTML = `
                <a href="${dashboardLink}" class="text-gray-300 hover:text-white transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-slate-800">Dashboard</a>
                <button id="logout-button" class="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200">Logout</button>
            `;

            document.getElementById('logout-button').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.reload();
            });
        } else {
            navLinks.innerHTML = `
                <a href="login.html" class="text-gray-300 hover:text-white transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-slate-800">Login</a>
                <a href="signup.html" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">Sign Up</a>
            `;
        }
    });
</script>
```

## 4. Security

*   **Row Level Security (RLS):** The new schema already has RLS enabled on all tables with appropriate policies. This is the primary mechanism for data security.
*   **Input Validation:** Continue to validate user input on the frontend to provide a better user experience, but trust the backend RLS policies for security.
*   **Password Policies:** Enforce strong password policies in your Supabase project settings.

## 5. Session Management, Sign-out, and Password Reset

This remains the same as the previous plan.

*   **Session Management:** Supabase's `gotrue-js` library automatically handles session management.
*   **Sign-out:** To sign out a user, call the `supabase.auth.signOut()` method.
 *   **Password Reset:** Use the `supabase.auth.resetPasswordForEmail()` method to send a password reset link.

## Notes and recommended changes (apply before implementation)

- Paths: the repo places `login.html` and `signup.html` at the project root. Update all examples in this plan that point to `./pages/auth/...` to use `./login.html` and `./signup.html`, or adjust your file layout accordingly.

- Robust client usage: use defensive accessors when reading user metadata. Example:

```js
const { data: userData } = await supabase.auth.getUser();
const userRole = userData?.user?.user_metadata?.role ?? 'candidate';
```

- When creating users via the client, include metadata so `handle_new_user()` can pick up `role` and `full_name` (the schema reads `raw_user_meta_data->>'role'`). Example in signUp call already included in the plan — keep that.

- Applying the SQL schema: run the SQL inside a Supabase project (Supabase SQL editor or CLI). Some operations (like `storage.buckets` inserts or realtime publication changes) may require elevated privileges or are better done via the Supabase dashboard / Storage API. If you hit permission errors, split the deployment into phases:
    1. Core tables, types, functions, triggers and RLS policies
    2. Seed data (skill levels, system settings)
    3. Create storage buckets via dashboard/API and apply storage policies

- Storage bucket upload keys: the policies use `storage.foldername(name)` and expect names like `${userId}/resume.pdf`. When you implement uploads on the frontend, ensure you set object keys with the user-folder prefix so bucket policies match.

- Realtime / publication: Hosted Supabase manages realtime; if `alter publication` fails, enable realtime for the tables in the dashboard or use the Supabase CLI/admin API.

- Credentials handling: add a small `config.js.example` (committed) and add `config.js` to `.gitignore` (local, not committed). Example `config.js.example`:

```js
// config.js.example — copy to config.js and fill values
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

- Security note: a client anon key is not a secret in Supabase — it is safe for client use. Still, avoid committing project keys to public repos. For sensitive server-side operations consider a server endpoint that uses a service key.

This updated plan, combined with the new Supabase-optimized schema, provides a secure and efficient way to implement authentication in the J-SAT platform.