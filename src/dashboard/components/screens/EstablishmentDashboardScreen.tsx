import { useUser } from '../../hooks/useUser';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
//import { Badge } from '../ui/badge';
//import { Progress } from '../ui/progress';
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
  Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EstablishmentDashboardScreenProps {
  hasData?: boolean;
  onNavigate: (screen: string) => void;
}

export function EstablishmentDashboardScreen({ hasData = true, onNavigate }: EstablishmentDashboardScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

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

  // Mock data
  const stats = {
    certificatesIssued: hasData ? 247 : 0,
    totalVerifications: hasData ? 1523 : 0,
    activeStudents: hasData ? 89 : 0,
    pendingRequests: hasData ? 7 : 0
  };

  const chartData = hasData ? [
    { name: 'Jan', verifications: 65 },
    { name: 'Fév', verifications: 89 },
    { name: 'Mar', verifications: 123 },
    { name: 'Avr', verifications: 134 },
    { name: 'Mai', verifications: 167 },
    { name: 'Jun', verifications: 189 },
  ] : [];

  const pendingRequests = hasData ? [
    { id: 1, name: 'Marie Dubois', course: 'Master Marketing Digital', date: '2024-01-15', status: 'pending' },
    { id: 2, name: 'Jean Martin', course: 'Formation Leadership', date: '2024-01-14', status: 'pending' },
    { id: 3, name: 'Sophie Laurent', course: 'Certification Agile', date: '2024-01-13', status: 'pending' }
  ] : [];

  const recentActivity = hasData ? [
    { id: 1, type: 'certificate', title: 'Certificat émis pour Alice Thompson', subtitle: 'Master en Marketing Digital', time: '2h', status: 'issued' },
    { id: 2, type: 'verification', title: 'Vérification blockchain confirmée', subtitle: 'Certificat #2547', time: '4h', status: 'verified' },
    { id: 3, type: 'student', title: 'Nouvel étudiant lié', subtitle: 'Thomas Wilson', time: '1j', status: 'linked' }
  ] : [];

  if (!hasData) {
    return (
      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Établissement</h1>
            <p className="text-muted-foreground">Bienvenue ! Commencez par configurer votre première émission de certificat.</p>
          </div>
        </div>

        {/* Empty State Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Certificats émis</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
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
            <CardTitle>Besoin d'aide pour commencer ?</CardTitle>
            <CardDescription>
              Découvrez comment tirer le meilleur parti de CertifiED pour votre établissement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 rounded-xl flex flex-col items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <span>Guide de démarrage</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 rounded-xl flex flex-col items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <span>Tutoriel vidéo</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 rounded-xl flex flex-col items-center gap-2">
                <Download className="h-6 w-6 text-primary" />
                <span>Ressources</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard {getDisplayName()}</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité et gestion des certificats</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => onNavigate('create-certificate')} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau certificat
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Certificats émis ce mois</p>
                <p className="text-3xl font-bold">{stats.certificatesIssued}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+12%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Demandes en attente
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('students')}>
                Voir tout
              </Button>
            </div>
            <CardDescription>
              Étudiants souhaitant se lier à votre établissement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">{request.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-muted-foreground">{request.course}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg">
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="rounded-lg">
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Activité récente
            </CardTitle>
            <CardDescription>
              Dernières actions effectuées sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.type === 'certificate' ? 'bg-primary/10 text-primary' :
                  activity.type === 'verification' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {activity.type === 'certificate' && <Award className="h-5 w-5" />}
                  {activity.type === 'verification' && <Eye className="h-5 w-5" />}
                  {activity.type === 'student' && <Users className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Évolution des vérifications</CardTitle>
              <CardDescription>Nombre de vérifications de certificats sur les derniers mois</CardDescription>
            </div>
            <div className="flex gap-2">
              {['7d', '30d', '90d'].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className="rounded-lg"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
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