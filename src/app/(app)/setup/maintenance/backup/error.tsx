'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log typical Next.js error digest for debugging
    console.error('[BACKUP_ERROR_BOUNDARY]', error);
  }, [error]);

  return (
    <div className="container mx-auto py-20 px-4">
      <div className="max-w-2xl mx-auto p-8 rounded-2xl border border-red-100 bg-red-50/50 shadow-sm text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6">
          <AlertCircle className="h-8 w-8" />
        </div>
        
        <h2 className="text-2xl font-bold text-red-900 mb-2">
          Erreur de Chargement (Maintenance)
        </h2>
        
        <p className="text-red-700/80 mb-8 max-w-md mx-auto">
          Une erreur imprévue est survenue lors du rendu de la page de sauvegarde. 
          Cela peut être dû à une session expirée ou à un problème de connexion temporaire.
        </p>

        {error.digest && (
          <div className="mb-8 p-3 bg-red-100/50 rounded-lg text-[10px] font-mono text-red-800 break-all">
            ID d'erreur : {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-all active:scale-95"
          >
            <Home className="h-4 w-4" />
            Retour au Tableau de Bord
          </Link>
        </div>
      </div>
    </div>
  );
}
