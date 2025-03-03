import React from 'react';
import { FALLBACK_LOGO_URL, APP_NAME } from '../config/constants';
import { useClubSettings } from '../hooks/useClubSettings';

export default function Logo() {
  const { settings, loading } = useClubSettings();
  const logoUrl = settings.club_logo || FALLBACK_LOGO_URL;

  return (
    <div className="text-center">
      <img
        src={logoUrl}
        alt={APP_NAME}
        className={`mx-auto h-32 w-32 object-contain ${loading ? 'animate-pulse' : ''}`}
      />
      <h1 className="mt-4 text-3xl font-bold text-gray-900">{APP_NAME}</h1>
    </div>
  );
}