import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ClubSetting {
  key: string;
  value: string | null;
}

export function useClubSettings() {
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('club_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = (data || []).reduce((acc: Record<string, string | null>, setting: ClubSetting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      setSettings(settingsMap);
    } catch (err) {
      console.error('Error fetching club settings:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, error, refetch: fetchSettings };
}