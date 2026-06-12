import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET all alerts for current user
export async function GET(request: Request) {
  try {
    const supabase = createServerClient(request);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*, servers(name)')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(alerts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH mark alert as read
export async function PATCH(request: Request) {
  try {
    const supabase = createServerClient(request);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alertId, all } = body;

    let query;
    if (all) {
      query = supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    } else if (alertId) {
      query = supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)
        .eq('user_id', user.id);
    } else {
      return NextResponse.json({ error: 'Missing alertId or all flag' }, { status: 400 });
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
