import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xragglavvbjmcwrtknrm.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function syncEmployees() {
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*');

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return;
  }

  if (!profiles) return;

  for (const profile of profiles) {
    if (!profile.employee_id) continue;

    const { data: exists, error: existsError } = await supabase
      .from('b2b_employees')
      .select('id')
      .or(`employee_id.eq.${profile.employee_id},user_id.eq.${profile.user_id}`)
      .maybeSingle();

    if (existsError) {
      console.error('Error checking employee', profile.employee_id, existsError);
      continue;
    }

    if (!exists) {
      const { error: insertError } = await supabase.from('b2b_employees').insert({
        b2b_partner_id: profile.b2b_partner_id,
        b2b_partner_name: profile.b2b_partner_name,
        user_id: profile.user_id,
        employee_id: profile.employee_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        state: 'active'
      });
      if (insertError) {
        console.error('Error inserting employee', profile.employee_id, insertError);
      } else {
        console.log('Inserted employee', profile.employee_id);
      }
    }
  }

  console.log('Sync complete');
}

syncEmployees();
