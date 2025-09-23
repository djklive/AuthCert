import { useUser } from '../../hooks/useUser';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Archive,
  Clock,
  Award,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../../services/api';

{/*interface FormationsScreenProps {
  onNavigate: (screen: string) => void;
}*/}

interface Formation {
  id: number;
  nomFormation: string;
  description?: string;
  typeFormation: 'DIPLOME' | 'CERTIFICAT_FORMATION' | 'ATTESTATION_PRESENCE' | 'CERTIFICATION_COMPETENCES' | 'FORMATION_CONTINUE' | 'STAGE' | 'SEMINAIRE';
  dureeFormation?: string;
  niveauFormation?: 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'EXPERT';
  statut: 'ACTIF' | 'INACTIF' | 'ARCHIVE';
  dateCreation: string;
  dateModification: string;
  certificats?: Formation[];
  etablissementId?: number;
}

const TYPE_FORMATION_LABELS = {
  DIPLOME: 'Diplôme',
  CERTIFICAT_FORMATION: 'Certificat de Formation',
  ATTESTATION_PRESENCE: 'Attestation de Présence',
  CERTIFICATION_COMPETENCES: 'Certification de Compétences',
  FORMATION_CONTINUE: 'Formation Continue',
  STAGE: 'Stage',
  SEMINAIRE: 'Séminaire'
};

const NIVEAU_FORMATION_LABELS = {
  DEBUTANT: 'Débutant',
  INTERMEDIAIRE: 'Intermédiaire',
  AVANCE: 'Avancé',
  EXPERT: 'Expert'
};

const STATUT_LABELS = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  ARCHIVE: 'Archivé'
};

