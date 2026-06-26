import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
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
      setError(t('requests.loadError'));
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

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
            {t('requests.statusPending')}
          </Badge>
        );
      case 'APPROUVE':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t('requests.statusApproved')}
          </Badge>
        );
      case 'REJETE':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {t('requests.statusRejected')}
          </Badge>
        );
      case 'EN_COURS_TRAITEMENT':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="mr-1 h-3 w-3" />
            {t('requests.statusInProgress')}
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
      setError(t('requests.selectAndTitleError'));
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
        throw new Error(result.message || t('requests.createError'));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests.createError'));
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
        setError(t('requests.detailsError'));
      }
    } catch (err) {
      setError(t('requests.detailsError'));
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
          <h1 className="text-3xl font-bold">{t('requests.title')}</h1>
          <p className="text-muted-foreground">{t('requests.subtitle')}</p>
        </div>
        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              {t('requests.newRequest')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('requests.newRequestTitle')}</DialogTitle>
              <DialogDescription>
                {t('requests.step', { current: currentStep })}
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
                    {t('requests.stepEstablishment')}
                  </span>
                  <span className={currentStep >= 2 ? "text-primary" : "text-muted-foreground"}>
                    {t('requests.stepTitle')}
                  </span>
                  <span className={currentStep >= 3 ? "text-primary" : "text-muted-foreground"}>
                    {t('requests.stepFinalize')}
                  </span>
                </div>
                <Progress value={(currentStep / 3) * 100} />
              </div>

              {/* Step 1: Establishment */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="establishment">{t('requests.selectEstablishment')}</Label>
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
                        <SelectValue placeholder={t('requests.chooseEstablishment')} />
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
                      <h4 className="font-semibold mb-2">{t('requests.about', { name: selectedEstablishmentData.nomEtablissement })}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('requests.aboutType', { type: selectedEstablishmentData.typeEtablissement })}
                        <br />
                        {t('requests.processingTime')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Title and Description */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="titre">{t('requests.certificateTitle')}</Label>
                    <Input
                      id="titre"
                      placeholder={t('requests.certificateTitlePlaceholder')}
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">{t('requests.descriptionLabel')}</Label>
                    <Textarea
                      id="description"
                      placeholder={t('requests.descriptionPlaceholder')}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-800">{t('requests.importantNote')}</h4>
                    <p className="text-sm text-blue-700">
                      {t('requests.importantNoteText')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={skipCourseStep}
                    >
                      {t('requests.skipStep')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Documents and Message */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="message">{t('requests.messageToEstablishment')}</Label>
                    <Textarea
                      id="message"
                      placeholder={t('requests.messagePlaceholder')}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      rows={4}
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="documents">{t('requests.documents')}</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{t('requests.dragFiles')}</p>
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor="file-upload" className="cursor-pointer">
                            {t('requests.browseFiles')}
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
                        {t('requests.fileTypes')}
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
                  {t('requests.previous')}
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && !selectedEstablishmentId) ||
                      (currentStep === 2 && !titre.trim())
                    }
                  >
                    {t('requests.next')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={submitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? t('requests.sending') : t('requests.send')}
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
              placeholder={t('requests.searchPlaceholder')}
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
                <p className="text-sm text-muted-foreground">{t('requests.statTotal')}</p>
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
                <p className="text-sm text-muted-foreground">{t('requests.statPending')}</p>
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
                <p className="text-sm text-muted-foreground">{t('requests.statApproved')}</p>
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
                <p className="text-sm text-muted-foreground">{t('requests.statRejected')}</p>
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
          <CardTitle>{t('requests.myRequests')}</CardTitle>
          <CardDescription>{t('requests.myRequestsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">{t('requests.loading')}</p>
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
                        {t('requests.requestedOn', { date: new Date(demande.dateDemande).toLocaleDateString(dateLocale) })}
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
                          {demande.statutDemande === 'REJETE' ? t('requests.rejectReason') : t('requests.establishmentResponse')}
                        </p>
                        <p className="text-sm text-muted-foreground">{demande.messageReponse}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {t('requests.documentsProvided', { count: demande.documents.length })}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(demande)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      {t('requests.viewDetails')}
                    </Button>
                    {demande.statutDemande === 'REJETE' && (
                      <Button size="sm">
                        {t('requests.relaunch')}
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
                {searchQuery ? t('requests.noneFoundSearch') : t('requests.none')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery 
                  ? t('requests.modifySearch')
                  : t('requests.createFirst')
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsNewRequestOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('requests.createRequest')}
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
            <DialogTitle>{t('requests.detailsTitle')}</DialogTitle>
            <DialogDescription>
              {t('requests.detailsDesc')}
            </DialogDescription>
          </DialogHeader>

          {selectedDemande && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('requests.fieldTitle')}</Label>
                  <p className="text-lg font-semibold">{selectedDemande.titre}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('requests.fieldStatus')}</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedDemande.statutDemande)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('requests.fieldEstablishment')}</Label>
                  <p className="font-medium">{selectedDemande.etablissement.nomEtablissement}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('requests.fieldDate')}</Label>
                  <p className="font-medium">
                    {new Date(selectedDemande.dateDemande).toLocaleDateString(dateLocale, {
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
                  <Label className="text-sm font-medium text-muted-foreground">{t('requests.fieldDescription')}</Label>
                  <p className="mt-1 text-sm">{selectedDemande.description}</p>
                </div>
              )}

              {/* Message de demande */}
              {selectedDemande.messageDemande && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('requests.yourMessage')}</Label>
                  <div className="mt-1 p-3 bg-accent/50 rounded-lg">
                    <p className="text-sm">{selectedDemande.messageDemande}</p>
                  </div>
                </div>
              )}

              {/* Réponse de l'établissement */}
              {selectedDemande.messageReponse && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {selectedDemande.statutDemande === 'REJETE' ? t('requests.rejectReasonLabel') : t('requests.establishmentResponseLabel')}
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
                  {t('requests.documentsProvidedCount', { count: selectedDemande.documents.length })}
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
                          {t('requests.open')}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{t('requests.noDocuments')}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}