import { useUser } from '../../hooks/useUser';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  Bell,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { api } from '../../../services/api';

interface DashboardScreenProps {
  hasData?: boolean;
  onNavigate: (screen: string) => void;
}

interface DashboardData {
  stats: {
    totalCertificates: number;
    certificatesIssued: number;
    totalVerifications: number;
    recentVerifications: number;
    linkedEstablishments: number;
    pendingRequests: number;
  };
  recentCertificates: Array<{
    id: number;
    titre: string;
    etablissement: string;
    dateObtention: string;
    statut: string;
    verifications: number;
  }>;
  recentNotifications: Array<{
    id: number;
    titre: string;
    message: string;
    lu: boolean;
    important: boolean;
    type: string;
    timeAgo: string;
  }>;
  activityData: Array<{
    month: string;
    certificates: number;
    verifications: number;
  }>;
}

export function DashboardScreen({ hasData = true, onNavigate }: DashboardScreenProps) {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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

      const studentId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      const response = await api.getStudentDashboard(studentId);
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement du dashboard');
      }
    } catch (err) {
      setError(t('common.loadDataError'));
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Utiliser les données réelles ou des valeurs par défaut
  const stats = dashboardData?.stats || {
    totalCertificates: 0,
    certificatesIssued: 0,
    totalVerifications: 0,
    recentVerifications: 0,
    linkedEstablishments: 0,
    pendingRequests: 0
  };

  const recentCertificates = dashboardData?.recentCertificates || [];
  const recentNotifications = dashboardData?.recentNotifications || [];

  // État de chargement
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{t('dashboard.loading')}</p>
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
              {t('dashboard.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  //const [selectedPeriod, setSelectedPeriod] = useState("30d");

  if (!hasData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-2xl mb-6">
            <Award className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-4">{t('dashboard.emptyTitle')}</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {t('dashboard.emptyDesc')}
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto mb-8">
            <Card className="p-6 text-left hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('establishments')}>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{t('dashboard.addEstablishment')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.addEstablishmentDesc')}
              </p>
            </Card>
            
            <Card className="p-6 text-left hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('requests')}>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-chart-2/10 rounded-lg flex items-center justify-center">
                  <Plus className="h-5 w-5 text-chart-2" />
                </div>
                <h3 className="font-semibold">{t('dashboard.requestCertificate')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.requestCertificateDesc')}
              </p>
            </Card>
          </div>

          <Button onClick={() => onNavigate('establishments')} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.start')}
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
          <h1 className="text-2xl lg:text-3xl font-bold">{t('dashboard.greeting', { name: getDisplayName() })}</h1>
          <p className="text-sm lg:text-base text-muted-foreground">{t('dashboard.greetingSub')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto">
            <Calendar className="mr-2 h-4 w-4" />
            {t('dashboard.last30days')}
          </Button>
          <Button size="sm" className="rounded-xl w-full sm:w-auto" onClick={() => onNavigate('requests')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.newCertificate')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">{t('dashboard.statCertificates')}</CardTitle>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Award className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{stats.totalCertificates}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="mr-1 h-3 w-3" />
              {t('dashboard.statIssued', { count: stats.certificatesIssued })}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">{t('dashboard.statVerifications')}</CardTitle>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-chart-2/10 rounded-lg flex items-center justify-center">
              <Eye className="h-4 w-4 lg:h-5 lg:w-5 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{stats.totalVerifications}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="mr-1 h-3 w-3" />
              {t('dashboard.statThisMonth', { count: stats.recentVerifications })}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">{t('dashboard.statEstablishments')}</CardTitle>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-chart-5/10 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-chart-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{stats.linkedEstablishments}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="mr-1 h-3 w-3" />
              {t('dashboard.statPendingRequests', { count: stats.pendingRequests })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Recent Certificates */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('dashboard.recentCerts')}</CardTitle>
                  <CardDescription>{t('dashboard.recentCertsDesc')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate('certificates')}>
                  {t('common.viewAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentCertificates.length > 0 ? (
                recentCertificates.map((cert, index) => (
                  <div key={cert.id}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate text-sm sm:text-base">{cert.titre}</h4>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                          <span>{cert.etablissement}</span>
                          <span>•</span>
                          <span>{new Date(cert.dateObtention).toLocaleDateString(dateLocale)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                        <Badge variant={cert.statut === 'EMIS' ? 'default' : 'secondary'} className="w-full sm:w-auto text-center">
                          {cert.statut === 'EMIS' ? t('certificates.statusVerified') : cert.statut === 'REVOQUE' ? t('certificates.statusRevoked') : t('dashboard.statusPending')}
                        </Badge>
                        <div className="flex items-center justify-center sm:justify-start text-xs sm:text-sm text-muted-foreground">
                          <Eye className="mr-1 h-3 w-3" />
                          {cert.verifications}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onNavigate('certificates')}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('dashboard.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              {t('common.downloadPdf')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <QrCode className="mr-2 h-4 w-4" />
                              {t('common.qrCode')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="mr-2 h-4 w-4" />
                              {t('common.share')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {index < recentCertificates.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t('dashboard.noRecentCerts')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">{t('dashboard.monthlyActivity')}</CardTitle>
              <CardDescription className="text-xs lg:text-sm">{t('dashboard.monthlyActivityDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 lg:space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span>{t('dashboard.thisWeek')}</span>
                    <span className="font-semibold">23</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span>{t('dashboard.lastWeek')}</span>
                    <span className="font-semibold">18</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs lg:text-sm">
                    <span>{t('dashboard.twoWeeksAgo')}</span>
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
                <CardTitle className="text-base lg:text-lg">{t('dashboard.notifications')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('notifications')}>
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification, index) => (
                  <div key={notification.id} className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-2 h-2 rounded-full ${
                        !notification.lu ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs lg:text-sm font-medium">{notification.titre}</p>
                        <p className="text-xs lg:text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.timeAgo}</p>
                      </div>
                    </div>
                    {index < recentNotifications.length - 1 && <Separator />}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {t('dashboard.noRecentNotifs')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}