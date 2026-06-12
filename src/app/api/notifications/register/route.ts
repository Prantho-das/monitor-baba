import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = createServerClient(request);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, deviceInfo } = body;

    if (!token) {
      return NextResponse.json({ error: 'FCM Token is required' }, { status: 400 });
    }

    // Upsert FCM token for user bypassing RLS
    const { data, error } = await supabaseAdmin
      .from('fcm_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          device_info: deviceInfo || 'Web Browser',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, registered: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
