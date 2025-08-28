import { useState, useEffect } from 'react';
import { 
  Building2, 
  XCircle, 
  Eye, 
  Check,
  X,
  RefreshCw,
  Clock
} from 'lucide-react';
import { api, type Establishment } from '../../services/api';

export function EstablishmentsScreen() {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected'>('pending');
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les établissements depuis l'API
  useEffect(() => {
    loadEstablishments();
  }, []);

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEstablishments();
      setEstablishments(data);
    } catch (err) {
      setError('Erreur lors du chargement des établissements');
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour le statut d'un établissement
  const handleStatusUpdate = async (id: number, newStatus: 'EN_ATTENTE' | 'ACTIF' | 'REJETE' | 'SUSPENDU') => {
    try {
      await api.updateEstablishmentStatus(id, newStatus);
      // Recharger les données
      await loadEstablishments();
      // Fermer le modal
      setSelectedEstablishment(null);
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  // Fonction pour visualiser un document
  const handleViewDocument = async (documentId: number, documentUrl?: string) => {
    try {
      await api.viewDocument(documentId, documentUrl);
    } catch (err) {
      console.error('Erreur visualisation:', err);
      alert('Erreur lors de la visualisation du document');
    }
  };

  // Fonction pour télécharger un document
  const handleDownloadDocument = async (documentId: number, fileName: string, documentUrl?: string) => {
    try {
      await api.downloadDocument(documentId, fileName, documentUrl);
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      alert('Erreur lors du téléchargement du document');
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-amber-100 text-amber-800';
      case 'ACTIF': return 'bg-green-100 text-green-800';
      case 'REJETE': return 'bg-red-100 text-red-800';
      case 'SUSPENDU': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'ACTIF': return 'Actif';
      case 'REJETE': return 'Rejeté';
      case 'SUSPENDU': return 'Suspendu';
      default: return 'Inconnu';
    }
  };

  // Mapper les statuts pour le filtrage
  const mapStatusForFilter = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'pending';
      case 'ACTIF': return 'active';
      case 'REJETE': return 'rejected';
      case 'SUSPENDU': return 'rejected'; // Grouper avec les rejetés pour l'affichage
      default: return 'pending';
    }
  };

  // Fonction utilitaire pour détecter le type de document
  const isSupabaseDocument = (cheminFichier: string): boolean => {
    return cheminFichier.startsWith('http');
  };

  // Fonction pour obtenir l'icône du type de document
  const getDocumentIcon = (typeDocument: string) => {
    switch (typeDocument.toLowerCase()) {
      case 'rccm': return '📋';
      case 'autorisation': return '✅';
      case 'pieceidentite': return '🆔';
      case 'logo': return '🖼️';
      case 'plaquette': return '📄';
      default: return '📎';
    }
  };

  const filteredEstablishments = establishments.filter(est => mapStatusForFilter(est.statut) === activeTab);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Établissements</h1>
          <p className="text-gray-600">Validez et gérez les demandes d'inscription des établissements</p>
        </div>
        <button
          onClick={loadEstablishments}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Rafraîchir la liste"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'pending', label: 'En attente', count: establishments.filter(e => e.statut === 'EN_ATTENTE').length },
              { id: 'active', label: 'Actifs', count: establishments.filter(e => e.statut === 'ACTIF').length },
              { id: 'rejected', label: 'Rejetés', count: establishments.filter(e => e.statut === 'REJETE').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'pending' | 'active' | 'rejected')}
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
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des établissements...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadEstablishments}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : filteredEstablishments.length === 0 ? (
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
                <div key={establishment.id_etablissement} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{establishment.nomEtablissement}</h3>
                        <p className="text-sm text-gray-600">{establishment.emailEtablissement}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Soumis le {new Date(establishment.dateCreation).toLocaleDateString('fr-FR')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(establishment.statut)}`}>
                            {getStatusLabel(establishment.statut)}
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
                      
                      {establishment.statut === 'EN_ATTENTE' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(establishment.id_etablissement, 'ACTIF')}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="Valider et activer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                                                    <button 
                            onClick={() => handleStatusUpdate(establishment.id_etablissement, 'REJETE')}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rejeter"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(establishment.id_etablissement, 'SUSPENDU')}
                            className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Suspendre"
                          >
                            <Clock className="w-4 h-4" />
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
                  Détails de {selectedEstablishment.nomEtablissement}
                </h2>
                <button
                  onClick={() => setSelectedEstablishment(null)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Fermer"
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
                    <p className="font-medium">{selectedEstablishment.nomResponsableEtablissement}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Téléphone</p>
                    <p className="font-medium">{selectedEstablishment.telephoneEtablissement}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="font-medium">{selectedEstablishment.adresseEtablissement}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Documents justificatifs</h3>
                <div className="space-y-3">
                  {selectedEstablishment.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getDocumentIcon(doc.typeDocument)}</span>
                        <div>
                          <p className="font-medium text-gray-900">{doc.nomFichier}</p>
                          <p className="text-sm text-gray-600">
                            Ajouté le {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {isSupabaseDocument(doc.cheminFichier) ? '📁 Stocké sur Supabase' : '💾 Stocké localement'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewDocument(doc.id, doc.cheminFichier)}
                          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Afficher le document"
                        >
                          <Eye className="w-4 h-4 inline mr-1" />
                          Afficher
                        </button>
                        <button 
                          onClick={() => handleDownloadDocument(doc.id, doc.nomFichier, doc.cheminFichier)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Télécharger le document"
                        >
                          <Eye className="w-4 h-4 inline mr-1" />
                          Télécharger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedEstablishment.statut === 'EN_ATTENTE' && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Actions de validation</h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleStatusUpdate(selectedEstablishment.id_etablissement, 'ACTIF')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Valider et Activer
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(selectedEstablishment.id_etablissement, 'REJETE')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Rejeter la demande
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
