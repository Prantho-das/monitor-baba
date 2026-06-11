import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      apiKey,
      cpuPercent,
      ramPercent,
      diskPercent,
      networkInMb,
      networkOutMb,
      uptimeSeconds,
      services,
      osInfo,
      hostname,
      ipAddress,
    } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Initialize elevated admin client
    const supabase = createAdminClient();

    // 1. Authenticate server via API Key
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    const serverId = server.id;
    const userId = server.user_id;

    // 2. Insert metrics
    const { error: metricsError } = await supabase
      .from('server_metrics')
      .insert({
        server_id: serverId,
        cpu_percent: cpuPercent,
        ram_percent: ramPercent,
        disk_percent: diskPercent,
        network_in_mb: networkInMb || 0,
        network_out_mb: networkOutMb || 0,
        uptime_seconds: uptimeSeconds || 0,
        services: services ? JSON.stringify(services) : '[]',
      });

    if (metricsError) {
      console.error('Failed to log server metrics:', metricsError);
    }

    // 3. Update server details & status (mark online)
    await supabase
      .from('servers')
      .update({
        status: 'online',
        last_seen: new Date().toISOString(),
        os_info: osInfo || server.os_info,
        hostname: hostname || server.hostname,
        ip_address: ipAddress || server.ip_address,
      })
      .eq('id', serverId);

    // 4. Load alert thresholds for the user
    const { data: alertSettings } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const settings = alertSettings || {
      cpu_threshold: 90,
      ram_threshold: 90,
      disk_threshold: 95,
      offline_timeout_sec: 300,
      notifications_enabled: true,
    };

    // Helper to evaluate and trigger alerts
    const checkAndTriggerAlert = async (
      type: 'cpu_high' | 'ram_high' | 'disk_full',
      value: number,
      threshold: number,
      alertMessage: string
    ) => {
      if (value >= threshold) {
        // Prevent spam: Check if there's an unread alert of this type in the last 15 minutes
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: recentAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('server_id', serverId)
          .eq('type', type)
          .eq('is_read', false)
          .gt('created_at', fifteenMinsAgo)
          .limit(1);

        if (!recentAlert || recentAlert.length === 0) {
          // Create new alert
          const { data: newAlert, error: insertErr } = await supabase
            .from('alerts')
            .insert({
              server_id: serverId,
              user_id: userId,
              type,
              message: alertMessage,
              severity: 'warning',
            })
            .select()
            .single();

          if (!insertErr && newAlert && settings.notifications_enabled) {
            // Push notification
            await sendPushNotification(
              userId,
              `⚠️ Server Alert: ${server.name}`,
              alertMessage,
              { serverId }
            );
            
            // Mark notification sent
            await supabase
              .from('alerts')
              .update({ notification_sent: true })
              .eq('id', newAlert.id);
          }
        }
      }
    };

    // Run threshold evaluations
    await checkAndTriggerAlert(
      'cpu_high',
      cpuPercent,
      settings.cpu_threshold,
      `CPU usage is critically high at ${cpuPercent.toFixed(1)}% (Threshold: ${settings.cpu_threshold}%)`
    );

    await checkAndTriggerAlert(
      'ram_high',
      ramPercent,
      settings.ram_threshold,
      `Memory usage is high at ${ramPercent.toFixed(1)}% (Threshold: ${settings.ram_threshold}%)`
    );

    await checkAndTriggerAlert(
      'disk_full',
      diskPercent,
      settings.disk_threshold,
      `Disk storage usage is high at ${diskPercent.toFixed(1)}% (Threshold: ${settings.disk_threshold}%)`
    );

    // 5. PIGGYBACK WORKAROUND: Check other servers of this user for offline status
    const { data: otherServers } = await supabase
      .from('servers')
      .select('*')
      .eq('user_id', userId)
      .neq('id', serverId)
      .eq('status', 'online');

    if (otherServers && otherServers.length > 0) {
      const now = Date.now();
      const timeoutMs = settings.offline_timeout_sec * 1000;

      for (const s of otherServers) {
        if (s.last_seen) {
          const lastSeenMs = new Date(s.last_seen).getTime();
          if (now - lastSeenMs > timeoutMs) {
            // Server has gone offline! Update status
            await supabase
              .from('servers')
              .update({ status: 'offline' })
              .eq('id', s.id);

            // Log offline alert
            const { data: offlineAlert } = await supabase
              .from('alerts')
              .insert({
                server_id: s.id,
                user_id: userId,
                type: 'offline',
                message: `Server "${s.name}" is offline. Last seen: ${new Date(s.last_seen).toLocaleString()}`,
                severity: 'critical',
              })
              .select()
              .single();

            if (offlineAlert && settings.notifications_enabled) {
              await sendPushNotification(
                userId,
                `🔴 Server Down: ${s.name}`,
                `Server "${s.name}" went offline! No reports received for over ${Math.round(settings.offline_timeout_sec / 60)} minutes.`,
                { serverId: s.id }
              );

              await supabase
                .from('alerts')
                .update({ notification_sent: true })
                .eq('id', offlineAlert.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in agent reporting route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
