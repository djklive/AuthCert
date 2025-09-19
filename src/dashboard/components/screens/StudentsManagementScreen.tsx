import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Mail,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  UserPlus,
  FileText
} from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import authService from '../../../services/authService';
import { API_BASE, api } from '../../../services/api';

//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';

interface DemandeLiaison {
  id: number;
  statutLiaison: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE' | 'SUSPENDU';
  dateDemande: string;
  dateApprobation?: string;
  messageDemande?: string;
  apprenant: {
    id_apprenant: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    dateCreation: string;
  };
}

interface EtudiantLie {
  id: number;
  dateApprobation: string;
  apprenant: {
    id_apprenant: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    dateCreation: string;
    statut: string;
  };
}

interface DemandeCertificat {
  id: number;
  titre: string;
  description?: string;
  messageDemande?: string;
  statutDemande: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE' | 'EN_COURS_TRAITEMENT';
  dateDemande: string;
  dateTraitement?: string;
  messageReponse?: string;
  apprenant: {
    id_apprenant: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    dateCreation: string;
  };
  documents: Array<{
    id: number;
    nomFichier: string;
    typeMime: string;
    tailleFichier: number;
    cheminFichier: string;
  }>;
}

interface StudentsManagementScreenProps {
  onNavigate: (screen: string) => void;
}

