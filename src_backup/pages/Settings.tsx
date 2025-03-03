import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Trash2, Edit, FileText, Music, Book, AlertCircle, Check, X, Image, Link } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Setting {
  id: string;
  key: string;
  name: string;
  type: string;
  value: string | null;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['clean']
  ],
};

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    checkAdminStatus();
    fetchSettings();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data: member } = await supabase
          .from('members')
          .select('is_admin')
          .eq('user_id', session.user.id)
          .single();
        
        setIsAdmin(member?.is_admin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('club_settings')
        .select('*')
        .order('name');

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
    }
  };

  const uploadFile = async (file: File, setting: Setting): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${setting.key}-${Date.now()}.${fileExt}`;
    const filePath = `${setting.key}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('club-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('club-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!editingSetting) return;

    try {
      let newValue = editingSetting.value;

      if (fileToUpload && (editingSetting.type === 'file' || editingSetting.type === 'image')) {
        newValue = await uploadFile(fileToUpload, editingSetting);
      }

      const { error } = await supabase
        .from('club_settings')
        .update({ value: newValue })
        .eq('id', editingSetting.id);

      if (error) throw error;

      setSuccess('Configuração atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      await fetchSettings();
      setEditingSetting(null);
      setFileToUpload(null);
    } catch (err) {
      console.error('Error updating setting:', err);
      setError('Erro ao atualizar configuração');
    }
  };

  const handleDelete = async (setting: Setting) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${setting.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('club_settings')
        .update({ value: null })
        .eq('id', setting.id);

      if (error) throw error;

      setSuccess('Arquivo removido com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      await fetchSettings();
    } catch (err) {
      console.error('Error deleting setting:', err);
      setError('Erro ao excluir configuração');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText className="w-6 h-6" />;
      case 'text':
        return <Book className="w-6 h-6" />;
      case 'html':
        return <FileText className="w-6 h-6" />;
      case 'image':
        return <Image className="w-6 h-6" />;
      case 'url':
        return <Link className="w-6 h-6" />;
      default:
        return <AlertCircle className="w-6 h-6" />;
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
        Apenas administradores podem acessar as configurações.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações do Clube</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getIcon(setting.type)}
                  <div>
                    <h3 className="font-medium text-gray-900">{setting.name}</h3>
                    <p className="text-sm text-gray-500">
                      {setting.key === 'initial_balance' ? 
                        'Saldo anterior ao início dos lançamentos' :
                        (setting.value ? 'Configurado' : 'Não configurado')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {editingSetting?.id === setting.id ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSetting(null);
                          setFileToUpload(null);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingSetting(setting)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {setting.value && setting.key !== 'initial_balance' && (
                        <button
                          onClick={() => handleDelete(setting)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editingSetting?.id === setting.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  {setting.key === 'initial_balance' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor do Saldo Inicial
                      </label>
                      <input
                        type="text"
                        value={editingSetting.value || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.,\-]/g, '').replace(',', '.');
                          setEditingSetting({
                            ...editingSetting,
                            value: value
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="0.00"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Use valores negativos para saldo devedor
                      </p>
                    </div>
                  ) : (
                    <>
                      {(setting.type === 'file' || setting.type === 'image') && setting.key !== 'club_statute' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selecione o arquivo
                          </label>
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50">
                              <Upload className="w-5 h-5 mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {setting.type === 'image' ? 'Escolher imagem' : 'Escolher arquivo'}
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept={setting.type === 'image' ? "image/*" : ".pdf,.doc,.docx"}
                                onChange={handleFileChange}
                              />
                            </label>
                            {fileToUpload && (
                              <span className="text-sm text-gray-600">
                                {fileToUpload.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {setting.type === 'text' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Conteúdo
                          </label>
                          <textarea
                            value={editingSetting.value || ''}
                            onChange={(e) => setEditingSetting({
                              ...editingSetting,
                              value: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={4}
                          />
                        </div>
                      )}

                      {setting.type === 'url' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            URL
                          </label>
                          <input
                            type="url"
                            value={editingSetting.value || ''}
                            onChange={(e) => setEditingSetting({
                              ...editingSetting,
                              value: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="https://"
                          />
                        </div>
                      )}

                      {(setting.type === 'html' || setting.key === 'club_statute') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Conteúdo
                          </label>
                          <div className="bg-white border border-gray-300 rounded-md">
                            <ReactQuill
                              value={editingSetting.value || ''}
                              onChange={(value) => setEditingSetting({
                                ...editingSetting,
                                value: value
                              })}
                              modules={modules}
                              theme="snow"
                              className="h-[300px] mb-12"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}