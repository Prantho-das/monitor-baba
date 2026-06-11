import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET single server + metrics history
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const supabase = createServerClient(request);
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch server info
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', id)
      .single();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Server not found or access denied' }, { status: 404 });
    }

    // Fetch latest 30 metrics records for rendering charts
    const { data: metrics, error: metricsError } = await supabase
      .from('server_metrics')
      .select('*')
      .eq('server_id', id)
      .order('recorded_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      server,
      metrics: metrics || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT update server settings
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const supabase = createServerClient(request);
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, hostname } = body;

    const { data: updatedServer, error } = await supabase
      .from('servers')
      .update({
        name,
        hostname: hostname || '',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedServer);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE a server
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = createServerClient(request);
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('servers')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