export function StudentsManagementScreen({ onNavigate }: StudentsManagementScreenProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('linked');
  const [demandesEnAttente, setDemandesEnAttente] = useState<DemandeLiaison[]>([]);
  const [etudiantsLies, setEtudiantsLies] = useState<EtudiantLie[]>([]);
  const [demandesCertificat, setDemandesCertificat] = useState<DemandeCertificat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // États pour les filtres des demandes de certificat
  const [certificateFilter, setCertificateFilter] = useState<'all' | 'EN_ATTENTE' | 'APPROUVE' | 'REJETE'>('all');
  const [certificateSearchQuery, setCertificateSearchQuery] = useState('');
  const [selectedDemande, setSelectedDemande] = useState<DemandeCertificat | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [messageReponse, setMessageReponse] = useState('');
  const [processingDemande, setProcessingDemande] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Charger les demandes en attente, les étudiants liés et les demandes de certificat en parallèle
      const [demandesResponse, etudiantsResponse, demandesCertificatResponse] = await Promise.all([
        fetch(`${API_BASE}/etablissement/${user.id}/demandes`, {
          headers: authService.getAuthHeaders()
        }),
        fetch(`${API_BASE}/etablissement/${user.id}/etudiants`, {
          headers: authService.getAuthHeaders()
        }),
        fetch(`${API_BASE}/etablissement/${user.id}/demandes-certificat`, {
          headers: authService.getAuthHeaders()
        })
      ]);

      if (!demandesResponse.ok || !etudiantsResponse.ok || !demandesCertificatResponse.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const [demandesData, etudiantsData, demandesCertificatData] = await Promise.all([
        demandesResponse.json(),
        etudiantsResponse.json(),
        demandesCertificatResponse.json()
      ]);

      setDemandesEnAttente(demandesData.data);
      setEtudiantsLies(etudiantsData.data);
      setDemandesCertificat(demandesCertificatData.data);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Charger les données
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLinkedStudents = etudiantsLies.filter(etudiant =>
    `${etudiant.apprenant.prenom} ${etudiant.apprenant.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    etudiant.apprenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPendingRequests = demandesEnAttente.filter(demande =>
    `${demande.apprenant.prenom} ${demande.apprenant.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    demande.apprenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApproveRequest = async (requestId: number) => {
    try {
      const response = await fetch(`${API_BASE}/liaison/${requestId}/statut`, {
        method: 'PATCH',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statut: 'APPROUVE',
          messageReponse: 'Demande approuvée avec succès'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'approbation');
      }

      // Recharger les données
      await loadData();
      console.log('Demande approuvée:', requestId);
    } catch (err) {
      setError('Erreur lors de l\'approbation de la demande');
      console.error('Erreur approbation:', err);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      const response = await fetch(`${API_BASE}/liaison/${requestId}/statut`, {
        method: 'PATCH',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statut: 'REJETE',
          messageReponse: 'Demande rejetée'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du rejet');
      }

      // Recharger les données
      await loadData();
      console.log('Demande rejetée:', requestId);
    } catch (err) {
      setError('Erreur lors du rejet de la demande');
      console.error('Erreur rejet:', err);
    }
  };

  // Fonctions pour les demandes de certificat
  const handleProcessDemandeCertificat = async (demandeId: number, statut: 'APPROUVE' | 'REJETE') => {
    try {
      setProcessingDemande(demandeId);
      
      const response = await fetch(`${API_BASE}/demandes-certificat/${demandeId}/statut`, {
        method: 'PATCH',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statutDemande: statut,
          messageReponse: messageReponse.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors du traitement de la demande');
      }

      // Fermer le modal et recharger les données
      setIsDetailModalOpen(false);
      setSelectedDemande(null);
      setMessageReponse('');
      await loadData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement de la demande');
    } finally {
      setProcessingDemande(null);
    }
  };

  const openDetailModal = (demande: DemandeCertificat) => {
    setSelectedDemande(demande);
    setMessageReponse('');
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EN_ATTENTE':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        );
      case 'APPROUVE':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approuvé
          </Badge>
        );
      case 'REJETE':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Refusé
          </Badge>
        );
      case 'EN_COURS_TRAITEMENT':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="mr-1 h-3 w-3" />
            En cours
          </Badge>
        );
      default:
        return null;
    }
  };

  // Fonctions utilitaires pour les statistiques des demandes de certificat
  const getCertificateStats = () => {
    const total = demandesCertificat.length;
    const enAttente = demandesCertificat.filter(d => d.statutDemande === 'EN_ATTENTE').length;
    const approuvees = demandesCertificat.filter(d => d.statutDemande === 'APPROUVE').length;
    const rejetees = demandesCertificat.filter(d => d.statutDemande === 'REJETE').length;
    
    return { total, enAttente, approuvees, rejetees };
  };

  // Fonction pour filtrer les demandes de certificat
  const getFilteredCertificateRequests = () => {
    let filtered = demandesCertificat;

    // Filtre par statut
    if (certificateFilter !== 'all') {
      filtered = filtered.filter(d => d.statutDemande === certificateFilter);
    }

    // Filtre par recherche
    if (certificateSearchQuery.trim()) {
      const query = certificateSearchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.titre.toLowerCase().includes(query) ||
        d.apprenant.nom.toLowerCase().includes(query) ||
        d.apprenant.prenom.toLowerCase().includes(query) ||
        d.apprenant.email.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Gestion des étudiants</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Gérez vos étudiants liés et traitez les nouvelles demandes de liaison
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" className="rounded-xl w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button className="rounded-xl w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter un étudiant
          </Button>
        </div>
      </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-500">{error}</p>
          </div>
        )}

      {/* Search and Filter */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email ou formation..."
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Button variant="outline" className="rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted">
          <TabsTrigger value="linked" className="flex items-center gap-2 h-10 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            Étudiants liés ({etudiantsLies.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2 h-10 rounded-lg">
            <Clock className="h-4 w-4" />
            Demandes liaison ({demandesEnAttente.length})
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex items-center gap-2 h-10 rounded-lg">
            <FileText className="h-4 w-4" />
            Demandes certificat ({demandesCertificat.length})
          </TabsTrigger>
        </TabsList>

        {/* Linked Students Tab */}
        <TabsContent value="linked" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total étudiants</p>
                    <p className="text-3xl font-bold">{etudiantsLies.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Étudiants actifs</p>
                    <p className="text-3xl font-bold">{etudiantsLies.filter(e => e.apprenant.statut === 'ACTIF').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Demandes en attente</p>
                    <p className="text-3xl font-bold">{demandesEnAttente.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Liste des étudiants liés</CardTitle>
              <CardDescription>
                Gérez vos étudiants et leurs certificats
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Chargement des étudiants...</p>
                </div>
              ) : (
              <div className="space-y-4">
                  {filteredLinkedStudents.map((etudiant) => (
                    <div key={etudiant.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                            {`${etudiant.apprenant.prenom[0]}${etudiant.apprenant.nom[0]}`}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                          <h3 className="font-medium">{`${etudiant.apprenant.prenom} ${etudiant.apprenant.nom}`}</h3>
                          <p className="text-sm text-muted-foreground">{etudiant.apprenant.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant={etudiant.apprenant.statut === 'ACTIF' ? 'default' : 'secondary'} className="text-xs">
                              {etudiant.apprenant.statut === 'ACTIF' ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                              Lié le {new Date(etudiant.dateApprobation).toLocaleDateString('fr-FR')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => onNavigate('profile')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir profil
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-lg"
                        onClick={() => onNavigate('create-certificate')}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Créer certificat
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-lg">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                  {filteredLinkedStudents.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Aucun étudiant trouvé</h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'Modifiez votre recherche ou' : 'Commencez par'} approuver des demandes de liaison d\'étudiants.
                    </p>
                  </div>
                )}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="rounded-2xl border-orange-200 bg-gradient-to-br from-orange-50 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Demandes en attente</p>
                    <p className="text-3xl font-bold text-orange-600">{demandesEnAttente.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Traitées cette semaine</p>
                    <p className="text-3xl font-bold">12</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Temps moyen de traitement</p>
                    <p className="text-3xl font-bold">2.5j</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Chargement des demandes...</p>
            </div>
          ) : (
          <div className="space-y-4">
              {filteredPendingRequests.map((demande) => (
                <Card key={demande.id} className="rounded-2xl border-orange-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-50">
                              {`${demande.apprenant.prenom[0]}${demande.apprenant.nom[0]}`}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium">{`${demande.apprenant.prenom} ${demande.apprenant.nom}`}</h3>
                            <p className="text-sm text-muted-foreground">{demande.apprenant.email}</p>
                            {demande.apprenant.telephone && (
                              <p className="text-sm text-muted-foreground">{demande.apprenant.telephone}</p>
                            )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                            Demandé le {new Date(demande.dateDemande).toLocaleDateString('fr-FR')}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      </div>
                    </div>

                      {demande.messageDemande && (
                    <div className="p-4 bg-accent/30 rounded-xl">
                      <h4 className="font-medium mb-2">Message de l'étudiant :</h4>
                          <p className="text-sm text-muted-foreground">{demande.messageDemande}</p>
                    </div>
                      )}

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium mb-2 text-blue-800">Informations de l'étudiant :</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                          <div>
                            <span className="font-medium">Inscrit le :</span> {new Date(demande.apprenant.dateCreation).toLocaleDateString('fr-FR')}
                          </div>
                      <div>
                            <span className="font-medium">ID :</span> {demande.apprenant.id_apprenant}
                          </div>
                        </div>
                      </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-lg"
                            asChild
                          >
                            <a href={`mailto:${demande.apprenant.email}`}>
                          <Mail className="h-4 w-4 mr-1" />
                          Contacter
                            </a>
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg">
                          <Eye className="h-4 w-4 mr-1" />
                          Voir détails
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => handleRejectRequest(demande.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                        <Button 
                          size="sm" 
                          className="rounded-lg bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveRequest(demande.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

              {filteredPendingRequests.length === 0 && !loading && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">
                  {searchQuery ? 'Aucune demande trouvée' : 'Aucune demande en attente'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? 'Modifiez votre recherche pour voir d\'autres demandes.' 
                    : 'Toutes les demandes de liaison ont été traitées.'
                  }
                </p>
              </div>
            )}
          </div>
          )}
        </TabsContent>

        {/* Certificate Requests Tab */}
        <TabsContent value="certificates" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Chargement des demandes...</p>
            </div>
          ) : (
            <>
              {/* Statistiques des demandes de certificat */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total demandes</p>
                        <p className="text-3xl font-bold">{getCertificateStats().total}</p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">En attente</p>
                        <p className="text-3xl font-bold text-orange-600">{getCertificateStats().enAttente}</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Approuvées</p>
                        <p className="text-3xl font-bold text-green-600">{getCertificateStats().approuvees}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Rejetées</p>
                        <p className="text-3xl font-bold text-red-600">{getCertificateStats().rejetees}</p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filtres et recherche */}
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row items-center gap-4">
                    {/* Barre de recherche */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par titre, étudiant ou email..."
                        value={certificateSearchQuery}
                        onChange={(e) => setCertificateSearchQuery(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                      />
                    </div>

                    {/* Filtres par statut */}
                    <div className="flex gap-2">
                      <Button
                        variant={certificateFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCertificateFilter('all')}
                        className="rounded-lg"
                      >
                        Toutes ({getCertificateStats().total})
                      </Button>
                      <Button
                        variant={certificateFilter === 'EN_ATTENTE' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCertificateFilter('EN_ATTENTE')}
                        className="rounded-lg"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        En attente ({getCertificateStats().enAttente})
                      </Button>
                      <Button
                        variant={certificateFilter === 'APPROUVE' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCertificateFilter('APPROUVE')}
                        className="rounded-lg"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approuvées ({getCertificateStats().approuvees})
                      </Button>
                      <Button
                        variant={certificateFilter === 'REJETE' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCertificateFilter('REJETE')}
                        className="rounded-lg"
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Rejetées ({getCertificateStats().rejetees})
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des demandes filtrées */}
              <div className="space-y-4">
                {getFilteredCertificateRequests().length === 0 ? (
                  <Card className="rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">Aucune demande trouvée</h3>
                      <p className="text-sm text-muted-foreground">
                        {certificateFilter !== 'all' || certificateSearchQuery.trim() 
                          ? 'Aucune demande ne correspond aux filtres sélectionnés.'
                          : 'Aucune demande de certificat n\'a été soumise pour le moment.'
                        }
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  getFilteredCertificateRequests().map((demande) => (
                <Card key={demande.id} className="rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{demande.titre}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{demande.apprenant.prenom} {demande.apprenant.nom}</span>
                              <span>{demande.apprenant.email}</span>
                              <span>{new Date(demande.dateDemande).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          {getStatusBadge(demande.statutDemande)}
                        </div>

                        {demande.description && (
                          <p className="text-sm text-muted-foreground mb-3">{demande.description}</p>
                        )}

                        {demande.messageDemande && (
                          <div className="p-3 bg-accent/50 rounded-lg mb-3">
                            <p className="text-sm font-medium mb-1">Message de l'étudiant:</p>
                            <p className="text-sm text-muted-foreground">{demande.messageDemande}</p>
                          </div>
                        )}

                        {demande.documents.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-2">Documents fournis:</p>
                            <div className="flex flex-wrap gap-2">
                              {demande.documents.map((doc) => (
                                <Badge key={doc.id} variant="outline" className="text-xs">
                                  <Download className="h-3 w-3 mr-1" />
                                  {doc.nomFichier}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {demande.messageReponse && (
                          <div className={`p-3 rounded-lg ${
                            demande.statutDemande === 'REJETE' 
                              ? 'bg-red-50 border border-red-200' 
                              : 'bg-green-50 border border-green-200'
                          }`}>
                            <p className={`text-sm font-medium mb-1 ${
                              demande.statutDemande === 'REJETE' ? 'text-red-800' : 'text-green-800'
                            }`}>
                              Votre réponse:
                            </p>
                            <p className="text-sm text-muted-foreground">{demande.messageReponse}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg"
                          onClick={() => openDetailModal(demande)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir détails
                        </Button>
                        
                        {demande.statutDemande === 'EN_ATTENTE' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-lg border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => handleProcessDemandeCertificat(demande.id, 'REJETE')}
                              disabled={processingDemande === demande.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                            <Button 
                              size="sm" 
                              className="rounded-lg bg-green-600 hover:bg-green-700"
                              onClick={() => handleProcessDemandeCertificat(demande.id, 'APPROUVE')}
                              disabled={processingDemande === demande.id}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de détails de la demande */}
      {selectedDemande && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                Détails de la demande de certificat
              </DialogTitle>
              <DialogDescription>
                Demande de {selectedDemande.apprenant.prenom} {selectedDemande.apprenant.nom}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Informations du certificat</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Titre:</span>
                      <span className="font-medium">{selectedDemande.titre}</span>
                    </div>
                    {selectedDemande.description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Description:</span>
                        <span className="font-medium">{selectedDemande.description}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date de demande:</span>
                      <span className="font-medium">{new Date(selectedDemande.dateDemande).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statut:</span>
                      {getStatusBadge(selectedDemande.statutDemande)}
                    </div>
                  </div>
                </div>

                {/* Informations de l'étudiant */}
                <div>
                  <h4 className="font-semibold mb-2">Informations de l'étudiant</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nom:</span>
                      <span className="font-medium">{selectedDemande.apprenant.prenom} {selectedDemande.apprenant.nom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedDemande.apprenant.email}</span>
                    </div>
                    {selectedDemande.apprenant.telephone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Téléphone:</span>
                        <span className="font-medium">{selectedDemande.apprenant.telephone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message de l'étudiant */}
                {selectedDemande.messageDemande && (
                  <div>
                    <h4 className="font-semibold mb-2">Message de l'étudiant</h4>
                    <div className="p-3 bg-accent/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">{selectedDemande.messageDemande}</p>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {selectedDemande.documents.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Documents fournis</h4>
                    <div className="space-y-2">
                      {selectedDemande.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{doc.nomFichier}</span>
                            <Badge variant="outline" className="text-xs">
                              {(doc.tailleFichier / 1024 / 1024).toFixed(2)} MB
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await api.getDocumentUrl(doc.id);
                                if (response.success) {
                                  window.open(response.data.url, '_blank');
                                } else {
                                  console.error('Erreur récupération URL:', response.message);
                                }
                              } catch (error) {
                                console.error('Erreur ouverture document:', error);
                              }
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Ouvrir
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Réponse (si déjà traitée) */}
                {selectedDemande.messageReponse && (
                  <div>
                    <h4 className="font-semibold mb-2">Votre réponse</h4>
                    <div className={`p-3 rounded-lg ${
                      selectedDemande.statutDemande === 'REJETE' 
                        ? 'bg-red-50 border border-red-200' 
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <p className="text-sm text-muted-foreground">{selectedDemande.messageReponse}</p>
                    </div>
                  </div>
                )}

                {/* Zone de réponse (si en attente) */}
                {selectedDemande.statutDemande === 'EN_ATTENTE' && (
                  <div>
                    <h4 className="font-semibold mb-2">Votre réponse</h4>
                    <Textarea
                      placeholder="Ajoutez un message pour l'étudiant (optionnel)..."
                      value={messageReponse}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageReponse(e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Fermer
              </Button>
              
              {selectedDemande.statutDemande === 'EN_ATTENTE' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleProcessDemandeCertificat(selectedDemande.id, 'REJETE')}
                    disabled={processingDemande === selectedDemande.id}
                    className="flex items-center gap-2"
                  >
                    {processingDemande === selectedDemande.id ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Rejeter
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleProcessDemandeCertificat(selectedDemande.id, 'APPROUVE')}
                    disabled={processingDemande === selectedDemande.id}
                    className="flex items-center gap-2"
                  >
                    {processingDemande === selectedDemande.id ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Approuver
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}