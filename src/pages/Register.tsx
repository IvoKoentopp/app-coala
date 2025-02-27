import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { Upload, Loader, AlertTriangle } from 'lucide-react';

interface Member {
  nickname: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    accessKey: '',
    name: '',
    nickname: '',
    birthDate: '',
    category: '',
    sponsorNickname: '',
    paymentStartMonth: '',
    phone: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [step, setStep] = useState(1); // 1 = user registration, 2 = member details
  const [loading, setLoading] = useState(true);
  const [sponsorsError, setSponsorsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setSponsorsError('');
      
      const { data, error } = await supabase
        .from('members')
        .select('nickname')
        .eq('status', 'Ativo')
        .order('nickname');
        
      if (error) throw error;
      
      if (data) {
        setMembers(data);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setSponsorsError('Erro ao carregar lista de padrinhos');
    } finally {
      setLoading(false);
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
    if (!photoFile) return null;

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
      return null;
    }
  };

  const validateAccessKey = async (key: string): Promise<boolean> => {
    try {
      // Direct query to club_settings table instead of using the function
      const { data, error } = await supabase
        .from('club_settings')
        .select('value')
        .eq('key', 'access_key')
        .single();

      if (error) {
        console.error('Error validating access key:', error);
        throw new Error('Sistema não configurado para registros. Entre em contato com um administrador.');
      }

      // If no access key is set in the database, registration is not allowed
      if (!data || !data.value) {
        throw new Error('Sistema não configurado para registros. Entre em contato com um administrador.');
      }

      return data.value === key;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Erro ao validar chave de acesso');
    }
  };

  const validateNickname = async (nickname: string) => {
    if (!nickname) {
      setNicknameError('Apelido é obrigatório');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('members')
        .select('nickname')
        .eq('nickname', nickname);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setNicknameError('Este apelido já está em uso');
        return false;
      }

      setNicknameError('');
      return true;
    } catch (err) {
      console.error('Error validating nickname:', err);
      return false;
    }
  };

  const handleNicknameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nickname = e.target.value;
    setFormData({ ...formData, nickname });
    await validateNickname(nickname);
  };

  const handleUserRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate access key first
      const isValidKey = await validateAccessKey(formData.accessKey);
      if (!isValidKey) {
        throw new Error('Chave de acesso inválida');
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password
      });

      if (error) {
        if (error.message === 'User already registered') {
          throw new Error('Este email já está cadastrado. Por favor, use outro email ou faça login.');
        }
        throw error;
      }

      if (data.user) {
        setStep(2);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Erro ao criar conta. Verifique os dados e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMemberRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validar apelido antes de prosseguir
      const isNicknameValid = await validateNickname(formData.nickname);
      if (!isNicknameValid) {
        setIsSubmitting(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id) throw new Error('Usuário não autenticado');

      const photoUrl = await uploadPhoto(session.user.id);

      const memberData = {
        user_id: session.user.id,
        name: formData.name,
        nickname: formData.nickname,
        birth_date: formData.birthDate || null,
        category: formData.category,
        sponsor_nickname: formData.sponsorNickname || null,
        start_month: format(new Date(), 'yyyy-MM-dd'),
        payment_start_month: formData.category === 'Contribuinte' ? formData.paymentStartMonth : null,
        status: 'Ativo',
        photo_url: photoUrl,
        phone: formData.phone
      };

      const { error } = await supabase.from('members').insert([memberData]);

      if (error) throw error;
      navigate('/');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Erro ao cadastrar membro. Verifique os dados e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSponsorSelect = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-2">
          <Loader className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">Carregando padrinhos...</span>
        </div>
      );
    }

    if (sponsorsError) {
      return (
        <div className="flex items-center justify-center py-2 text-red-600">
          <span>{sponsorsError}</span>
          <button
            onClick={fetchMembers}
            className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className="text-center py-2 text-gray-600">
          Nenhum padrinho disponível
        </div>
      );
    }

    return (
      <select
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        value={formData.sponsorNickname}
        onChange={(e) => setFormData({ ...formData, sponsorNickname: e.target.value })}
      >
        <option value="">Selecione um padrinho</option>
        {members.map((member) => (
          <option key={member.nickname} value={member.nickname}>
            {member.nickname}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="min-h-screen bg-green-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <Logo />
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleUserRegistration} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Chave de Acesso</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.accessKey}
                onChange={(e) => setFormData({ ...formData, accessKey: e.target.value })}
                disabled={isSubmitting}
                placeholder="Digite a chave de acesso fornecida pelo clube"
              />
              <p className="mt-1 text-sm text-gray-500">
                Esta chave é fornecida pelos administradores do clube
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={isSubmitting}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSubmitting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center`}
              >
                {isSubmitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'Processando...' : 'Próximo'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMemberRegistration} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Apelido</label>
              <input
                type="text"
                required
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                  nicknameError ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.nickname}
                onChange={handleNicknameChange}
                disabled={isSubmitting}
              />
              {nicknameError && (
                <p className="mt-1 text-sm text-red-600">{nicknameError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Foto</label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="photo-upload"
                    className={`cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Escolher foto
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="tel"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data de Nascimento
                <span className="text-gray-500 text-xs ml-1">(opcional)</span>
              </label>
              <input
                type="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <div className="space-y-2">
                {['Colaborador', 'Contribuinte', 'Convidado'].map((category) => (
                  <div key={category} className="flex items-center">
                    <input
                      type="radio"
                      id={category}
                      name="category"
                      value={category}
                      required
                      className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      disabled={isSubmitting}
                    />
                    <label htmlFor={category} className="ml-3 block text-sm font-medium text-gray-700">
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Padrinho</label>
              {renderSponsorSelect()}
            </div>

            {formData.category === 'Contribuinte' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mês de Início de Pagamento
                </label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  value={formData.paymentStartMonth}
                  onChange={(e) => setFormData({ ...formData, paymentStartMonth: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={isSubmitting}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!nicknameError}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center ${
                  isSubmitting || nicknameError
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
              >
                {isSubmitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'Processando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}