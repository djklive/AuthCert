import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Users, 
  Search, 
  Plus, 
  Award, 
  Eye, 
  Mail,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  UserPlus
} from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import authService from '../../../services/authService';

//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
const API_BASE_URL = 'http://localhost:5000/api';

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

interface StudentsManagementScreenProps {
  onNavigate: (screen: string) => void;
}

export function StudentsManagementScreen({ onNavigate }: StudentsManagementScreenProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('linked');
  const [demandesEnAttente, setDemandesEnAttente] = useState<DemandeLiaison[]>([]);
  const [etudiantsLies, setEtudiantsLies] = useState<EtudiantLie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Charger les demandes en attente et les étudiants liés en parallèle
      const [demandesResponse, etudiantsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/etablissement/${user.id}/demandes`, {
          headers: authService.getAuthHeaders()
        }),
        fetch(`${API_BASE_URL}/etablissement/${user.id}/etudiants`, {
          headers: authService.getAuthHeaders()
        })
      ]);

      if (!demandesResponse.ok || !etudiantsResponse.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const [demandesData, etudiantsData] = await Promise.all([
        demandesResponse.json(),
        etudiantsResponse.json()
      ]);

      setDemandesEnAttente(demandesData.data);
      setEtudiantsLies(etudiantsData.data);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

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
      const response = await fetch(`${API_BASE_URL}/liaison/${requestId}/statut`, {
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
      const response = await fetch(`${API_BASE_URL}/liaison/${requestId}/statut`, {
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
        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted">
          <TabsTrigger value="linked" className="flex items-center gap-2 h-10 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            Étudiants liés ({etudiantsLies.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2 h-10 rounded-lg">
            <Clock className="h-4 w-4" />
            Demandes en attente ({demandesEnAttente.length})
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
      </Tabs>
    </div>
  );
}