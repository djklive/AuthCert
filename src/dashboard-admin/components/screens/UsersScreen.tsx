import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2,
  UserX,
  UserPlus,
  Building2,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { api, type User } from '../../services/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

export function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusComment, setStatusComment] = useState<string>('');
  const [createUserType, setCreateUserType] = useState<'apprenant' | 'etablissement'>('apprenant');

  // États pour la création d'utilisateur
  const [newUserData, setNewUserData] = useState({
    email: '',
    motDePasse: '',
    nom: '',
    prenom: '',
    telephone: '',
    etablissementId: '',
    // Pour établissement
    nomEtablissement: '',
    emailEtablissement: '',
    motDePasseEtablissement: '',
    rccmEtablissement: '',
    typeEtablissement: '',
    adresseEtablissement: '',
    telephoneEtablissement: '',
    nomResponsableEtablissement: '',
    emailResponsableEtablissement: '',
    telephoneResponsableEtablissement: ''
  });

  // Charger les utilisateurs
  useEffect(() => {
    loadUsers();
  }, []);

  // Filtrer les utilisateurs
  useEffect(() => {
    let filtered = users;

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.prenom && user.prenom.toLowerCase().includes(searchQuery.toLowerCase())) ||
        user.id.toString().includes(searchQuery)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.statut === statusFilter);
    }

    // Filtre par type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(user => user.type === typeFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, statusFilter, typeFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedUser || !newStatus) return;

    try {
      await api.updateUserStatus(
        selectedUser.id,
        selectedUser.type,
        newStatus as 'EN_ATTENTE' | 'ACTIF' | 'REJETE' | 'SUSPENDU',
        statusComment
      );
      
      // Mettre à jour la liste
      await loadUsers();
      setShowStatusModal(false);
      setSelectedUser(null);
      setNewStatus('');
      setStatusComment('');
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await api.deleteUser(user.id, user.type);
      await loadUsers();
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (createUserType === 'apprenant') {
        await api.createApprenant({
          email: newUserData.email,
          motDePasse: newUserData.motDePasse,
          nom: newUserData.nom,
          prenom: newUserData.prenom,
          telephone: newUserData.telephone || undefined,
          etablissementId: newUserData.etablissementId ? parseInt(newUserData.etablissementId) : undefined
        });
      } else {
        await api.createEtablissement({
          nomEtablissement: newUserData.nomEtablissement,
          emailEtablissement: newUserData.emailEtablissement,
          motDePasseEtablissement: newUserData.motDePasseEtablissement,
          rccmEtablissement: newUserData.rccmEtablissement,
          typeEtablissement: newUserData.typeEtablissement,
          adresseEtablissement: newUserData.adresseEtablissement,
          telephoneEtablissement: newUserData.telephoneEtablissement,
          nomResponsableEtablissement: newUserData.nomResponsableEtablissement,
          emailResponsableEtablissement: newUserData.emailResponsableEtablissement,
          telephoneResponsableEtablissement: newUserData.telephoneResponsableEtablissement
        });
      }
      
      await loadUsers();
      setShowCreateModal(false);
      // Reset form
      setNewUserData({
        email: '', motDePasse: '', nom: '', prenom: '', telephone: '', etablissementId: '',
        nomEtablissement: '', emailEtablissement: '', motDePasseEtablissement: '', rccmEtablissement: '',
        typeEtablissement: '', adresseEtablissement: '', telephoneEtablissement: '',
        nomResponsableEtablissement: '', emailResponsableEtablissement: '', telephoneResponsableEtablissement: ''
      });
    } catch (err) {
      console.error('Erreur création:', err);
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'ACTIF': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'EN_ATTENTE': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'SUSPENDU': return <UserX className="h-4 w-4 text-red-600" />;
      case 'REJETE': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'ACTIF': return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case 'EN_ATTENTE': return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'SUSPENDU': return <Badge className="bg-red-100 text-red-800">Suspendu</Badge>;
      case 'REJETE': return <Badge className="bg-red-100 text-red-800">Rejeté</Badge>;
      default: return <Badge variant="secondary">{statut}</Badge>;
    }
  };

  const stats = {
    total: users.length,
    apprenants: users.filter(u => u.type === 'apprenant').length,
    etablissements: users.filter(u => u.type === 'etablissement').length,
    actifs: users.filter(u => u.statut === 'ACTIF').length,
    enAttente: users.filter(u => u.statut === 'EN_ATTENTE').length,
    suspendus: users.filter(u => u.statut === 'SUSPENDU').length
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des utilisateurs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600">Gérez tous les utilisateurs de la plateforme</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
              <DialogDescription>
                Ajoutez un nouvel apprenant ou établissement à la plateforme
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={createUserType} onValueChange={(value) => setCreateUserType(value as 'apprenant' | 'etablissement')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="apprenant" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Apprenant
                </TabsTrigger>
                <TabsTrigger value="etablissement" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Établissement
                </TabsTrigger>
              </TabsList>

              <TabsContent value="apprenant" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                      placeholder="exemple@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motDePasse">Mot de passe *</Label>
                    <Input
                      id="motDePasse"
                      type="password"
                      value={newUserData.motDePasse}
                      onChange={(e) => setNewUserData({...newUserData, motDePasse: e.target.value})}
                      placeholder="Mot de passe sécurisé"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      value={newUserData.nom}
                      onChange={(e) => setNewUserData({...newUserData, nom: e.target.value})}
                      placeholder="Nom de famille"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input
                      id="prenom"
                      value={newUserData.prenom}
                      onChange={(e) => setNewUserData({...newUserData, prenom: e.target.value})}
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={newUserData.telephone}
                      onChange={(e) => setNewUserData({...newUserData, telephone: e.target.value})}
                      placeholder="+243 XXX XXX XXX"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="etablissement" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nomEtablissement">Nom de l'établissement *</Label>
                    <Input
                      id="nomEtablissement"
                      value={newUserData.nomEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, nomEtablissement: e.target.value})}
                      placeholder="Nom complet de l'établissement"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailEtablissement">Email institutionnel *</Label>
                    <Input
                      id="emailEtablissement"
                      type="email"
                      value={newUserData.emailEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, emailEtablissement: e.target.value})}
                      placeholder="contact@etablissement.edu"
                    />
                  </div>
                  <div>
                    <Label htmlFor="motDePasseEtablissement">Mot de passe *</Label>
                    <Input
                      id="motDePasseEtablissement"
                      type="password"
                      value={newUserData.motDePasseEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, motDePasseEtablissement: e.target.value})}
                      placeholder="Mot de passe sécurisé"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rccmEtablissement">Numéro RCCM *</Label>
                    <Input
                      id="rccmEtablissement"
                      value={newUserData.rccmEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, rccmEtablissement: e.target.value})}
                      placeholder="CD/KIN/RCCM/XX-X-XXXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="typeEtablissement">Type d'établissement *</Label>
                    <Select value={newUserData.typeEtablissement} onValueChange={(value) => setNewUserData({...newUserData, typeEtablissement: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNIVERSITE_PUBLIQUE">Université publique</SelectItem>
                        <SelectItem value="UNIVERSITE_PRIVEE">Université privée</SelectItem>
                        <SelectItem value="INSTITUT_SUPERIEUR">Institut supérieur</SelectItem>
                        <SelectItem value="ECOLE_TECHNIQUE">École technique</SelectItem>
                        <SelectItem value="CENTRE_FORMATION">Centre de formation</SelectItem>
                        <SelectItem value="AUTRE">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="telephoneEtablissement">Téléphone *</Label>
                    <Input
                      id="telephoneEtablissement"
                      value={newUserData.telephoneEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, telephoneEtablissement: e.target.value})}
                      placeholder="+243 XXX XXX XXX"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="adresseEtablissement">Adresse complète *</Label>
                  <Textarea
                    id="adresseEtablissement"
                    value={newUserData.adresseEtablissement}
                    onChange={(e) => setNewUserData({...newUserData, adresseEtablissement: e.target.value})}
                    placeholder="Adresse complète de l'établissement"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nomResponsableEtablissement">Nom du responsable *</Label>
                    <Input
                      id="nomResponsableEtablissement"
                      value={newUserData.nomResponsableEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, nomResponsableEtablissement: e.target.value})}
                      placeholder="Nom complet du responsable"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailResponsableEtablissement">Email du responsable *</Label>
                    <Input
                      id="emailResponsableEtablissement"
                      type="email"
                      value={newUserData.emailResponsableEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, emailResponsableEtablissement: e.target.value})}
                      placeholder="responsable@etablissement.edu"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephoneResponsableEtablissement">Téléphone du responsable *</Label>
                    <Input
                      id="telephoneResponsableEtablissement"
                      value={newUserData.telephoneResponsableEtablissement}
                      onChange={(e) => setNewUserData({...newUserData, telephoneResponsableEtablissement: e.target.value})}
                      placeholder="+243 XXX XXX XXX"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateUser}>
                Créer l'utilisateur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Apprenants</p>
                <p className="text-2xl font-bold">{stats.apprenants}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Établissements</p>
                <p className="text-2xl font-bold">{stats.etablissements}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold">{stats.actifs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{stats.enAttente}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspendus</p>
                <p className="text-2xl font-bold">{stats.suspendus}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Rechercher par nom, email ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ACTIF">Actif</SelectItem>
                <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                <SelectItem value="REJETE">Rejeté</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="apprenant">Apprenants</SelectItem>
                <SelectItem value="etablissement">Établissements</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Liste de tous les utilisateurs de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-gray-600">Aucun utilisateur ne correspond à vos critères de recherche</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Utilisateur</th>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Date création</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={`${user.type}-${user.id}`} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                            {user.type === 'apprenant' ? (
                              <GraduationCap className="h-5 w-5 text-primary" />
                            ) : (
                              <Building2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.prenom ? `${user.prenom} ${user.nom}` : user.nom}
                            </p>
                            <p className="text-sm text-gray-600">ID: {user.id}</p>
                            {user.etablissementNom && (
                              <p className="text-xs text-gray-500">Établissement: {user.etablissementNom}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={user.type === 'apprenant' ? 'default' : 'secondary'}>
                          {user.type === 'apprenant' ? 'Apprenant' : 'Établissement'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(user.statut)}
                          {getStatusBadge(user.statut)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(user.dateCreation).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                          {user.telephone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{user.telephone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier le statut</DialogTitle>
                                <DialogDescription>
                                  Modifier le statut de {user.prenom ? `${user.prenom} ${user.nom}` : user.nom}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="status">Nouveau statut</Label>
                                  <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ACTIF">Actif</SelectItem>
                                      <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                                      <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                                      <SelectItem value="REJETE">Rejeté</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="comment">Commentaire (optionnel)</Label>
                                  <Textarea
                                    id="comment"
                                    value={statusComment}
                                    onChange={(e) => setStatusComment(e.target.value)}
                                    placeholder="Raison du changement de statut..."
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                                  Annuler
                                </Button>
                                <Button onClick={handleStatusUpdate}>
                                  Mettre à jour
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action ne peut pas être annulée. Cela supprimera définitivement le compte de{' '}
                                  <strong>{user.prenom ? `${user.prenom} ${user.nom}` : user.nom}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
