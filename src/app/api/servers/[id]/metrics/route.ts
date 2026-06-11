import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient(request);
    const { id: serverId } = await params;

    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('id')
      .eq('id', serverId)
      .eq('user_id', session.user.id)
      .single();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'metrics'; // 'metrics' or 'incidents'

    if (type === 'metrics') {
      // Fetch metrics from the last 24 hours, limited to 100 data points to avoid huge payloads
      const { data: metrics, error: metricsError } = await supabase
        .from('server_metrics')
        .select('cpu_percent, ram_percent, disk_percent, network_in_mb, network_out_mb, recorded_at')
        .eq('server_id', serverId)
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (metricsError) throw metricsError;

      // Reverse so oldest is first
      return NextResponse.json({ data: metrics.reverse() });
    } 
    else if (type === 'incidents') {
      // Fetch incidents from alerts table for this server
      const { data: incidents, error: incidentsError } = await supabase
        .from('alerts')
        .select('id, type, message, severity, created_at')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (incidentsError) throw incidentsError;

      return NextResponse.json({ data: incidents });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

  } catch (err: any) {
    console.error('Error fetching server history:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
