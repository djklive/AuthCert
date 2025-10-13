import { useUser } from '../../hooks/useUser';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { WalletCard } from '../WalletCard';
import { 
  Users, 
  Award, 
  Eye, 
  Clock, 
  Plus, 
  TrendingUp, 
  UserPlus,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../../services/api';

interface EstablishmentDashboardScreenProps {
  hasData?: boolean;
  onNavigate: (screen: string) => void;
}

interface DashboardData {
  stats: {
    certificatesIssued: number;
    totalVerifications: number;
    activeStudents: number;
    pendingRequests: number;
  };
  pendingRequests: Array<{
    id: number;
    name: string;
    email: string;
    date: string;
    status: string;
  }>;
  recentActivity: Array<{
    type: string;
    titre: string;
    description: string;
    timeAgo: string;
    statut: string;
  }>;
  chartData: Array<{
    name: string;
    verifications: number;
  }>;
}

export function EstablishmentDashboardScreen({ hasData = true, onNavigate }: EstablishmentDashboardScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Charger les données du dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      const establishmentId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      const response = await api.getEstablishmentDashboard(establishmentId);
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement du dashboard');
      }
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Utiliser les données réelles ou des valeurs par défaut
  const stats = dashboardData?.stats || {
    certificatesIssued: 0,
    totalVerifications: 0,
    activeStudents: 0,
    pendingRequests: 0
  };

  const chartData = dashboardData?.chartData || [];
  const pendingRequests = dashboardData?.pendingRequests || [];
  const recentActivity = dashboardData?.recentActivity || [];

  // État de chargement
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Chargement du dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadDashboardData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasData && (!dashboardData || stats.certificatesIssued === 0)) {
    return (
      <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Dashboard Établissement</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Bienvenue ! Commencez par configurer votre première émission de certificat.</p>
          </div>
        </div>

        {/* Empty State Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card className="rounded-2xl">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Certificats émis</p>
                  <p className="text-2xl lg:text-3xl font-bold">0</p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Award className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vérifications</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Étudiants actifs</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Demandes en attente</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Card */}
        <WalletCard className="rounded-2xl" />

        {/* Getting Started Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Lier vos premiers étudiants
              </CardTitle>
              <CardDescription>
                Commencez par établir des liens avec vos étudiants pour pouvoir leur émettre des certificats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => onNavigate('students')} className="w-full rounded-xl">
                <UserPlus className="h-4 w-4 mr-2" />
                Gérer les étudiants
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-green-200 bg-gradient-to-br from-green-50 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                Créer votre premier certificat
              </CardTitle>
              <CardDescription>
                Une fois vos étudiants liés, vous pourrez leur émettre des certificats numériques sécurisés.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => onNavigate('create-certificate')} variant="outline" className="w-full rounded-xl border-green-200 text-green-700 hover:bg-green-50">
                <Plus className="h-4 w-4 mr-2" />
                Créer un certificat
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base lg:text-lg">Besoin d'aide pour commencer ?</CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              Découvrez comment tirer le meilleur parti de CertifiED pour votre établissement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 lg:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              <Button variant="outline" className="h-auto p-3 lg:p-4 rounded-xl flex flex-col items-center gap-2">
                <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                <span className="text-xs lg:text-sm">Guide de démarrage</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 lg:p-4 rounded-xl flex flex-col items-center gap-2">
                <Users className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                <span className="text-xs lg:text-sm">Tutoriel vidéo</span>
              </Button>
              <Button variant="outline" className="h-auto p-3 lg:p-4 rounded-xl flex flex-col items-center gap-2">
                <Download className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                <span className="text-xs lg:text-sm">Ressources</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Dashboard {getDisplayName()}</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Vue d'ensemble de votre activité et gestion des certificats</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" className="rounded-xl w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => onNavigate('create-certificate')} className="rounded-xl w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau certificat
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">Certificats émis ce mois</p>
                <p className="text-2xl lg:text-3xl font-bold">{stats.certificatesIssued}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                  <span className="text-xs lg:text-sm text-green-600">+12%</span>
                </div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Award className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total vérifications</p>
                <p className="text-3xl font-bold">{stats.totalVerifications}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+8%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Étudiants actifs</p>
                <p className="text-3xl font-bold">{stats.activeStudents}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+5%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-orange-200 bg-gradient-to-br from-orange-50 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Demandes en attente</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingRequests}</p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm text-orange-600 mt-2"
                  onClick={() => onNavigate('students')}
                >
                  Traiter les demandes →
                </Button>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Pending Requests */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
                Demandes en attente
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('students')}>
                Voir tout
              </Button>
            </div>
            <CardDescription className="text-xs lg:text-sm">
              Étudiants souhaitant se lier à votre établissement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 lg:space-y-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border rounded-xl gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium">{request.name.split(' ').map((n: string) => n[0]).join('')}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm lg:text-base truncate">{request.name}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">{request.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-lg w-1/2 sm:w-auto"
                      onClick={() => onNavigate('students')}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      className="rounded-lg w-1/2 sm:w-auto"
                      onClick={() => onNavigate('students')}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Aucune demande en attente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet Card */}
        <WalletCard className="rounded-2xl" />

        {/* Recent Activity */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
              Activité récente
            </CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              Dernières actions effectuées sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 lg:space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'certificate' ? 'bg-primary/10 text-primary' :
                    activity.type === 'verification' ? 'bg-blue-100 text-blue-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {activity.type === 'certificate' && <Award className="h-4 w-4 sm:h-5 sm:w-5" />}
                    {activity.type === 'verification' && <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    {activity.type === 'student' && <Users className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm lg:text-base truncate">{activity.titre}</p>
                    <p className="text-xs lg:text-sm text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs lg:text-sm text-muted-foreground">{activity.timeAgo}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Aucune activité récente
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-base lg:text-lg">Évolution des vérifications</CardTitle>
              <CardDescription className="text-xs lg:text-sm">Nombre de vérifications de certificats sur les derniers mois</CardDescription>
            </div>
            <div className="flex gap-2">
              {['7d', '30d', '90d'].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className="rounded-lg text-xs lg:text-sm"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-60 lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="verifications" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}