import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET all servers for the authenticated user
export async function GET(request: Request) {
  try {
    const supabase = createServerClient(request);
    
    // Get logged-in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's servers
    const { data: servers, error } = await supabase
      .from('servers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(servers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create a new server
export async function POST(request: Request) {
  try {
    const supabase = createServerClient(request);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, hostname } = body;

    if (!name) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }

    // Insert new server. User ID is captured automatically (RLS or set explicitly)
    const { data: newServer, error } = await supabase
      .from('servers')
      .insert({
        user_id: user.id,
        name,
        hostname: hostname || '',
        status: 'offline',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newServer, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
