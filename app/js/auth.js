import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Handles user login and the gatekeeper flow.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<{data: object, error: object}>}
 */
async function login(email, password) {
    // 1. Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        return { data: null, error: authError };
    }

    if (authData.user) {
        // 2. Fetch the user's profile
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role, is_role_finalized')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            return { data: null, error: profileError };
        }

        // 3. The Gatekeeper Check
        if (profileData && !profileData.is_role_finalized) {
            // Gate is closed, redirect to role selection.
            window.location.href = '/jsat/app/auth/role_selection.html';
            return { data: profileData, error: null }; // Return to prevent further execution
        } else if (profileData) {
            // Gate is open, redirect to the role-specific dashboard
            redirectUser(profileData.role);
            return { data: profileData, error: null }; // Return to prevent further execution
        } else {
            // Fallback in case profile doesn't exist, though trigger should prevent this
            return { data: null, error: new Error("User profile not found.") };
        }
    }

    return { data: authData, error: null };
}

/**
 * Handles user signup.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @param {string} fullName - The user's full name.
 * @returns {Promise<{data: object, error: object}>}
 */
async function signup(email, password, fullName) {
    return supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    });
}

/**
 * Handles user logout.
 */
async function logout() {
    await supabase.auth.signOut();
}

/**
 * Gets the current user session.
 * @returns {Promise<{data: {session: object}, error: object}>}
 */
async function getSession() {
    return supabase.auth.getSession();
}

/**
 * Redirects to the appropriate dashboard based on user role.
 * @param {string} role - The user's role.
 */
function redirectUser(role) {
    const rolePaths = {
        admin: '/jsat/app/admin/users.html',
        recruiter: '/jsat/app/recruiter/dashboard.html',
        candidate: '/jsat/app/candidate/dashboard.html',
    };
    // Use lowercase role from DB
    const redirectPath = rolePaths[role] || '/jsat/app/auth/login.html';
    window.location.href = redirectPath;
}

export {
    supabase,
    login,
    signup,
    logout,
    getSession,
    redirectUser
};
