import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Progress } from '../ui/progress';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Building2, 
  Upload,
  ArrowRight,
  ArrowLeft,
  Send,
  Calendar,
  Search,
  Eye
} from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import authService from '../../../services/authService';
import { API_BASE, api } from '../../../services/api';

interface DemandeCertificat {
  id: number;
  titre: string;
  description?: string;
  messageDemande?: string;
  statutDemande: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE' | 'EN_COURS_TRAITEMENT';
  dateDemande: string;
  dateTraitement?: string;
  messageReponse?: string;
  etablissement: {
    id_etablissement: number;
    nomEtablissement: string;
  };
  documents: Array<{
    id: number;
    nomFichier: string;
    typeMime: string;
    tailleFichier: number;
    cheminFichier: string;
  }>;
}

interface Etablissement {
  id_etablissement: number;
  nomEtablissement: string;
  typeEtablissement: string;
  statut: string;
}

//interface RequestsScreenProps {
//  onNavigate: (screen: string) => void;
//}

export function RequestsScreen() {
  const { user } = useUser();
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [, setSelectedEstablishment] = useState('');
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<number | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [demandes, setDemandes] = useState<DemandeCertificat[]>([]);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDemande, setSelectedDemande] = useState<DemandeCertificat | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Charger les demandes de certificat et les établissements en parallèle
      const [demandesResponse, etablissementsResponse] = await Promise.all([
        fetch(`${API_BASE}/apprenant/${user.id}/demandes-certificat`, {
          headers: authService.getAuthHeaders()
        }),
        fetch(`${API_BASE}/accueil/etablissements`, {
          headers: authService.getAuthHeaders()
        })
      ]);

      if (!demandesResponse.ok || !etablissementsResponse.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const [demandesData, etablissementsData] = await Promise.all([
        demandesResponse.json(),
        etablissementsResponse.json()
      ]);

      setDemandes(demandesData.data || []);
      setEtablissements(etablissementsData.data || []);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EN_ATTENTE':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        );
      case 'APPROUVE':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approuvé
          </Badge>
        );
      case 'REJETE':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Refusé
          </Badge>
        );
      case 'EN_COURS_TRAITEMENT':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="mr-1 h-3 w-3" />
            En cours
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedEstablishmentId || !titre.trim()) {
      setError('Veuillez sélectionner un établissement et saisir un titre');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Préparer les données de la demande avec les fichiers
      const demandeData = {
        etablissementId: selectedEstablishmentId,
        titre: titre.trim(),
        description: description.trim() || undefined,
        messageDemande: requestMessage.trim() || undefined,
        documents: uploadedFiles.length > 0 ? uploadedFiles : undefined
      };

      // Utiliser l'API pour créer la demande
      const result = await api.createDemandeCertificat(demandeData);

      if (result.success) {
        // Fermer le modal et recharger les données
        setIsNewRequestOpen(false);
        resetForm();
        await loadData();
      } else {
        throw new Error(result.message || 'Erreur lors de la création de la demande');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedEstablishment('');
    setSelectedEstablishmentId(null);
    setTitre('');
    setDescription('');
    setRequestMessage('');
    setUploadedFiles([]);
    setError('');
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const skipCourseStep = () => {
    // Passer directement à l'étape 3 (documents et message)
    setCurrentStep(3);
  };

  const handleViewDetails = async (demande: DemandeCertificat) => {
    try {
      // Récupérer les détails complets de la demande
      const result = await api.getDemandeDetails(demande.id);
      if (result.success) {
        setSelectedDemande(result.data);
        setIsDetailModalOpen(true);
      } else {
        setError('Erreur lors du chargement des détails');
      }
    } catch (err) {
      setError('Erreur lors du chargement des détails');
      console.error('Erreur chargement détails:', err);
    }
  };

  const filteredDemandes = demandes.filter(demande =>
    demande.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    demande.etablissement.nomEtablissement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEstablishmentData = etablissements.find(e => e.id_etablissement === selectedEstablishmentId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Demandes de Certificat</h1>
          <p className="text-muted-foreground">Suivez vos demandes et créez-en de nouvelles</p>
        </div>
        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle demande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle demande de certificat</DialogTitle>
              <DialogDescription>
                Étape {currentStep} sur 3 - Remplissez les informations nécessaires
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={currentStep >= 1 ? "text-primary" : "text-muted-foreground"}>
                    Établissement
                  </span>
                  <span className={currentStep >= 2 ? "text-primary" : "text-muted-foreground"}>
                    Titre
                  </span>
                  <span className={currentStep >= 3 ? "text-primary" : "text-muted-foreground"}>
                    Finalisation
                  </span>
                </div>
                <Progress value={(currentStep / 3) * 100} />
              </div>

              {/* Step 1: Establishment */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="establishment">Sélectionner un établissement</Label>
                    <Select 
                      value={selectedEstablishmentId?.toString() || ''} 
                      onValueChange={(value) => {
                        const id = parseInt(value);
                        setSelectedEstablishmentId(id);
                        const etab = etablissements.find(e => e.id_etablissement === id);
                        setSelectedEstablishment(etab?.nomEtablissement || '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un établissement" />
                      </SelectTrigger>
                      <SelectContent>
                        {etablissements.filter(e => e.statut === 'ACTIF').map((etab) => (
                          <SelectItem key={etab.id_etablissement} value={etab.id_etablissement.toString()}>
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>{etab.nomEtablissement}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEstablishmentData && (
                    <div className="p-4 bg-accent/50 rounded-lg">
                      <h4 className="font-semibold mb-2">À propos de {selectedEstablishmentData.nomEtablissement}</h4>
                      <p className="text-sm text-muted-foreground">
                        Type: {selectedEstablishmentData.typeEtablissement}
                        <br />
                        En moyenne, les demandes sont traitées sous 5-7 jours ouvrés.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Title and Description */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="titre">Titre du certificat *</Label>
                    <Input
                      id="titre"
                      placeholder="Ex: Master en Marketing Digital"
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez brièvement le certificat demandé..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-800">Note importante</h4>
                    <p className="text-sm text-blue-700">
                      Comme les établissements n'ont pas encore de formations définies, vous pouvez passer cette étape et aller directement à la finalisation.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={skipCourseStep}
                    >
                      Passer cette étape
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Documents and Message */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="message">Message à l'établissement</Label>
                    <Textarea
                      id="message"
                      placeholder="Expliquez votre parcours et votre motivation..."
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      rows={4}
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="documents">Documents justificatifs (optionnel)</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Glissez vos fichiers ici ou</p>
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor="file-upload" className="cursor-pointer">
                            Parcourir les fichiers
                          </label>
                        </Button>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        PDF, DOC, JPG, PNG jusqu'à 10MB chacun
                      </p>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-accent/30 rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && !selectedEstablishmentId) ||
                      (currentStep === 2 && !titre.trim())
                    }
                  >
                    Suivant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={submitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? 'Envoi...' : 'Envoyer la demande'}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre ou établissement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demandes.length}</p>
                <p className="text-sm text-muted-foreground">Total demandes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demandes.filter(d => d.statutDemande === 'EN_ATTENTE').length}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demandes.filter(d => d.statutDemande === 'APPROUVE').length}</p>
                <p className="text-sm text-muted-foreground">Approuvées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demandes.filter(d => d.statutDemande === 'REJETE').length}</p>
                <p className="text-sm text-muted-foreground">Refusées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Mes demandes</CardTitle>
          <CardDescription>Suivez l'état de vos demandes de certificat</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Chargement des demandes...</p>
            </div>
          ) : filteredDemandes.length > 0 ? (
            filteredDemandes.map((demande) => (
              <div key={demande.id} className="border rounded-lg p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg">{demande.titre}</h3>
                      {getStatusBadge(demande.statutDemande)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center">
                        <Building2 className="mr-1 h-3 w-3" />
                        {demande.etablissement.nomEtablissement}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        Demandé le {new Date(demande.dateDemande).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    {demande.description && (
                      <p className="text-sm text-muted-foreground mb-4">{demande.description}</p>
                    )}
                    
                    {demande.messageReponse && (
                      <div className={`p-3 rounded-lg ${
                        demande.statutDemande === 'REJETE' 
                          ? 'bg-destructive/10 border border-destructive/20' 
                          : 'bg-green-50 border border-green-200'
                      }`}>
                        <p className={`text-sm font-medium mb-1 ${
                          demande.statutDemande === 'REJETE' ? 'text-destructive' : 'text-green-800'
                        }`}>
                          {demande.statutDemande === 'REJETE' ? 'Raison du refus:' : 'Réponse de l\'établissement:'}
                        </p>
                        <p className="text-sm text-muted-foreground">{demande.messageReponse}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {demande.documents.length} document{demande.documents.length !== 1 ? 's' : ''} fourni{demande.documents.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(demande)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Voir détails
                    </Button>
                    {demande.statutDemande === 'REJETE' && (
                      <Button size="sm">
                        Relancer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">
                {searchQuery ? 'Aucune demande trouvée' : 'Aucune demande de certificat'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Modifiez votre recherche pour voir d\'autres demandes.' 
                  : 'Créez votre première demande de certificat.'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsNewRequestOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une demande
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de détails de la demande */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
            <DialogDescription>
              Informations complètes sur votre demande de certificat
            </DialogDescription>
          </DialogHeader>

          {selectedDemande && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Titre</Label>
                  <p className="text-lg font-semibold">{selectedDemande.titre}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Statut</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedDemande.statutDemande)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Établissement</Label>
                  <p className="font-medium">{selectedDemande.etablissement.nomEtablissement}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date de demande</Label>
                  <p className="font-medium">
                    {new Date(selectedDemande.dateDemande).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedDemande.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedDemande.description}</p>
                </div>
              )}

              {/* Message de demande */}
              {selectedDemande.messageDemande && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Votre message</Label>
                  <div className="mt-1 p-3 bg-accent/50 rounded-lg">
                    <p className="text-sm">{selectedDemande.messageDemande}</p>
                  </div>
                </div>
              )}

              {/* Réponse de l'établissement */}
              {selectedDemande.messageReponse && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {selectedDemande.statutDemande === 'REJETE' ? 'Raison du refus' : 'Réponse de l\'établissement'}
                  </Label>
                  <div className={`mt-1 p-3 rounded-lg ${
                    selectedDemande.statutDemande === 'REJETE' 
                      ? 'bg-destructive/10 border border-destructive/20' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <p className={`text-sm ${
                      selectedDemande.statutDemande === 'REJETE' ? 'text-destructive' : 'text-green-800'
                    }`}>
                      {selectedDemande.messageReponse}
                    </p>
                  </div>
                </div>
              )}

              {/* Documents fournis */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Documents fournis ({selectedDemande.documents.length})
                </Label>
                {selectedDemande.documents.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedDemande.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.nomFichier}</p>
                            <p className="text-xs text-muted-foreground">
                              {(doc.tailleFichier / 1024).toFixed(1)} KB • {doc.typeMime}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await api.getDocumentUrl(doc.id);
                              if (response.success) {
                                window.open(response.data.url, '_blank');
                              } else {
                                console.error('Erreur récupération URL:', response.message);
                              }
                            } catch (error) {
                              console.error('Erreur ouverture document:', error);
                            }
                          }}
                        >
                          Ouvrir
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Aucun document fourni</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}