import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { api } from '../../services/api';
import authService from '../../services/authService';

type Status = 'loading' | 'success' | 'pending' | 'error';

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Vérification de votre paiement…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference =
      params.get('reference') ||
      params.get('trxref') ||
      localStorage.getItem('pendingSubscriptionRef') ||
      '';

    if (!reference) {
      setStatus('error');
      setMessage('Référence de paiement introuvable.');
      return;
    }

    (async () => {
      try {
        const res = await api.verifySubscriptionPayment(reference);
        if (res.success) {
          localStorage.removeItem('pendingSubscriptionRef');
          setStatus('success');
          setMessage('Paiement confirmé ! Votre abonnement est maintenant actif.');
        } else {
          setStatus('pending');
          setMessage(
            res.message ||
              "Votre paiement est en cours de traitement. Votre abonnement sera activé dès confirmation."
          );
        }
      } catch {
        setStatus('pending');
        setMessage(
          "Nous n'avons pas pu confirmer immédiatement le paiement. Il sera validé automatiquement sous peu."
        );
      }
    })();
  }, []);

  const icon = {
    loading: <Loader2 className="h-12 w-12 text-rose-500 animate-spin" />,
    success: <CheckCircle2 className="h-12 w-12 text-green-500" />,
    pending: <Clock className="h-12 w-12 text-orange-500" />,
    error: <XCircle className="h-12 w-12 text-red-500" />,
  }[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">{icon}</div>
        <h1 className="text-xl font-bold text-gray-900">
          {status === 'success'
            ? 'Paiement réussi'
            : status === 'error'
            ? 'Erreur'
            : status === 'pending'
            ? 'Paiement en attente'
            : 'Traitement en cours'}
        </h1>
        <p className="text-gray-600">{message}</p>
        {status !== 'loading' && (
          <button
            onClick={() => {
              const role = authService.getUser()?.role || 'establishment';
              navigate(authService.getToken() ? `/dashboard?userType=${role}` : '/auth');
            }}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors"
          >
            Accéder à mon espace
          </button>
        )}
      </div>
    </div>
  );
}
