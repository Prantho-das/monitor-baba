-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Servers Table
CREATE TABLE IF NOT EXISTS public.servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hostname TEXT,
    ip_address TEXT,
    api_key UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    os_info TEXT,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning')),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for quick lookups by API Key (used by agent reports)
CREATE INDEX IF NOT EXISTS idx_servers_api_key ON public.servers(api_key);
CREATE INDEX IF NOT EXISTS idx_servers_user_id ON public.servers(user_id);

-- 3. Server Metrics Table (Partitioning or simple retention cleanup recommended)
CREATE TABLE IF NOT EXISTS public.server_metrics (
    id BIGSERIAL PRIMARY KEY,
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    cpu_percent REAL NOT NULL,
    ram_percent REAL NOT NULL,
    disk_percent REAL NOT NULL,
    network_in_mb REAL DEFAULT 0,
    network_out_mb REAL DEFAULT 0,
    uptime_seconds INTEGER DEFAULT 0,
    services JSONB DEFAULT '[]'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metrics_server_recorded ON public.server_metrics(server_id, recorded_at DESC);

-- 4. Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('cpu_high', 'ram_high', 'disk_full', 'offline', 'online')),
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    is_read BOOLEAN DEFAULT false NOT NULL,
    notification_sent BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON public.alerts(user_id, is_read) WHERE is_read = false;

-- 5. Alert Settings Table
CREATE TABLE IF NOT EXISTS public.alert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    cpu_threshold REAL DEFAULT 90 NOT NULL,
    ram_threshold REAL DEFAULT 90 NOT NULL,
    disk_threshold REAL DEFAULT 95 NOT NULL,
    offline_timeout_sec INTEGER DEFAULT 300 NOT NULL, -- 5 mins offline = alert
    notifications_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. FCM Tokens Table
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fcm_user_id ON public.fcm_tokens(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- Profiles: Anyone can view their own profile, only update own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Servers: View/Insert/Update/Delete only their own servers
CREATE POLICY "Users can view own servers" ON public.servers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own servers" ON public.servers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own servers" ON public.servers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own servers" ON public.servers
    FOR DELETE USING (auth.uid() = user_id);

-- Server Metrics: Select metrics for own servers. Insert allowed for server authentication.
CREATE POLICY "Users can view metrics of own servers" ON public.server_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.servers
            WHERE public.servers.id = public.server_metrics.server_id
            AND public.servers.user_id = auth.uid()
        )
    );

-- Alerts: CRUD for own alerts
CREATE POLICY "Users can manage own alerts" ON public.alerts
    FOR ALL USING (auth.uid() = user_id);

-- Alert Settings: CRUD for own settings
CREATE POLICY "Users can manage own alert settings" ON public.alert_settings
    FOR ALL USING (auth.uid() = user_id);

-- FCM Tokens: CRUD for own tokens
CREATE POLICY "Users can manage own FCM tokens" ON public.fcm_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Triggers for Profile and Alert Settings creation on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
        new.raw_user_meta_data->>'avatar_url'
    );
    
    INSERT INTO public.alert_settings (user_id)
    VALUES (new.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Database Cleanup Function: Delete server metrics older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.server_metrics
    WHERE recorded_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
