import { useState } from 'react';
import { 
  Building2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import { type NavigateFunction, type Establishment } from '../../types';

interface EstablishmentsScreenProps {
  onNavigate: NavigateFunction;
}

export function EstablishmentsScreen({ onNavigate }: EstablishmentsScreenProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected'>('pending');
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);

  // Données simulées
  const establishments: Establishment[] = [
    {
      id: '1',
      name: 'Université de Lyon',
      email: 'contact@univ-lyon.fr',
      status: 'pending',
      submittedAt: '2024-01-15',
      contactPerson: 'Dr. Marie Dubois',
      phone: '+33 1 23 45 67 89',
      address: '15 Rue de la République, 69002 Lyon',
      documents: [
        {
          id: '1',
          name: 'Licence commerciale',
          type: 'business_license',
          url: '/documents/license.pdf',
          uploadedAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'Certificat fiscal',
          type: 'tax_certificate',
          url: '/documents/tax.pdf',
          uploadedAt: '2024-01-15'
        }
      ]
    },
    {
      id: '2',
      name: 'École Supérieure de Commerce',
      email: 'admin@esc-paris.fr',
      status: 'pending',
      submittedAt: '2024-01-14',
      contactPerson: 'M. Jean Martin',
      phone: '+33 1 98 76 54 32',
      address: '25 Avenue des Champs, 75008 Paris',
      documents: [
        {
          id: '3',
          name: 'Justificatif d\'identité',
          type: 'identity_proof',
          url: '/documents/identity.pdf',
          uploadedAt: '2024-01-14'
        }
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'active': return 'Actif';
      case 'rejected': return 'Rejeté';
      default: return 'Inconnu';
    }
  };

  const filteredEstablishments = establishments.filter(est => est.status === activeTab);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Établissements</h1>
          <p className="text-gray-600">Validez et gérez les demandes d'inscription des établissements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'pending', label: 'En attente', count: establishments.filter(e => e.status === 'pending').length },
              { id: 'active', label: 'Actifs', count: establishments.filter(e => e.status === 'active').length },
              { id: 'rejected', label: 'Rejetés', count: establishments.filter(e => e.status === 'rejected').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {filteredEstablishments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun établissement</h3>
              <p className="text-gray-600">
                {activeTab === 'pending' && 'Aucune demande en attente de validation'}
                {activeTab === 'active' && 'Aucun établissement actif'}
                {activeTab === 'rejected' && 'Aucun établissement rejeté'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEstablishments.map((establishment) => (
                <div key={establishment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{establishment.name}</h3>
                        <p className="text-sm text-gray-600">{establishment.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Soumis le {new Date(establishment.submittedAt).toLocaleDateString('fr-FR')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(establishment.status)}`}>
                            {getStatusLabel(establishment.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedEstablishment(establishment)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {establishment.status === 'pending' && (
                        <>
                          <button
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="Valider"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rejeter"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Demander plus d'infos"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails (simplifié) */}
      {selectedEstablishment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Détails de {selectedEstablishment.name}
                </h2>
                <button
                  onClick={() => setSelectedEstablishment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Informations générales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="font-medium">{selectedEstablishment.contactPerson}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Téléphone</p>
                    <p className="font-medium">{selectedEstablishment.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="font-medium">{selectedEstablishment.address}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Documents justificatifs</h3>
                <div className="space-y-3">
                  {selectedEstablishment.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-600">
                          Ajouté le {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 inline mr-1" />
                          Afficher
                        </button>
                        <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Download className="w-4 h-4 inline mr-1" />
                          Télécharger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedEstablishment.status === 'pending' && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Actions de validation</h3>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Valider et Activer
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Rejeter la demande
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Demander plus d'infos
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
