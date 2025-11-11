import { supabase, redirectUser } from './auth.js';

/**
 * Protects a page by checking the user's authentication status and role.
 * It redirects unauthorized users to the appropriate page.
 * 
 * @param {string[]} authorizedRoles - An array of roles (e.g., ['admin', 'recruiter']) that are allowed to access the page. If empty, only checks for login.
 * @returns {Promise<{user: object, profile: object}|null>} The user and profile objects if authorized, otherwise null as a redirect is initiated.
 */
export async function protectPage(authorizedRoles = []) {
    // 1. Get the current user from Supabase's session
    const { data: { user } } = await supabase.auth.getUser();

    // If no user is logged in, redirect to the login page
    if (!user) {
        window.location.href = '/jsat/app/auth/login.html';
        return null;
    }

    // 2. Get the user's profile from the database
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_role_finalized')
        .eq('id', user.id)
        .single();

    // If there's an error or the profile doesn't exist, something is wrong.
    // Redirect to login for safety.
    if (error || !profile) {
        console.error('Error fetching profile or profile not found. Redirecting to login.');
        window.location.href = '/jsat/app/auth/login.html';
        return null;
    }

    // 3. Check if the user's role has been finalized
    // If not, they must be sent to the role selection page.
    if (!profile.is_role_finalized) {
        window.location.href = '/jsat/app/auth/role_selection.html';
        return null;
    }

    // 4. Check if the user's role is in the list of authorized roles for the page
    if (authorizedRoles.length > 0 && !authorizedRoles.includes(profile.role)) {
        // If the user's role is not authorized, show error and block access
        console.warn(`Unauthorized access attempt by role '${profile.role}'. Blocking access.`);

        // Replace the page content with an error message using Tailwind CSS
        document.body.innerHTML = `
            <div class="fixed inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center font-sans z-50">
                <div class="text-center text-white max-w-md mx-4 p-8 bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-red-500/30 shadow-2xl">
                    <div class="w-16 h-16 bg-red-500/20 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
                    <p class="text-gray-300 mb-4 leading-relaxed">
                        You don't have permission to access this page.
                    </p>
                    <div class="bg-gray-800/50 rounded-lg p-4 mb-6">
                        <div class="text-sm text-gray-400 mb-1">Your current role:</div>
                        <div class="text-lg font-semibold text-blue-400 capitalize">${profile.role}</div>
                        <div class="text-sm text-gray-400 mt-2 mb-1">Required role(s):</div>
                        <div class="text-lg font-semibold text-yellow-400">${authorizedRoles.join(', ')}</div>
                    </div>
                    <p class="text-gray-500 text-sm">
                        Redirecting you to your dashboard in <span id="countdown" class="text-blue-400 font-semibold">3</span> seconds...
                    </p>
                </div>
            </div>
        `;

        // Countdown timer
        let countdown = 3;
        const countdownEl = document.getElementById('countdown');
        const timer = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(timer);
                redirectUser(profile.role);
            }
        }, 1000);

        return null;
    }

    // 5. If all checks pass, the user is authorized.
    // Return the user and profile data for the page to use.
    return { user, profile };
}
