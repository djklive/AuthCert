import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { useUser } from '../../hooks/useUser';
import { api } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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
  Edit,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface UserProfile {
  id_apprenant?: number;
  id_etablissement?: number;
  nom?: string;
  prenom?: string;
  nomEtablissement?: string;
  email?: string;
  emailEtablissement?: string;
  telephone?: string;
  telephoneEtablissement?: string;
  adresseEtablissement?: string;
  statut: string;
  dateCreation: string;
  walletAddress?: string;
  smartContractAddress?: string;
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  type: 'desktop' | 'mobile';
  current: boolean;
  expiresAt: string;
}

export function ProfileScreen() {
  const { user: contextUser } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // États pour les modales
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [deletePassword, setDeletePassword] = useState('');
  
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

  // Charger les données du profil au montage du composant
  useEffect(() => {
    loadUserProfile();
    loadSessions();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getUserProfile();
      if (response.success) {
        setUserProfile(response.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement du profil');
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.getUserSessions();
      if (response.success) {
        setSessions(response.data);
      }
    } catch (err) {
      console.error('Erreur chargement sessions:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const profileData: UserProfile = {
        statut: userProfile.statut,
        dateCreation: userProfile.dateCreation
      };
      
      // Adapter les données selon le type d'utilisateur
      if (contextUser?.role === 'student') {
        if (userProfile.nom) profileData.nom = userProfile.nom;
        if (userProfile.prenom) profileData.prenom = userProfile.prenom;
        if (userProfile.email) profileData.email = userProfile.email;
        if (userProfile.telephone) profileData.telephone = userProfile.telephone;
      } else if (contextUser?.role === 'establishment') {
        if (userProfile.nomEtablissement) profileData.nom = userProfile.nomEtablissement;
        if (userProfile.emailEtablissement) profileData.email = userProfile.emailEtablissement;
        if (userProfile.telephoneEtablissement) profileData.telephone = userProfile.telephoneEtablissement;
        if (userProfile.adresseEtablissement) profileData.adresseEtablissement = userProfile.adresseEtablissement;
      }
      
      const response = await api.updateUserProfile(profileData);
      if (response.success) {
        setSuccess('Profil modifié avec succès');
    setIsEditing(false);
        // Recharger le profil pour avoir les données mises à jour
        await loadUserProfile();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      await api.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess('Mot de passe modifié avec succès');
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await api.terminateSession(sessionId);
      setSuccess('Session terminée avec succès');
      await loadSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de la session');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setError('Veuillez entrer votre mot de passe pour confirmer la suppression');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      await api.deleteAccount(deletePassword);
      setSuccess('Compte supprimé avec succès');
      
      // Déconnexion et redirection
      setTimeout(() => {
        logout();
        navigate('/');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du compte');
    } finally {
      setSaving(false);
    }
  };

  // Fonctions utilitaires pour l'affichage
  const getUserDisplayName = () => {
    if (!userProfile) return 'Utilisateur';
    if (contextUser?.role === 'student') {
      return `${userProfile.prenom || ''} ${userProfile.nom || ''}`.trim() || 'Utilisateur';
    } else {
      return userProfile.nomEtablissement || 'Établissement';
    }
  };

  const getUserEmail = () => {
    if (!userProfile) return '';
    return userProfile.email || userProfile.emailEtablissement || '';
  };

  const getUserPhone = () => {
    if (!userProfile) return '';
    return userProfile.telephone || userProfile.telephoneEtablissement || '';
  };

  const getUserLocation = () => {
    if (!userProfile) return '';
    return userProfile.adresseEtablissement || '';
  };

  const getMemberSince = () => {
    if (!userProfile) return '';
    return new Date(userProfile.dateCreation).toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du profil...</p>
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
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles et préférences</p>
        </div>
      </div>

      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <div className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            {success}
          </div>
        </div>
      )}

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
                  disabled={saving}
                >
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
                  ) : isEditing ? (
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
                    <AvatarImage src="" alt={getUserDisplayName()} />
                    <AvatarFallback className="text-xl">
                      {getUserDisplayName().split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                  <h3 className="text-lg font-semibold">{getUserDisplayName()}</h3>
                  <p className="text-muted-foreground">Membre depuis {getMemberSince()}</p>
                  <Badge variant="outline" className="mt-2">
                    {userProfile?.statut === 'ACTIF' ? 'Profil vérifié' : 'En attente'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="grid gap-4 md:grid-cols-2">
                {contextUser?.role === 'student' ? (
                  <>
                <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                          id="prenom"
                          value={userProfile?.prenom || ''}
                          onChange={(e) => setUserProfile({...userProfile!, prenom: e.target.value})}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nom"
                          value={userProfile?.nom || ''}
                          onChange={(e) => setUserProfile({...userProfile!, nom: e.target.value})}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nomEtablissement">Nom de l'établissement</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="nomEtablissement"
                        value={userProfile?.nomEtablissement || ''}
                        onChange={(e) => setUserProfile({...userProfile!, nomEtablissement: e.target.value})}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={getUserEmail()}
                      onChange={(e) => {
                        if (contextUser?.role === 'student') {
                          setUserProfile({...userProfile!, email: e.target.value});
                        } else {
                          setUserProfile({...userProfile!, emailEtablissement: e.target.value});
                        }
                      }}
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
                      value={getUserPhone()}
                      onChange={(e) => {
                        if (contextUser?.role === 'student') {
                          setUserProfile({...userProfile!, telephone: e.target.value});
                        } else {
                          setUserProfile({...userProfile!, telephoneEtablissement: e.target.value});
                        }
                      }}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                {contextUser?.role === 'establishment' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="adresse">Adresse</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="adresse"
                        value={getUserLocation()}
                        onChange={(e) => setUserProfile({...userProfile!, adresseEtablissement: e.target.value})}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
                )}
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
                <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
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
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune session active trouvée
                </div>
              ) : (
                sessions.map((session) => (
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
                ))
              )}
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
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modale de changement de mot de passe */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Entrez votre mot de passe actuel et le nouveau mot de passe
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                placeholder="Votre mot de passe actuel"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Nouveau mot de passe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Confirmer le nouveau mot de passe"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setError('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Changer le mot de passe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale de suppression de compte */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer le compte
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes vos données seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Attention : Cette action supprimera définitivement :
              </p>
              <ul className="text-sm text-destructive mt-2 ml-4 list-disc">
                <li>Votre profil et toutes vos informations personnelles</li>
                <li>Tous vos certificats et liaisons</li>
                <li>Toutes vos sessions actives</li>
                <li>Toutes les données associées à votre compte</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Confirmer avec votre mot de passe</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Votre mot de passe pour confirmer"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletePassword('');
                setError('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={saving || !deletePassword}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}