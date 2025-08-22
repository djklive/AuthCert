import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Bell, 
  Award, 
  Eye, 
  Building2, 
  CheckCircle, 
  XCircle,
  Clock,
  Star,
  AlertTriangle,
  Trash2,
  Mail,
  Filter
} from 'lucide-react';

// Mock notifications data
const mockNotifications = [
  {
    id: 1,
    type: 'certificate',
    title: 'Nouveau certificat disponible',
    description: 'Votre certificat "React Advanced" de Tech Academy est maintenant disponible',
    time: 'Il y a 2 heures',
    read: false,
    important: true,
    icon: Award,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    id: 2,
    type: 'verification',
    title: 'Nouvelles vérifications',
    description: '5 nouvelles vérifications de vos certificats cette semaine',
    time: 'Il y a 4 heures',
    read: false,
    important: false,
    icon: Eye,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10'
  },
  {
    id: 3,
    type: 'request',
    title: 'Demande approuvée',
    description: 'Votre demande pour "UX Research Specialist" a été approuvée',
    time: 'Il y a 1 jour',
    read: true,
    important: true,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    id: 4,
    type: 'establishment',
    title: 'Nouvel établissement connecté',
    description: 'Business School Paris a accepté votre demande de connexion',
    time: 'Il y a 2 jours',
    read: true,
    important: false,
    icon: Building2,
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10'
  },
  {
    id: 5,
    type: 'security',
    title: 'Connexion depuis un nouvel appareil',
    description: 'Une connexion depuis iPhone a été détectée à Paris',
    time: 'Il y a 3 jours',
    read: true,
    important: false,
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    id: 6,
    type: 'system',
    title: 'Mise à jour de la plateforme',
    description: 'Nouvelles fonctionnalités disponibles dans votre dashboard',
    time: 'Il y a 1 semaine',
    read: true,
    important: false,
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
];

interface NotificationsScreenProps {
  onNavigate: (screen: string) => void;
}

export function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeTab, setActiveTab] = useState('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  const importantCount = notifications.filter(n => n.important && !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return !notification.read;
      case 'important':
        return notification.important;
      default:
        return true;
    }
  });

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAsUnread = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: false } : n
    ));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'certificate':
        return 'Certificat';
      case 'verification':
        return 'Vérification';
      case 'request':
        return 'Demande';
      case 'establishment':
        return 'Établissement';
      case 'security':
        return 'Sécurité';
      case 'system':
        return 'Système';
      default:
        return 'Notification';
    }
  };

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
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Tout marquer comme lu
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtres
          </Button>
        </div>
      </div>

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
                        !notification.read ? 'bg-accent/30 border-primary/20' : 'bg-card'
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
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
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
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.description}
                          </p>
                          
                          <p className="text-xs text-muted-foreground">
                            {notification.time}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              title="Marquer comme lu"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsUnread(notification.id)}
                              title="Marquer comme non lu"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
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

      {/* Toast Notification Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu des notifications toast</CardTitle>
          <CardDescription>
            Voici comment apparaissent les notifications rapides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  🎉 Nouveau certificat disponible !
                </p>
                <p className="text-xs text-green-600">
                  React Advanced - Tech Academy
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Eye className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Nouvelle vérification de certificat
                </p>
                <p className="text-xs text-blue-600">
                  Quelqu'un a vérifié votre UX Design cert
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}