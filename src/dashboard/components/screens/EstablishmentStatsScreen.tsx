import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  Award, 
  Eye, 
  Users,
  Globe,
  BarChart3,
  Activity,
  MapPin,
  Trophy,
  Zap,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell
} from 'recharts';
import { api } from '../../../services/api';
import { useUser } from '../../hooks/useUser';

interface EstablishmentStatsScreenProps {
  onNavigate: (screen: string) => void;
}

interface StatsData {
  totalCertificates: number;
  totalStudents: number;
  totalVerifications: number;
  certificatesByStatus: Record<string, number>;
  certificatesByFormation: Array<{
    formationName: string;
    count: number;
  }>;
  monthlyStats: Array<{
    month: string;
    certificates: number;
    verifications: number;
  }>;
  topVerifiedCertificates: Array<{
    id: number;
    titre: string;
    verificationCount: number;
  }>;
}

export function EstablishmentStatsScreen({ onNavigate }: EstablishmentStatsScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('verifications');
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useUser();

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Charger les statistiques de l'établissement
      const response = await api.get(`/etablissement/${user.id}/stats?period=${selectedPeriod}`);
      
      if (response.success) {
        setStatsData(response.data);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Erreur chargement stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPeriod]);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, user?.id]);

  const handleExportStats = () => {
    if (!statsData) return;
    
    const csvData = [
      ['Métrique', 'Valeur'],
      ['Total Certificats', statsData.totalCertificates],
      ['Total Étudiants', statsData.totalStudents],
      ['Total Vérifications', statsData.totalVerifications],
      ['', ''],
      ['Certificats par Statut', ''],
      ...Object.entries(statsData.certificatesByStatus).map(([status, count]) => [status, count]),
      ['', ''],
      ['Certificats par Formation', ''],
      ...statsData.certificatesByFormation.map(({ formationName, count }) => [formationName, count])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-etablissement-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Chargement des statistiques...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadStats} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Aucune donnée disponible</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculer les statistiques dérivées à partir de statsData
  const stats = statsData ? {
    totalCertificates: statsData.totalCertificates,
    totalVerifications: statsData.totalVerifications,
    activeStudents: statsData.totalStudents,
    verificationRate: statsData.totalCertificates > 0 
      ? ((statsData.totalVerifications / statsData.totalCertificates) * 100).toFixed(1) 
      : 0,
    avgVerificationTime: 2.3, // TODO: Calculer depuis le backend si nécessaire
    topCountry: 'Cameroun' // TODO: Implémenter la géolocalisation si nécessaire
  } : {
    totalCertificates: 0,
    totalVerifications: 0,
    activeStudents: 0,
    verificationRate: 0,
    avgVerificationTime: 0,
    topCountry: 'N/A'
  };

  // Utiliser les données réelles de l'API
  const timeSeriesData = statsData?.monthlyStats || [];
  
  const topCertificates = statsData?.topVerifiedCertificates.map((cert, index, arr) => ({
    name: cert.titre,
    verifications: cert.verificationCount,
    growth: index > 0 
      ? Math.round(((cert.verificationCount - arr[index - 1].verificationCount) / arr[index - 1].verificationCount) * 100)
      : 0
  })) || [];

  // Données géographiques (mock pour l'instant - nécessite une implémentation de géolocalisation)
  const geographicData = [
    { name: 'Cameroun', value: 65, color: '#f43f5e' },
    { name: 'France', value: 15, color: '#ec4899' },
    { name: 'Gabon', value: 10, color: '#8b5cf6' },
    { name: 'RDC', value: 7, color: '#06b6d4' },
    { name: 'Autres', value: 3, color: '#10b981' }
  ];

  // Données mensuelles pour le graphique en barres
  const monthlyData = statsData?.monthlyStats.map(stat => ({
    name: stat.month,
    value: stat.verifications
  })) || [];

  const periods = [
    { value: '7d', label: '7 derniers jours' },
    { value: '30d', label: '30 derniers jours' },
    { value: '90d', label: '3 derniers mois' },
    { value: '1y', label: 'Dernière année' }
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistiques & Rapports</h1>
          <p className="text-muted-foreground">
            Analysez les performances de vos certificats et l'engagement de vos étudiants
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="rounded-xl" onClick={handleExportStats}>
            <Download className="h-4 w-4 mr-2" />
            Exporter le rapport PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Certificats émis</p>
                <p className="text-3xl font-bold">{stats.totalCertificates}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+18% ce mois</span>
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
                <p className="text-sm text-muted-foreground">Vérifications totales</p>
                <p className="text-3xl font-bold">{stats.totalVerifications}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+12% ce mois</span>
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
                <p className="text-sm text-muted-foreground">Taux de vérification</p>
                <p className="text-3xl font-bold">{stats.verificationRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">+3.2% ce mois</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temps moyen de vérif.</p>
                <p className="text-3xl font-bold">{stats.avgVerificationTime}s</p>
                <div className="flex items-center gap-1 mt-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600">Très rapide</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Évolution des métriques</CardTitle>
                <CardDescription>Suivi des performances sur les derniers mois</CardDescription>
              </div>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-40 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verifications">Vérifications</SelectItem>
                  <SelectItem value="certificates">Certificats</SelectItem>
                  <SelectItem value="students">Étudiants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
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
                  <Area
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Répartition géographique
            </CardTitle>
            <CardDescription>Origine des vérifications de certificats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Tooltip />
                  <RechartsPieChart data={geographicData}>
                    {geographicData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RechartsPieChart>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {geographicData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.value}%</span>
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Certificates */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Top 5 des certificats les plus vérifiés
          </CardTitle>
          <CardDescription>
            Classement de vos certificats par nombre de vérifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCertificates.map((certificate, index) => (
              <div key={certificate.name} className="flex items-center justify-between p-4 border border-border rounded-xl">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-600' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium">{certificate.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {certificate.verifications} vérifications
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={certificate.growth > 0 ? 'default' : certificate.growth < 0 ? 'destructive' : 'secondary'}>
                    {certificate.growth > 0 ? '+' : ''}{certificate.growth}%
                  </Badge>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(certificate.verifications / topCertificates[0].verifications) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Évolution mensuelle</CardTitle>
          <CardDescription>
            Évolution du nombre de vérifications par mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
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
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Explorez vos données plus en détail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 rounded-xl flex flex-col items-center gap-2"
              onClick={() => onNavigate('certificates')}
            >
              <Award className="h-6 w-6 text-primary" />
              <span>Voir tous les certificats</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 rounded-xl flex flex-col items-center gap-2"
              onClick={() => onNavigate('students')}
            >
              <Users className="h-6 w-6 text-primary" />
              <span>Gérer les étudiants</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 rounded-xl flex flex-col items-center gap-2"
            >
              <Calendar className="h-6 w-6 text-primary" />
              <span>Planifier un rapport</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}