import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { API_BASE } from '../../../services/api';
import { 
  Building2, 
  MapPin, 
  //Award, 
  Plus, 
  Search, 
  ExternalLink, 
  Clock,
  CheckCircle,
  XCircle,
  Send,
  //Users,
  TrendingUp
} from 'lucide-react';
//import { useUser } from '../../hooks/useUser';
import authService from '../../../services/authService';

// Mock data
{/*const mockEstablishments = [
  {
    id: 1,
    name: "Tech Academy",
    logo: "🎓",
    location: "Paris, France",
    type: "Université",
    status: "connected",
    certificatesCount: 3,
    description: "École spécialisée en technologies web et développement logiciel",
    website: "https://tech-academy.fr",
    connectionDate: "Jan 2024"
  },
  {
    id: 2,
    name: "Design Institute",
    logo: "🎨",
    location: "Lyon, France",
    type: "École privée",
    status: "connected",
    certificatesCount: 1,
    description: "Institut de design reconnu pour ses formations UX/UI",
    website: "https://design-institute.fr",
    connectionDate: "Déc 2023"
  },
  {
    id: 3,
    name: "Business School Paris",
    logo: "📊",
    location: "Paris, France",
    type: "Grande école",
    status: "pending",
    certificatesCount: 0,
    description: "École de commerce et management reconnue",
    website: "https://business-school.fr",
    connectionDate: "Mar 2024"
  },
  {
    id: 4,
    name: "Data University",
    logo: "📈",
    location: "Toulouse, France",
    type: "Université",
    status: "connected",
    certificatesCount: 2,
    description: "Université spécialisée en science des données et IA",
    website: "https://data-university.fr",
    connectionDate: "Oct 2023"
  }
];*/}



interface EstablishmentsScreenProps {
  onNavigate: (screen: string) => void;
}

//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';

interface Liaison {
  id: number;
  statutLiaison: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE' | 'SUSPENDU';
  dateDemande: string;
  dateApprobation?: string;
  messageDemande?: string;
  etablissement: {
    id_etablissement: number;
    nomEtablissement: string;
    typeEtablissement: string;
    adresseEtablissement: string;
    telephoneEtablissement: string;
    emailEtablissement: string;
  };
}

// Interface pour les établissements récupérés depuis l'API
interface Establishment {
  id_etablissement: number;
  nomEtablissement: string;
  emailEtablissement: string;
  statut: string;
  dateCreation: string;
  nomResponsableEtablissement: string;
  telephoneEtablissement: string;
  adresseEtablissement: string;
  typeEtablissement: string;
  documents: Array<{
    id: number;
    typeDocument: string;
    nomFichier: string;
    cheminFichier: string;
    dateUpload: string;
  }>;
}

  {/*interface StatsLiaisons {
    totalDemandes: number;
    demandesEnAttente: number;
    etudiantsApprouves: number;
    demandesRejetees: number;
    tauxApprobation: number;
  }*/}

