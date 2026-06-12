'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const { loading: authLoading } = useAuth(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-[15px] font-medium text-texts animate-pulse">Loading Environment...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-base">
      <div className="glass-card w-full max-w-[450px] flex flex-col items-center p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 relative mb-4 rounded-xl overflow-hidden shadow-sm border border-borderg bg-hover">
            <Image src="/logo.png" alt="Neural Network Systems Logo" fill className="object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-textp tracking-tight mb-1">Create Account</h1>
          <p className="text-[14px] text-texts">Deploy Monitor-Baba agents for free</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center py-6">
            <CheckCircle2 size={56} className="text-online mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-textp mb-2">Registration Successful!</h3>
            <p className="text-[14px] text-texts leading-relaxed">
              Please check your email to verify your account, then return to{' '}
              <Link href="/login" className="text-textp font-semibold hover:underline">
                Login
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="w-full bg-critical/10 border border-critical/20 text-critical px-4 py-3 rounded-lg text-[13px] mb-6">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSignup} className="w-full flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-texts uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  className="glass-input py-2.5"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-texts uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  className="glass-input py-2.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-texts uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  className="glass-input py-2.5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2.5 mt-2"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 text-[13px] text-texts">
          Already have an account?{' '}
          <Link href="/login" className="text-textp font-semibold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
