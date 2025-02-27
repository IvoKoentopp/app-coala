import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { differenceInYears, differenceInMonths } from 'date-fns';
import { Upload, Lock, ArrowLeft } from 'lucide-react';
import { formatDate } from '../lib/date';

interface Member {
  id: string;
  user_id: string;
  name: string;
  nickname: string;
  birth_date: string;
  category: string;
  sponsor_nickname: string | null;
  payment_start_month: string | null;
  status: string;
  photo_url: string | null;
  phone: string | null;
  start_month: string;
  is_admin: boolean;
  email?: string;
}

export default function EditMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.get('view') === 'true';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [members, setMembers] = useState<{ nickname: string }[]>([]);
  const [formData, setFormData] = useState<Member | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    checkAdminStatus();
    fetchMember();
    fetchMembers();
  }, [id]);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member } = await supabase
          .from('members')
          .select('is_admin, user_id')
          .eq('user_id', session.user.id)
          .single();

        setIsAdmin(member?.is_admin || false);
        if (id === 'me' || member?.user_id === formData?.user_id) {
          setIsOwnProfile(true);
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchMember = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) {
        throw new Error('Usuário não autenticado');
      }

      let memberData;

      if (id === 'me') {
        const { data, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (memberError) throw memberError;
        memberData = data;

        if (memberData) {
          memberData.email = session.user.email;
          setIsOwnProfile(true);
        }
      } else {
        const { data, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single();

        if (memberError) throw memberError;
        memberData = data;

        if (memberData) {
          setIsOwnProfile(memberData.user_id === session.user.id);

          if (isAdmin) {
            const { data: userData } = await supabase
              .from('auth_user_data')
              .select('email')
              .eq('id', memberData.user_id)
              .maybeSingle();

            if (userData) {
              memberData.email = userData.email;
            }
          }
        }
      }

      if (memberData) {
        setFormData(memberData);
        
        if (memberData.photo_url) {
          setPhotoPreview(memberData.photo_url);
        }
      }
    } catch (err) {
      console.error('Error fetching member:', err);
      setError('Erro ao carregar dados do sócio');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('nickname')
        .order('nickname');
        
      if (error) throw error;
      if (data) {
        setMembers(data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return formData?.photo_url || null;

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `member-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('members')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('members')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return formData?.photo_url || null;
    }
  };

  const calculateMembershipTime = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;

    if (years > 0) {
      return `${years} ano${years > 1 ? 's' : ''} e ${months} mes${months !== 1 ? 'es' : ''}`;
    }
    return `${months} mes${months !== 1 ? 'es' : ''}`;
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setSuccess(true);
      setShowPasswordChange(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Erro ao alterar a senha');
    }
  };

  const canEditMember = (member: Member) => {
    return isAdmin || (isOwnProfile && member.user_id === formData?.user_id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      const memberId = id === 'me' ? formData.id : id;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) throw new Error('Usuário não autenticado');
      
      const photoUrl = await uploadPhoto(session.user.id);

      const updateData: any = {
        name: formData.name,
        nickname: formData.nickname,
        phone: formData.phone,
        photo_url: photoUrl,
        sponsor_nickname: formData.sponsor_nickname,
        birth_date: formData.birth_date
      };

      if (isAdmin) {
        updateData.category = formData.category;
        updateData.payment_start_month = formData.payment_start_month;
        updateData.status = formData.status;
        updateData.start_month = formData.start_month;
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/members'), 2000);
    } catch (err) {
      console.error('Error updating member:', err);
      setError('Erro ao atualizar sócio');
    }
  };

  if (loading) {
    return <div className="text-center">Carregando...</div>;
  }

  if (!formData) {
    return <div className="text-center">Sócio não encontrado</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/members')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isViewMode ? 'Perfil do Sócio' : 'Editar Sócio'}
          </h1>
        </div>
        {isViewMode && isOwnProfile && (
          <button
            onClick={() => navigate(`/members/edit/${formData.id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Editar
          </button>
        )}
      </div>

      {/* Registration Date */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Data de cadastro</p>
            {isViewMode || !isAdmin ? (
              <p className="font-medium">{formData.start_month ? formatDate(formData.start_month) : ''}</p>
            ) : (
              <input
                type="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.start_month}
                onChange={(e) => setFormData({ ...formData, start_month: e.target.value })}
              />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Tempo como sócio</p>
            <p className="text-lg font-medium text-green-700">
              {calculateMembershipTime(formData.start_month)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {isViewMode ? 'Perfil atualizado com sucesso!' : 'Sócio atualizado com sucesso! Redirecionando...'}
        </div>
      )}

      {/* Account Management Section */}
      {isOwnProfile && !isViewMode && (
        <div className="mb-6 p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Gerenciar Conta</h3>
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <Lock className="w-4 h-4 mr-1" />
              Alterar Senha
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{formData.email}</p>
          </div>

          {showPasswordChange && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button
                onClick={handlePasswordChange}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Atualizar Senha
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            {isViewMode ? (
              <p className="mt-1 text-gray-900">{formData.name}</p>
            ) : (
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
            {isViewMode ? (
              <p className="mt-1 text-gray-900">{formData.birth_date ? formatDate(formData.birth_date) : ''}</p>
            ) : (
              <input
                type="date"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            )}
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
          <div className="flex items-center space-x-4">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={formData.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-2xl">
                  {formData.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {!isViewMode && (
              <div className="flex-1">
                <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Escolher foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          {isViewMode ? (
            <p className="mt-1 text-gray-900">{formData.phone || 'Não informado'}</p>
          ) : (
            <input
              type="tel"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          )}
        </div>

        {/* Sponsor */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Padrinho</label>
          {isViewMode ? (
            <p className="mt-1 text-gray-900">{formData.sponsor_nickname || 'Não informado'}</p>
          ) : (
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.sponsor_nickname || ''}
              onChange={(e) => setFormData({ ...formData, sponsor_nickname: e.target.value || null })}
            >
              <option value="">Selecione um padrinho</option>
              {members
                .filter(member => member.nickname !== formData.nickname)
                .map((member) => (
                  <option key={member.nickname} value={member.nickname}>
                    {member.nickname}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Category and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoria</label>
            {isViewMode ? (
              <p className="mt-1 text-gray-900">{formData.category}</p>
            ) : (
              <div className="mt-1 space-y-2">
                {['Colaborador', 'Contribuinte', 'Convidado'].map((category) => (
                  <div key={category} className="flex items-center">
                    <input
                      type="radio"
                      id={category}
                      name="category"
                      value={category}
                      checked={formData.category === category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      disabled={!isAdmin}
                      className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300"
                    />
                    <label htmlFor={category} className="ml-3 block text-sm font-medium text-gray-700">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            {isViewMode ? (
              <p className="mt-1 text-gray-900">{formData.status}</p>
            ) : (
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={!isAdmin}
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Suspenso">Suspenso</option>
              </select>
            )}
          </div>
        </div>

        {/* Payment Information */}
        {formData.category === 'Contribuinte' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mês de Início de Pagamento
            </label>
            {isViewMode ? (
              <p className="mt-1 text-gray-900">
                {formData.payment_start_month ? formatDate(formData.payment_start_month) : 'Não definido'}
              </p>
            ) : (
              <input
                type="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.payment_start_month || ''}
                onChange={(e) => setFormData({ ...formData, payment_start_month: e.target.value })}
                disabled={!isAdmin}
              />
            )}
          </div>
        )}

        {!isAdmin && !isViewMode && (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Alguns campos só podem ser alterados por administradores.
              Entre em contato com um administrador se precisar alterar:
            </p>
            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
              <li>Categoria</li>
              <li>Status</li>
              <li>Data de cadastro</li>
              <li>Mês de início de pagamento</li>
            </ul>
          </div>
        )}

        {!isViewMode && (
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/members')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Salvar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}