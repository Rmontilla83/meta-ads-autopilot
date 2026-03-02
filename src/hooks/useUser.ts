'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getPlanLimits } from '@/lib/plans';
import type { Profile, BusinessProfile, MetaConnection, PlanLimits } from '@/types';
import type { User } from '@supabase/supabase-js';

interface UseUserReturn {
  user: User | null;
  profile: Profile | null;
  businessProfile: BusinessProfile | null;
  metaConnection: MetaConnection | null;
  planLimits: PlanLimits;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [metaConnection, setMetaConnection] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (!authUser) {
        setProfile(null);
        setBusinessProfile(null);
        setMetaConnection(null);
        return;
      }

      const [profileRes, businessRes, metaRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('business_profiles').select('*').eq('user_id', authUser.id).single(),
        supabase.from('meta_connections').select('*').eq('user_id', authUser.id).eq('is_active', true).single(),
      ]);

      setProfile(profileRes.data as Profile | null);
      setBusinessProfile(businessRes.data as BusinessProfile | null);
      setMetaConnection(metaRes.data as MetaConnection | null);
    } catch {
      toast.error('Error al cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    profile,
    businessProfile,
    metaConnection,
    planLimits: getPlanLimits(profile?.plan ?? 'free'),
    loading,
    refresh: fetchData,
  };
}
