import { useUser } from '../../hooks/useUser';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  Award, 
  Eye, 
  QrCode, 
  Building2, 
  Plus, 
  TrendingUp,
  Calendar,
  Download,
  Share2,
  MoreHorizontal,
  Bell
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface DashboardScreenProps {
  hasData?: boolean;
  onNavigate: (screen: string) => void;
}

// Mock data
const mockCertificates = [
  {
    id: 1,
    title: "Certification React Advanced",
    institution: "Tech Academy",
    date: "15 Jan 2024",
    status: "verified",
    views: 24,
    color: "bg-primary"
  },
  {
    id: 2,
    title: "UX/UI Design Professional",
    institution: "Design Institute",
    date: "08 Déc 2023",
    status: "verified",
    views: 15,
    color: "bg-chart-2"
  },
  {
    id: 3,
    title: "Project Management PMP",
    institution: "Business School",
    date: "22 Nov 2023",
    status: "pending",
    views: 3,
    color: "bg-chart-4"
  }
];

const mockStats = [
  {
    title: "Certificats",
    value: "12",
    description: "+2 ce mois",
    icon: Award,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    title: "Vérifications",
    value: "156",
    description: "+23% vs mois dernier",
    icon: Eye,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10"
  },
  {
    title: "QR Scans",
    value: "89",
    description: "+12 cette semaine",
    icon: QrCode,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10"
  },
  {
    title: "Établissements",
    value: "5",
    description: "3 validés",
    icon: Building2,
    color: "text-chart-5",
    bgColor: "bg-chart-5/10"
  }
];

const mockNotifications = [
  {
    id: 1,
    title: "Nouveau certificat disponible",
    description: "React Advanced - Tech Academy",
    time: "Il y a 2h",
    type: "success"
  },
  {
    id: 2,
    title: "Demande de vérification",
    description: "3 nouvelles vérifications",
    time: "Il y a 5h",
    type: "info"
  }
];

export function DashboardScreen({ hasData = true, onNavigate }: DashboardScreenProps) {
  const { user } = useUser();
  
  // Générer le nom d'affichage
  const getDisplayName = () => {
    if (user) {
      if (user.role === 'establishment') {
        return user.nom || 'Établissement';
      } else {
        return `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur';
      }
    }
    return 'Utilisateur';
  };

  //const [selectedPeriod, setSelectedPeriod] = useState("30d");

  if (!hasData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-2xl mb-6">
            <Award className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Commencez votre parcours</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Vous n'avez pas encore de certificats. Connectez-vous à vos établissements 
            d'apprentissage pour commencer à collecter vos credentials.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto mb-8">
            <Card className="p-6 text-left hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('establishments')}>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Ajouter un établissement</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Connectez-vous à vos écoles et universités
              </p>
            </Card>
            
            <Card className="p-6 text-left hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('requests')}>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-chart-2/10 rounded-lg flex items-center justify-center">
                  <Plus className="h-5 w-5 text-chart-2" />
                </div>
                <h3 className="font-semibold">Demander un certificat</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Faites une demande de certificat directement
              </p>
            </Card>
          </div>

          <Button onClick={() => onNavigate('establishments')} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Commencer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Bonjour, {getDisplayName()} ! 👋</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Voici un aperçu de vos certificats</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto">
            <Calendar className="mr-2 h-4 w-4" />
            Derniers 30 jours
          </Button>
          <Button size="sm" className="rounded-xl w-full sm:w-auto" onClick={() => onNavigate('requests')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau certificat
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {mockStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium">{stat.title}</CardTitle>
                <div className={`w-8 h-8 lg:w-10 lg:h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl lg:text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Recent Certificates */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Certificats récents</CardTitle>
                  <CardDescription>Vos derniers achievements</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate('certificates')}>
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockCertificates.map((cert, index) => (
                <div key={cert.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${cert.color}/10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Award className={`h-5 w-5 sm:h-6 sm:w-6 ${cert.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate text-sm sm:text-base">{cert.title}</h4>
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                        <span>{cert.institution}</span>
                        <span>•</span>
                        <span>{cert.date}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                      <Badge variant={cert.status === 'verified' ? 'default' : 'secondary'} className="w-full sm:w-auto text-center">
                        {cert.status === 'verified' ? 'Vérifié' : 'En attente'}
                      </Badge>
                      <div className="flex items-center justify-center sm:justify-start text-xs sm:text-sm text-muted-foreground">
                        <Eye className="mr-1 h-3 w-3" />
                        {cert.views}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <QrCode className="mr-2 h-4 w-4" />
                            QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {index < mockCertificates.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Activité mensuelle</CardTitle>
              <CardDescription className="text-xs lg:text-sm">Vérifications de vos certificats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 lg:space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span>Cette semaine</span>
                    <span className="font-semibold">23</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span>Semaine dernière</span>
                    <span className="font-semibold">18</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span>Il y a 2 semaines</span>
                    <span className="font-semibold">31</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base lg:text-lg">Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('notifications')}>
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              {mockNotifications.map((notification, index) => (
                <div key={notification.id} className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className={`mt-1 w-2 h-2 rounded-full ${
                      notification.type === 'success' ? 'bg-primary' : 'bg-chart-2'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs lg:text-sm font-medium">{notification.title}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground">{notification.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  </div>
                  {index < mockNotifications.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}