import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Building2, 
  MapPin, 
  Award, 
  Plus, 
  Search, 
  ExternalLink, 
  Clock,
  CheckCircle,
  XCircle,
  Send
} from 'lucide-react';

// Mock data
const mockEstablishments = [
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
];

const popularEstablishments = [
  { name: "Université Sorbonne", logo: "🏛️", type: "Université publique" },
  { name: "ENSIMAG", logo: "⚙️", type: "École d'ingénieur" },
  { name: "HEC Paris", logo: "💼", type: "Grande école" },
  { name: "Coursera", logo: "💻", type: "Plateforme en ligne" },
  { name: "OpenClassrooms", logo: "📚", type: "Formation en ligne" }
];

interface EstablishmentsScreenProps {
  onNavigate: (screen: string) => void;
}

export function EstablishmentsScreen({ onNavigate }: EstablishmentsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedEstablishment, setSelectedEstablishment] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const filteredEstablishments = mockEstablishments.filter(est =>
    est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    est.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnectionRequest = () => {
    // Simulate request submission
    setIsRequestDialogOpen(false);
    setSelectedEstablishment('');
    setRequestMessage('');
    // Show success toast
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Connecté
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Refusé
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Établissements</h1>
          <p className="text-muted-foreground">Gérez vos connexions avec les établissements d'enseignement</p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un établissement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Demande de connexion</DialogTitle>
              <DialogDescription>
                Demandez à être connecté à un établissement pour recevoir vos certificats
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="establishment">Établissement</Label>
                <Select value={selectedEstablishment} onValueChange={setSelectedEstablishment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un établissement" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularEstablishments.map((est, index) => (
                      <SelectItem key={index} value={est.name}>
                        <div className="flex items-center space-x-2">
                          <span>{est.logo}</span>
                          <div>
                            <div className="font-medium">{est.name}</div>
                            <div className="text-xs text-muted-foreground">{est.type}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Message (optionnel)</Label>
                <Textarea
                  id="message"
                  placeholder="Expliquez votre demande de connexion..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleConnectionRequest} disabled={!selectedEstablishment}>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer la demande
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
              placeholder="Rechercher un établissement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-muted-foreground">Établissements connectés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">6</p>
                <p className="text-sm text-muted-foreground">Certificats reçus</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-muted-foreground">Demande en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Establishments List */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Mes établissements</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEstablishments.map((establishment) => (
            <Card key={establishment.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{establishment.logo}</div>
                    <div>
                      <CardTitle className="text-lg">{establishment.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="mr-1 h-3 w-3" />
                        {establishment.location}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(establishment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge variant="outline" className="text-xs mb-2">
                    {establishment.type}
                  </Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {establishment.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Award className="h-3 w-3" />
                    <span>{establishment.certificatesCount} certificat{establishment.certificatesCount !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-muted-foreground">Connecté en {establishment.connectionDate}</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" size="sm" asChild>
                    <a href={establishment.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Site web
                    </a>
                  </Button>
                  {establishment.status === 'connected' && (
                    <Button size="sm" onClick={() => onNavigate('certificates')}>
                      Voir certificats
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Popular Establishments */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Établissements populaires</h2>
          <Button variant="ghost" size="sm">
            Voir tous
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {popularEstablishments.map((establishment, index) => (
            <Card key={index} className="group hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">{establishment.logo}</div>
                    <div>
                      <h4 className="font-semibold">{establishment.name}</h4>
                      <p className="text-xs text-muted-foreground">{establishment.type}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setIsRequestDialogOpen(true)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}