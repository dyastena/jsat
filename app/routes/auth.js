import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchUserRole(user) {
  if (!user || !user.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single(); // Use .single() to get a single record or null

  if (error) {
    console.error('Error fetching user role:', error.message);
    return null;
  }

  return data;
}