export function FormationsScreen() {
  const { user } = useUser();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    nomFormation: '',
    description: '',
    typeFormation: 'CERTIFICAT_FORMATION' as Formation['typeFormation'],
    dureeFormation: '',
    niveauFormation: 'DEBUTANT' as Formation['niveauFormation'],
    etablissementId: user?.id
  });

  // Charger les formations
  const loadFormations = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Chargement des formations pour l\'établissement:', user?.id);
      const response = await api.get(`/etablissement/${user?.id}/formations`);
      console.log('📊 Réponse API formations:', response);
      console.log('📊 Structure de la réponse GET:', {
        success: response.success,
        data: response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
      });
      if (response.success) {
        setFormations(response.data);
        console.log('✅ Formations chargées:', response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des formations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadFormations();
    }
  }, [user?.id, loadFormations]);

  // Debug pour voir les changements d'état
  useEffect(() => {
    console.log('🔄 État des formations a changé:', {
      formations: formations.length,
      loading,
      user: user?.id
    });
  }, [formations, loading, user?.id]);

  // Filtrer les formations
  const filteredFormations = formations.filter(formation => {
    const matchesSearch = formation.nomFormation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || formation.typeFormation === typeFilter;
    const matchesStatut = statutFilter === 'all' || formation.statut === statutFilter;
    
    return matchesSearch && matchesType && matchesStatut;
  });

  // Créer une formation
  const handleCreateFormation = async () => {
    try {
      setMessage(null);
      const dataToSend = {
        ...formData,
        etablissementId: user?.id
      };
      console.log('📤 Données envoyées:', dataToSend);
      
      const response = await api.post('/formations', dataToSend);
      console.log('📥 Réponse création:', response);
      console.log('📥 Structure de la réponse:', {
        success: response.success,
        data: response.data,
        message: response.message
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Formation créée avec succès !' });
        setShowCreateDialog(false);
        setFormData({
          nomFormation: '',
          description: '',
          typeFormation: 'CERTIFICAT_FORMATION',
          dureeFormation: '',
          niveauFormation: 'DEBUTANT',
          etablissementId: user?.id
        });
        await loadFormations();
        
        // Masquer le message après 3 secondes
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Erreur lors de la création' });
      }
    } catch (error) {
      console.error('Erreur lors de la création de la formation:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la création de la formation' });
    }
  };

  // Modifier une formation
  const handleEditFormation = async () => {
    if (!editingFormation) return;

    try {
      setMessage(null);
      const response = await api.put(`/formations/${editingFormation.id}`, {
        ...formData,
        etablissementId: user?.id
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Formation modifiée avec succès !' });
        setShowEditDialog(false);
        setEditingFormation(null);
        setFormData({
          nomFormation: '',
          description: '',
          typeFormation: 'CERTIFICAT_FORMATION',
          dureeFormation: '',
          niveauFormation: 'DEBUTANT',
          etablissementId: user?.id
        });
        await loadFormations();
        
        // Masquer le message après 3 secondes
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Erreur lors de la modification' });
      }
    } catch (error) {
      console.error('Erreur lors de la modification de la formation:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la modification de la formation' });
    }
  };

  // Supprimer une formation
  const handleDeleteFormation = async (formationId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;

    try {
      setMessage(null);
      const response = await api.delete(`/formations/${formationId}`);
      if (response.success) {
        setMessage({ type: 'success', text: 'Formation supprimée avec succès !' });
        await loadFormations();
        
        // Masquer le message après 3 secondes
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Erreur lors de la suppression' });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la formation:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression de la formation' });
    }
  };

  // Ouvrir le dialogue d'édition
  const openEditDialog = (formation: Formation) => {
    setEditingFormation(formation);
    setFormData({
      nomFormation: formation.nomFormation,
      description: formation.description || '',
      typeFormation: formation.typeFormation,
      dureeFormation: formation.dureeFormation || '',
      niveauFormation: formation.niveauFormation || 'DEBUTANT',
      etablissementId: user?.id
    });
    setShowEditDialog(true);
  };

  // Statistiques
  const stats = {
    total: formations.length,
    actifs: formations.filter(f => f.statut === 'ACTIF').length,
    inactifs: formations.filter(f => f.statut === 'INACTIF').length,
    archives: formations.filter(f => f.statut === 'ARCHIVE').length
  };

  // Debug pour l'affichage
  console.log('🔍 État des formations:', {
    formations: formations.length,
    filteredFormations: filteredFormations.length,
    loading,
    stats,
    formationsData: formations
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Messages de succès/erreur */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Formations</h1>
          <p className="text-gray-600 mt-2">Créez et gérez les formations de votre établissement</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle Formation
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actives</p>
                <p className="text-2xl font-bold text-green-600">{stats.actifs}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactives</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inactifs}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Archivées</p>
                <p className="text-2xl font-bold text-gray-600">{stats.archives}</p>
              </div>
              <Archive className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher une formation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type de formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(TYPE_FORMATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={loadFormations} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des formations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredFormations.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune formation trouvée</p>
          </div>
        ) : (
          filteredFormations.map((formation) => (
            <Card key={formation.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {formation.nomFormation}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={formation.statut === 'ACTIF' ? 'default' : 'secondary'}>
                        {STATUT_LABELS[formation.statut]}
                      </Badge>
                      <Badge variant="outline">
                        {TYPE_FORMATION_LABELS[formation.typeFormation]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(formation)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFormation(formation.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {formation.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {formation.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  {formation.dureeFormation && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {formation.dureeFormation}
                    </div>
                  )}
                  
                  {formation.niveauFormation && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Award className="w-4 h-4" />
                      {NIVEAU_FORMATION_LABELS[formation.niveauFormation]}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    Créé le {new Date(formation.dateCreation).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogue de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle formation</DialogTitle>
            <DialogDescription>
              Remplissez les informations pour créer une nouvelle formation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nomFormation">Nom de la formation *</Label>
              <Input
                id="nomFormation"
                value={formData.nomFormation}
                onChange={(e) => setFormData({ ...formData, nomFormation: e.target.value })}
                placeholder="Ex: Formation en Développement Web"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la formation..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="typeFormation">Type de formation *</Label>
                <Select value={formData.typeFormation} onValueChange={(value: Formation['typeFormation'] | string) => setFormData({ ...formData, typeFormation: value as Formation['typeFormation'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_FORMATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="niveauFormation">Niveau</Label>
                <Select value={formData.niveauFormation} onValueChange={(value: Formation['niveauFormation'] | string) => setFormData({ ...formData, niveauFormation: value as Formation['niveauFormation'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NIVEAU_FORMATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="dureeFormation">Durée de la formation</Label>
              <Input
                id="dureeFormation"
                value={formData.dureeFormation}
                onChange={(e) => setFormData({ ...formData, dureeFormation: e.target.value })}
                placeholder="Ex: 6 mois, 2 ans, 120 heures"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFormation} disabled={!formData.nomFormation}>
              Créer la formation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'édition */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la formation</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la formation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nomFormation">Nom de la formation *</Label>
              <Input
                id="edit-nomFormation"
                value={formData.nomFormation}
                onChange={(e) => setFormData({ ...formData, nomFormation: e.target.value })}
                placeholder="Ex: Formation en Développement Web"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la formation..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-typeFormation">Type de formation *</Label>
                <Select value={formData.typeFormation} onValueChange={(value: Formation['typeFormation'] | string) => setFormData({ ...formData, typeFormation: value as Formation['typeFormation'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_FORMATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-niveauFormation">Niveau</Label>
                <Select value={formData.niveauFormation} onValueChange={(value: Formation['niveauFormation'] | string) => setFormData({ ...formData, niveauFormation: value as Formation['niveauFormation'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NIVEAU_FORMATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-dureeFormation">Durée de la formation</Label>
              <Input
                id="edit-dureeFormation"
                value={formData.dureeFormation}
                onChange={(e) => setFormData({ ...formData, dureeFormation: e.target.value })}
                placeholder="Ex: 6 mois, 2 ans, 120 heures"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditFormation} disabled={!formData.nomFormation}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