export function EstablishmentsScreen({ onNavigate }: EstablishmentsScreenProps) {
  //const { user } = useUser();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
  const [searchQuery, setSearchQuery] = useState('');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [liaisons, setLiaisons] = useState<Liaison[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  //const [stats, setStats] = useState<StatsLiaisons | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [error, setError] = useState<string>('');

  // Charger les liaisons de l'apprenant et les établissements
  useEffect(() => {
    loadLiaisons();
    loadEstablishments();
  }, []);

  const loadLiaisons = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE}/apprenant/liaisons`, {
        headers: authService.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des liaisons');
      }
      
      const data = await response.json();
      setLiaisons(data.data);
    } catch (err) {
      setError(t('establishments.loadError'));
      console.error('Erreur chargement liaisons:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEstablishments = async () => {
    try {
      setLoadingEstablishments(true);
      
      const response = await fetch(`${API_BASE}/accueil/etablissements`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des établissements');
      }
      
      const data = await response.json();
      // Filtrer pour ne garder que les établissements actifs
      const activeEstablishments = data.data.filter((etab: Establishment) => 
        etab.statut === 'ACTIF'
      );
      setEstablishments(activeEstablishments);
    } catch (err) {
      console.error('Erreur chargement établissements:', err);
    } finally {
      setLoadingEstablishments(false);
    }
  };

  const filteredLiaisons = liaisons.filter(liaison =>
    liaison.etablissement.nomEtablissement.toLowerCase().includes(searchQuery.toLowerCase()) ||
    liaison.etablissement.typeEtablissement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnectionRequest = async () => {
    if (!selectedEstablishment) return;
    
    try {
      // Trouver l'établissement sélectionné pour obtenir son ID
      const establishment = establishments.find(est => est.nomEtablissement === selectedEstablishment);
      if (!establishment) {
        throw new Error('Établissement non trouvé');
      }
      
      const response = await fetch(`${API_BASE}/liaison/demande`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          etablissementId: establishment.id_etablissement,
          messageDemande: requestMessage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'envoi de la demande');
      }
      
      const data = await response.json();
      console.log('Demande envoyée:', data);
      
      // Recharger les liaisons
      await loadLiaisons();
      
      // Fermer le dialog et réinitialiser
      setIsRequestDialogOpen(false);
      setSelectedEstablishment('');
      setRequestMessage('');
      
      // TODO: Afficher un toast de succès
    } catch (err) {
      setError(err instanceof Error ? err.message : t('establishments.sendError'));
      console.error('Erreur envoi demande:', err);
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'APPROUVE':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t('establishments.statusConnected')}
          </Badge>
        );
      case 'EN_ATTENTE':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {t('establishments.statusPending')}
          </Badge>
        );
      case 'REJETE':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {t('establishments.statusRejected')}
          </Badge>
        );
      case 'SUSPENDU':
        return (
          <Badge variant="outline" className="border-orange-200 text-orange-700">
            <Clock className="mr-1 h-3 w-3" />
            {t('establishments.statusSuspended')}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculer les statistiques
  const statsCalculated = {
    totalLiaisons: liaisons.length,
    liaisonsApprouvees: liaisons.filter(l => l.statutLiaison === 'APPROUVE').length,
    demandesEnAttente: liaisons.filter(l => l.statutLiaison === 'EN_ATTENTE').length,
    liaisonsRejetees: liaisons.filter(l => l.statutLiaison === 'REJETE').length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">{t('establishments.title')}</h1>
          <p className="text-muted-foreground">{t('establishments.subtitle')}</p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              {t('establishments.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('establishments.requestTitle')}</DialogTitle>
              <DialogDescription>
                {t('establishments.requestDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="establishment">{t('establishments.establishmentLabel')}</Label>
                <Select value={selectedEstablishment} onValueChange={setSelectedEstablishment}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingEstablishments 
                        ? t('establishments.loadingEstablishments')
                        : t('establishments.selectEstablishment')
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingEstablishments ? (
                      <SelectItem value="" disabled>
                        {t('establishments.loadingShort')}
                      </SelectItem>
                    ) : establishments.length === 0 ? (
                      <SelectItem value="" disabled>
                        {t('establishments.noneAvailable')}
                      </SelectItem>
                    ) : (
                      establishments.map((est) => (
                        <SelectItem key={est.id_etablissement} value={est.nomEtablissement}>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <Building2 className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{est.nomEtablissement}</div>
                              <div className="text-xs text-muted-foreground">{est.typeEtablissement}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">{t('establishments.messageOptional')}</Label>
                <Textarea
                  id="message"
                  placeholder={t('establishments.messagePlaceholder')}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleConnectionRequest} disabled={!selectedEstablishment}>
                  <Send className="mr-2 h-4 w-4" />
                  {t('establishments.send')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('establishments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsCalculated.liaisonsApprouvees}</p>
                <p className="text-sm text-muted-foreground">{t('establishments.statConnected')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsCalculated.demandesEnAttente}</p>
                <p className="text-sm text-muted-foreground">{t('establishments.statPending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsCalculated.totalLiaisons}</p>
                <p className="text-sm text-muted-foreground">{t('establishments.statTotal')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statsCalculated.totalLiaisons > 0 
                    ? Math.round((statsCalculated.liaisonsApprouvees / statsCalculated.totalLiaisons) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">{t('establishments.statApprovalRate')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Establishments List */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t('establishments.myEstablishments')}</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">{t('establishments.loadingEstablishments')}</p>
          </div>
        ) : filteredLiaisons.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">
              {searchQuery ? t('establishments.noneFoundSearch') : t('establishments.noneLinked')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery 
                ? t('establishments.modifySearch')
                : t('establishments.startRequest')
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsRequestDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('establishments.makeRequest')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLiaisons.map((liaison) => (
              <Card key={liaison.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{liaison.etablissement.nomEtablissement}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <MapPin className="mr-1 h-3 w-3" />
                          {liaison.etablissement.adresseEtablissement}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(liaison.statutLiaison)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="outline" className="text-xs mb-2">
                      {liaison.etablissement.typeEtablissement}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {liaison.etablissement.emailEtablissement}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{t('establishments.requestedOn', { date: new Date(liaison.dateDemande).toLocaleDateString(dateLocale) })}</span>
                    </div>
                    {liaison.dateApprobation && (
                      <span className="text-muted-foreground">
                        {t('establishments.approvedOn', { date: new Date(liaison.dateApprobation).toLocaleDateString(dateLocale) })}
                      </span>
                    )}
                  </div>

                  {liaison.messageDemande && (
                    <div className="p-3 bg-accent/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">{t('establishments.messageSent')}</p>
                      <p className="text-sm">{liaison.messageDemande}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`mailto:${liaison.etablissement.emailEtablissement}`}>
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t('establishments.contact')}
                      </a>
                    </Button>
                    {liaison.statutLiaison === 'APPROUVE' && (
                      <Button size="sm" onClick={() => onNavigate('certificates')}>
                        {t('establishments.viewCertificates')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Establishments */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('establishments.availableEstablishments')}</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
            {t('establishments.viewAll')}
          </Button>
        </div>
        {loadingEstablishments ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('establishments.loadingEstablishments')}</p>
          </div>
        ) : establishments.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">{t('establishments.noneAvailable')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('establishments.noneActive')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {establishments
              .filter(est => !liaisons.some(liaison => liaison.etablissement.id_etablissement === est.id_etablissement))
              .slice(0, 6)
              .map((establishment) => (
                <Card key={establishment.id_etablissement} className="group hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{establishment.nomEtablissement}</h4>
                          <p className="text-xs text-muted-foreground">{establishment.typeEtablissement}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedEstablishment(establishment.nomEtablissement);
                          setIsRequestDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}