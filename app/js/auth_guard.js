// This script will check the user's role and redirect if they are not authorized.

(async () => {
    // Make sure supabase is defined
    if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.error('Supabase client is not available.');
        return;
    }
    const supabase_client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: { user } } = await supabase_client.auth.getUser();

    if (!user) {
        window.location.href = '../auth/login.html';
        return;
    }
    const userRole = user.user_metadata.role;

    const currentPage = window.location.pathname;

    // Role-based redirection logic
    if (currentPage.includes('/admin/') && userRole !== 'admin') {
        window.location.href = '../index.html?unauthorized=true';
    } else if (currentPage.includes('/recruiter/') && userRole !== 'recruiter') {
        window.location.href = '../index.html?unauthorized=true';
    } else if (currentPage.includes('/candidate/') && userRole !== 'candidate' && userRole !== 'admin' && userRole !== 'recruiter') {
        // allow admin and recruiter to access candidate page
        window.location.href = '../index.html?unauthorized=true';
    }
})();
