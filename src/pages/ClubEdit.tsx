import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Upload, AlertTriangle, Check } from 'lucide-react';

interface Club {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  active: boolean;
  settings: any;
}

export default function ClubEdit() {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (clubId) {
      fetchClub();
    }
  }, [clubId]);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member } = await supabase
          .from('members')
          .select('is_admin, club_id')
          .eq('user_id', session.user.id)
          .single();
        
        setIsAdmin(member?.is_admin || false);
        if (member?.club_id) {
          setClubId(member.club_id);
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchClub = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clubId) {
        throw new Error('ID do clube não encontrado');
      }

      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();

      if (error) throw error;

      if (data) {
        setClub(data);
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (err) {
      console.error('Error fetching club:', err);
      setError('Erro ao carregar dados do clube');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return club?.logo_url || null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `club-logo-${Date.now()}.${fileExt}`;
      const filePath = `club-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('clubs')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clubs')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return club?.logo_url || null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club || !clubId) return;

    try {
      setError(null);
      
      const logoUrl = await uploadLogo();
      
      const { error } = await supabase
        .from('clubs')
        .update({
          name: club.name,
          domain: club.domain,
          logo_url: logoUrl,
          active: club.active
        })
        .eq('id', clubId);

      if (error) throw error;

      setSuccess('Clube atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      await fetchClub();
    } catch (err) {
      console.error('Error updating club:', err);
      setError('Erro ao atualizar clube');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center text-gray-600 mt-8">
        Apenas administradores podem editar as informações do clube.
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center text-gray-600 mt-8">
        Clube não encontrado.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Clube</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
            <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Clube</label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={club.name}
              onChange={(e) => setClub({ ...club, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Domínio</label>
            <input
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={club.domain || ''}
              onChange={(e) => setClub({ ...club, domain: e.target.value })}
              placeholder="exemplo.com.br"
            />
            <p className="mt-1 text-sm text-gray-500">
              Domínio usado para identificar o clube (opcional)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <div className="mt-1 flex items-center space-x-4">
              <div className="relative">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="w-24 h-24 rounded-lg object-contain bg-gray-50"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Escolher logo
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                checked={club.active}
                onChange={(e) => setClub({ ...club, active: e.target.checked })}
              />
              <span className="ml-2 text-sm text-gray-700">Clube ativo</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}