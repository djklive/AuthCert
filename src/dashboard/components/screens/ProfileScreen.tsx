import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Shield, 
  Bell, 
  Eye, 
  Lock,
  Smartphone,
  Monitor,
  Trash2,
  Save,
  Edit
} from 'lucide-react';

// Mock user data
const mockUser = {
  name: "Marie Dubois",
  email: "marie.dubois@email.com",
  phone: "+33 6 12 34 56 78",
  location: "Paris, France",
  avatar: "",
  bio: "Développeuse Full-Stack passionnée par les nouvelles technologies et l'apprentissage continu.",
  memberSince: "Janvier 2023"
};

const mockSessions = [
  {
    id: 1,
    device: "MacBook Pro",
    location: "Paris, France",
    lastActive: "Maintenant",
    type: "desktop",
    current: true
  },
  {
    id: 2,
    device: "iPhone 13",
    location: "Paris, France",
    lastActive: "Il y a 2h",
    type: "mobile",
    current: false
  }
];

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const [user, setUser] = useState(mockUser);
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState({
    newCertificates: true,
    verifications: true,
    marketing: false,
    security: true
  });
  const [privacy, setPrivacy] = useState({
    publicProfile: false,
    showCertificates: true,
    showStats: false
  });

  const handleSaveProfile = () => {
    setIsEditing(false);
    // Save logic here
  };

  const handleTerminateSession = (sessionId: number) => {
    // Terminate session logic
    console.log('Terminating session:', sessionId);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles et préférences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>Vos informations de base</CardDescription>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                >
                  {isEditing ? (
                    <><Save className="mr-2 h-4 w-4" /> Enregistrer</>
                  ) : (
                    <><Edit className="mr-2 h-4 w-4" /> Modifier</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-xl">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-muted-foreground">Membre depuis {user.memberSince}</p>
                  <Badge variant="outline" className="mt-2">
                    Profil vérifié
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={user.name}
                      onChange={(e) => setUser({...user, name: e.target.value})}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({...user, email: e.target.value})}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={user.phone}
                      onChange={(e) => setUser({...user, phone: e.target.value})}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localisation</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={user.location}
                      onChange={(e) => setUser({...user, location: e.target.value})}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Mes statistiques</CardTitle>
              <CardDescription>Aperçu de votre activité</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">12</p>
                  <p className="text-sm text-muted-foreground">Certificats</p>
                </div>
                <div className="text-center p-4 bg-chart-2/5 rounded-lg">
                  <p className="text-2xl font-bold text-chart-2">156</p>
                  <p className="text-sm text-muted-foreground">Vérifications</p>
                </div>
                <div className="text-center p-4 bg-chart-4/5 rounded-lg">
                  <p className="text-2xl font-bold text-chart-4">5</p>
                  <p className="text-sm text-muted-foreground">Établissements</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                Paramètres de confidentialité
              </CardTitle>
              <CardDescription>Contrôlez qui peut voir vos informations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Profil public</div>
                  <div className="text-sm text-muted-foreground">
                    Permettre aux autres de voir votre profil
                  </div>
                </div>
                <Switch
                  checked={privacy.publicProfile}
                  onCheckedChange={(checked) => setPrivacy({...privacy, publicProfile: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Certificats visibles</div>
                  <div className="text-sm text-muted-foreground">
                    Afficher vos certificats sur votre profil public
                  </div>
                </div>
                <Switch
                  checked={privacy.showCertificates}
                  onCheckedChange={(checked) => setPrivacy({...privacy, showCertificates: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Statistiques partagées</div>
                  <div className="text-sm text-muted-foreground">
                    Partager vos statistiques d'activité
                  </div>
                </div>
                <Switch
                  checked={privacy.showStats}
                  onCheckedChange={(checked) => setPrivacy({...privacy, showStats: checked})}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Choisissez les notifications que vous souhaitez recevoir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Nouveaux certificats</div>
                  <div className="text-sm text-muted-foreground">
                    Quand un nouveau certificat est disponible
                  </div>
                </div>
                <Switch
                  checked={notifications.newCertificates}
                  onCheckedChange={(checked) => setNotifications({...notifications, newCertificates: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Vérifications</div>
                  <div className="text-sm text-muted-foreground">
                    Quand quelqu'un vérifie vos certificats
                  </div>
                </div>
                <Switch
                  checked={notifications.verifications}
                  onCheckedChange={(checked) => setNotifications({...notifications, verifications: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Alertes sécurité</div>
                  <div className="text-sm text-muted-foreground">
                    Activités suspectes sur votre compte
                  </div>
                </div>
                <Switch
                  checked={notifications.security}
                  onCheckedChange={(checked) => setNotifications({...notifications, security: checked})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Marketing</div>
                  <div className="text-sm text-muted-foreground">
                    Nouvelles fonctionnalités et conseils
                  </div>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(checked) => setNotifications({...notifications, marketing: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Sécurité du compte
              </CardTitle>
              <CardDescription>Protégez votre compte avec des mesures de sécurité avancées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Mot de passe</div>
                  <div className="text-sm text-muted-foreground">
                    Dernière modification il y a 2 mois
                  </div>
                </div>
                <Button variant="outline">
                  <Lock className="mr-2 h-4 w-4" />
                  Changer
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium">Authentification à deux facteurs</div>
                  <div className="text-sm text-muted-foreground">
                    Sécurisez votre compte avec 2FA
                  </div>
                </div>
                <Button variant="outline">
                  Configurer
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions actives</CardTitle>
              <CardDescription>Gérez les appareils connectés à votre compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      {session.type === 'desktop' ? (
                        <Monitor className="h-5 w-5" />
                      ) : (
                        <Smartphone className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{session.device}</p>
                      <p className="text-sm text-muted-foreground">{session.location}</p>
                      <p className="text-xs text-muted-foreground">{session.lastActive}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {session.current && (
                      <Badge variant="default" className="text-xs">Actuelle</Badge>
                    )}
                    {!session.current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTerminateSession(session.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Zone de danger</CardTitle>
              <CardDescription>Actions irréversibles sur votre compte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div>
                  <p className="font-medium">Supprimer le compte</p>
                  <p className="text-sm text-muted-foreground">
                    Supprime définitivement votre compte et toutes vos données
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}