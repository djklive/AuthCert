import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Bell, 
  Award, 
  Eye, 
  CheckCircle,
  Star,
  AlertTriangle,
  Trash2,
  Mail,
  Clock,
  XCircle,
  FileText,
  UserPlus,
  Ban,
  RefreshCw
} from 'lucide-react';
import { api } from '../../../services/api';

interface NotificationData {
  id: number;
  type: string;
  titre: string;
  message: string;
  lu: boolean;
  important: boolean;
  lienAction?: string;
  createdAt: string;
  readAt?: string;
}

interface NotificationDisplay extends NotificationData {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  timeAgo: string;
}

/*interface NotificationsScreenProps {
  onNavigate: (screen: string) => void;
}*/

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fonction pour mapper le type de notification à son icône et ses couleurs
  const getNotificationStyle = (type: string) => {
    const typeMap: Record<string, { icon: typeof Award; color: string; bgColor: string }> = {
      'NOUVEAU_CERTIFICAT': { icon: Award, color: 'text-primary', bgColor: 'bg-primary/10' },
      'VERIFICATION_CERTIFICAT': { icon: Eye, color: 'text-chart-2', bgColor: 'bg-chart-2/10' },
      'DEMANDE_LIAISON_APPRENANT': { icon: UserPlus, color: 'text-orange-600', bgColor: 'bg-orange-100' },
      'DEMANDE_LIAISON_APPROUVEE': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
      'DEMANDE_LIAISON_REJETEE': { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
      'DEMANDE_CERTIFICAT_NOUVELLE': { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
      'DEMANDE_CERTIFICAT_APPROUVEE': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
      'DEMANDE_CERTIFICAT_REJETEE': { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
      'CERTIFICAT_REVOQUE': { icon: Ban, color: 'text-red-600', bgColor: 'bg-red-100' },
      'NOUVELLE_SESSION': { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
      'SECURITE_ALERTE': { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
      'SYSTEME_MISE_A_JOUR': { icon: Star, color: 'text-purple-600', bgColor: 'bg-purple-100' },
      'ABONNEMENT_EXPIRE': { icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-100' },
      'ABONNEMENT_RENOUVELE': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' }
    };
    
    return typeMap[type] || { icon: Bell, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  // Fonction pour calculer le temps écoulé
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Il y a ${days}j`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Il y a ${months} mois`;
    return `Il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}`;
  };

  // Charger les notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.getNotifications({ limit: 50 });
      
      if (response.success) {
        // Mapper les notifications avec icônes et styles
        const mappedNotifications: NotificationDisplay[] = response.data.map((notif: NotificationData) => {
          const style = getNotificationStyle(notif.type);
          return {
            ...notif,
            ...style,
            timeAgo: getTimeAgo(notif.createdAt)
          };
        });
        
        setNotifications(mappedNotifications);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des notifications');
      }
    } catch (err) {
      setError('Erreur lors du chargement des notifications');
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.lu).length;
  const importantCount = notifications.filter(n => n.important && !n.lu).length;

  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return !notification.lu;
      case 'important':
        return notification.important;
      default:
        return true;
    }
  });

  const markAsRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      // Mettre à jour localement
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, lu: true, readAt: new Date().toISOString() } : n
      ));
    } catch (err) {
      console.error('Erreur marquage notification:', err);
    }
  };

  const markAsUnread = async (id: number) => {
    try {
      // Pour marquer comme non lu, on pourrait créer une route spécifique
      // Pour l'instant, on met à jour localement
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, lu: false, readAt: undefined } : n
      ));
    } catch (err) {
      console.error('Erreur marquage notification:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Erreur suppression notification:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ 
        ...n, 
        lu: true, 
        readAt: new Date().toISOString() 
      })));
    } catch (err) {
      console.error('Erreur marquage notifications:', err);
    }
  };

  const getTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      'NOUVEAU_CERTIFICAT': 'Certificat',
      'VERIFICATION_CERTIFICAT': 'Vérification',
      'DEMANDE_LIAISON_APPRENANT': 'Demande liaison',
      'DEMANDE_LIAISON_APPROUVEE': 'Liaison approuvée',
      'DEMANDE_LIAISON_REJETEE': 'Liaison rejetée',
      'DEMANDE_CERTIFICAT_NOUVELLE': 'Demande certificat',
      'DEMANDE_CERTIFICAT_APPROUVEE': 'Certificat approuvé',
      'DEMANDE_CERTIFICAT_REJETEE': 'Certificat rejeté',
      'CERTIFICAT_REVOQUE': 'Révocation',
      'NOUVELLE_SESSION': 'Nouvelle session',
      'SECURITE_ALERTE': 'Sécurité',
      'SYSTEME_MISE_A_JOUR': 'Système',
      'ABONNEMENT_EXPIRE': 'Abonnement',
      'ABONNEMENT_RENOUVELE': 'Abonnement'
    };
    
    return labelMap[type] || 'Notification';
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Chargement des notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Restez informé de l'activité de votre compte
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadNotifications}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Non lues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{importantCount}</p>
                <p className="text-sm text-muted-foreground">Importantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Centre de notifications</CardTitle>
          <CardDescription>Gérez toutes vos notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Toutes ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Non lues ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="important">
                Importantes ({notifications.filter(n => n.important).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'unread' 
                      ? 'Toutes vos notifications sont lues !' 
                      : 'Vous n\'avez pas de notifications pour le moment.'
                    }
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const Icon = notification.icon;
                  return (
                    <div
                      key={notification.id}
                      className={`group relative p-4 border rounded-lg transition-all hover:shadow-md ${
                        !notification.lu ? 'bg-accent/30 border-primary/20' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 ${notification.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-5 w-5 ${notification.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <h4 className={`font-semibold ${!notification.lu ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.titre}
                              </h4>
                              {notification.important && (
                                <Badge variant="destructive" className="text-xs">
                                  Important
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(notification.type)}
                              </Badge>
                            </div>
                            {!notification.lu && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          <p className="text-xs text-muted-foreground">
                            {notification.timeAgo}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.lu ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              title="Marquer comme lu"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsUnread(notification.id);
                              }}
                              title="Marquer comme non lu"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}