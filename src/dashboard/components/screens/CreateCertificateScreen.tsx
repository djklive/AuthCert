import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Users, 
  Award, 
  Search, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Shield,
  Rocket,
  Mail,
  Tag,
  FileText,
  User,
  X,
  GraduationCap,
  ScanLine,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { api, API_BASE, type DiplomaExtraction } from '../../../services/api';
import { useEffect } from 'react';
import { useUser } from '../../hooks/useUser';
import authService from '../../../services/authService';
//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';

interface SelectedStudent { id: number; name: string; email: string; }

interface EtudiantLie {
  id: number;
  dateApprobation: string;
  apprenant: {
    id_apprenant: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    dateCreation: string;
    statut: string;
  };
}

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
}

interface CreateCertificateScreenProps {
  onNavigate: (screen: string) => void;
}

export function CreateCertificateScreen({ onNavigate }: CreateCertificateScreenProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [certificateData, setCertificateData] = useState({
    type: '',
    title: '',
    grade: '',
    issueDate: '',
    completionDate: '',
    skills: [] as string[],
    description: '',
    formationId: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false); // ✅ Protection contre les double-clics
  const [draftId, setDraftId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const { user } = useUser();
  const [etudiantsLies, setEtudiantsLies] = useState<EtudiantLie[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<DiplomaExtraction | null>(null);

  // Charger les données
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      console.log('🔍 Chargement des étudiants liés...', {
        userId: user.id,
        userRole: user.role,
        authHeaders: authService.getAuthHeaders()
      });

      // Charger les étudiants liés et les formations en parallèle
      const [etudiantsResponse, formationsResponse] = await Promise.all([
        fetch(`${API_BASE}/etablissement/${user.id}/etudiants`, {
          headers: authService.getAuthHeaders()
        }),
        fetch(`${API_BASE}/etablissement/${user.id}/formations`, {
          headers: authService.getAuthHeaders()
        })
      ]);
      
      console.log('📡 Réponse API étudiants:', {
        status: etudiantsResponse.status,
        statusText: etudiantsResponse.statusText,
        ok: etudiantsResponse.ok
      });
      
      if (!etudiantsResponse.ok) {
        const errorText = await etudiantsResponse.text();
        console.error('❌ Erreur API:', errorText);
        throw new Error(`Erreur ${etudiantsResponse.status}: ${errorText}`);
      }
      const etudiantsData = await etudiantsResponse.json();
      console.log('✅ Données étudiants reçues:', etudiantsData);
      setEtudiantsLies(etudiantsData.data || []);

      // Traiter la réponse des formations
      if (!formationsResponse.ok) {
        const errorText = await formationsResponse.text();
        console.error('❌ Erreur API formations:', errorText);
        throw new Error(`Erreur formations ${formationsResponse.status}: ${errorText}`);
      }
      const formationsData = await formationsResponse.json();
      console.log('✅ Données formations reçues:', formationsData);
      setFormations(formationsData.data || []);
    } catch (err) {
      setError(t('createCertificate.loadError'));
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLinkedStudents = etudiantsLies.filter(etudiant =>
    `${etudiant.apprenant.prenom} ${etudiant.apprenant.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    etudiant.apprenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const steps = [
    { title: t('createCertificate.step1Title'), description: t('createCertificate.step1Desc') },
    { title: t('createCertificate.step2Title'), description: t('createCertificate.step2Desc') },
    { title: t('createCertificate.step3Title'), description: t('createCertificate.step3Desc') }
  ];

  const handleNext = async () => {
    setError('');
    if (currentStep === 1) {
      if (!selectedStudent) return;
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      // ✅ Protection contre les double-clics
      if (isCreatingDraft) {
        console.log('⚠️ Création de brouillon déjà en cours, ignoré');
        return;
      }
      
      // Créer un brouillon côté backend
      if (!selectedStudent || !certificateData.title || !certificateData.issueDate || !certificateData.formationId) {
        setError(t('createCertificate.selectStudentFormationError'));
        return;
      }
      
      setIsCreatingDraft(true);
      try {
        console.log('🔄 Création du brouillon de certificat...');
        const res = await api.createCertificateDraft({
          apprenantId: selectedStudent.id,
          titre: certificateData.title,
          mention: certificateData.grade || undefined,
          dateObtention: certificateData.issueDate,
          formationId: certificateData.formationId || undefined,
        });
        const draft = res.data;
        setDraftId(draft.id);
        setCurrentStep(3);
        console.log('✅ Brouillon créé avec succès:', draft.id);
      } catch (error) {
        console.error('❌ Erreur création brouillon:', error);
        setError(t('createCertificate.draftError'));
      } finally {
        setIsCreatingDraft(false);
      }
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !certificateData.skills.includes(newSkill.trim())) {
      setCertificateData({
        ...certificateData,
        skills: [...certificateData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setCertificateData({
      ...certificateData,
      skills: certificateData.skills.filter(s => s !== skill)
    });
  };

  const handleScanDiploma = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;
    if (!selectedStudent) {
      setScanError(t('createCertificate.selectStudentFirst'));
      return;
    }

    setScanning(true);
    setScanError('');
    setScanResult(null);
    try {
      const res = await api.extractDiploma(file, selectedStudent.id, certificateData.formationId || undefined);
      const { extracted } = res.data;
      setScanResult(res.data);

      // Préremplir le formulaire avec les informations extraites
      setCertificateData(prev => ({
        ...prev,
        title: extracted.titre || prev.title,
        grade: extracted.mention || prev.grade,
        issueDate: extracted.dateObtention || prev.issueDate,
        description: extracted.texteBrut ? extracted.texteBrut.slice(0, 500) : prev.description,
      }));
    } catch (err) {
      setScanError(err instanceof Error ? err.message : t('createCertificate.scanError'));
    } finally {
      setScanning(false);
    }
  };

  const handlePublish = async () => {
    if (!draftId) {
      setError(t('createCertificate.draftNotFound'));
      return;
    }
    setIsPublishing(true);
    setError('');
    try {
      // 1) Générer le PDF si pas déjà fait
      const pdfRes = await api.generateCertificatePdf(draftId);
      if (!pdfRes?.data?.pdfUrl) {
        throw new Error('PDF non généré');
      }
      // 2) Émettre on-chain (MVP)
      await api.emitCertificate(draftId);
      onNavigate('certificates');
    } catch {
      setError(t('createCertificate.pdfError'));
    } finally {
    setIsPublishing(false);
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('createCertificate.title')}</h1>
          <p className="text-muted-foreground">
            {t('createCertificate.subtitle', { current: currentStep, description: steps[currentStep - 1].description })}
          </p>
        </div>
        <Button variant="outline" onClick={() => onNavigate('dashboard')} className="rounded-xl">
          {t('common.cancel')}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <Card className="border-0 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <Users className="h-5 w-5 text-primary" />}
              {currentStep === 2 && <Award className="h-5 w-5 text-primary" />}
              {currentStep === 3 && <Rocket className="h-5 w-5 text-primary" />}
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Student Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>{t('createCertificate.searchStudent')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('createCertificate.searchStudentPlaceholder')}
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t('createCertificate.linkedStudents', { count: filteredLinkedStudents.length })}</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onNavigate('students')}
                      className="rounded-lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createCertificate.linkNewStudent')}
                    </Button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">{t('createCertificate.loadingStudents')}</div>
                  ) : filteredLinkedStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredLinkedStudents.map((item) => (
                      <Card 
                          key={item.apprenant.id_apprenant}
                        className={`cursor-pointer transition-all hover:shadow-md rounded-2xl ${
                            selectedStudent?.id === item.apprenant.id_apprenant ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onClick={() => setSelectedStudent({
                            id: item.apprenant.id_apprenant,
                            name: `${item.apprenant.prenom} ${item.apprenant.nom}`,
                            email: item.apprenant.email
                          })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                                <span className="font-medium">
                                  {(item.apprenant.prenom[0] || '').toUpperCase()}{(item.apprenant.nom[0] || '').toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">{item.apprenant.prenom} {item.apprenant.nom}</h3>
                                <p className="text-sm text-muted-foreground">{item.apprenant.email}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                    {t('createCertificate.linkedOn', { date: new Date(item.dateApprobation).toLocaleDateString(dateLocale) })}
                                </Badge>
                              </div>
                            </div>
                              {selectedStudent?.id === item.apprenant.id_apprenant && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">{t('createCertificate.noLinkedStudents')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('createCertificate.noLinkedStudentsDesc')}
                      </p>
                      <Button onClick={() => onNavigate('students')} className="rounded-xl">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('createCertificate.linkStudent')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Certificate Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="p-4 bg-accent/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t('createCertificate.selectedRecipient')}</span>
                  </div>
                  <p className="text-sm">{selectedStudent?.name} - {selectedStudent?.email}</p>
                </div>

                {/* Numérisation OCR du diplôme */}
                <div className="p-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-5 w-5 text-primary" />
                    <span className="font-medium">{t('createCertificate.scanTitle')}</span>
                    <Badge variant="secondary" className="text-xs">{t('createCertificate.optional')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('createCertificate.scanDesc')}
                  </p>

                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,application/pdf"
                      className="hidden"
                      onChange={handleScanDiploma}
                      disabled={scanning}
                    />
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${scanning ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent'}`}>
                      {scanning ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> {t('createCertificate.scanInProgress')}</>
                      ) : (
                        <><Upload className="h-4 w-4" /> {t('createCertificate.importDiploma')}</>
                      )}
                    </span>
                  </label>

                  {scanError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      {scanError}
                    </div>
                  )}

                  {scanResult && (
                    <div
                      className={`p-3 rounded-lg border text-sm ${
                        scanResult.match.ok
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium mb-1">
                        {scanResult.match.ok ? (
                          <><CheckCircle2 className="h-4 w-4" /> {t('createCertificate.matchConfirmed')}</>
                        ) : (
                          <><AlertTriangle className="h-4 w-4" /> {t('createCertificate.matchToVerify')}</>
                        )}
                      </div>
                      <p className="text-xs">
                        {t('createCertificate.extractedName')} <span className="font-medium">{scanResult.extracted.nomComplet || t('createCertificate.notDetected')}</span>
                        {' '}{t('createCertificate.scoreLine', { scoreNom: Math.round(scanResult.match.scoreNom * 100), scoreFormation: Math.round(scanResult.match.scoreFormation * 100) })}
                      </p>
                      {!scanResult.match.ok && (
                        <p className="text-xs mt-1">
                          {t('createCertificate.mismatchWarning')}
                        </p>
                      )}
                      <p className="text-xs mt-1 text-muted-foreground">
                        {t('createCertificate.prefilledNote')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="formation">{t('createCertificate.formation')}</Label>
                    <Select value={certificateData.formationId} onValueChange={(value) => setCertificateData({...certificateData, formationId: value})}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder={t('createCertificate.selectFormation')} />
                      </SelectTrigger>
                      <SelectContent>
                        {formations.length > 0 ? (
                          formations.filter(f => f.statut === 'ACTIF').map((formation) => (
                            <SelectItem key={formation.id} value={formation.id.toString()}>
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                {formation.nomFormation}
                              </div>
                          </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">
                            {t('createCertificate.noFormations')}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">{t('createCertificate.certTitle')}</Label>
                    <Input
                      id="title"
                      value={certificateData.title}
                      onChange={(e) => setCertificateData({...certificateData, title: e.target.value})}
                      placeholder={t('createCertificate.certTitlePlaceholder')}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">{t('createCertificate.grade')}</Label>
                    <Input
                      id="grade"
                      value={certificateData.grade}
                      onChange={(e) => setCertificateData({...certificateData, grade: e.target.value})}
                      placeholder={t('createCertificate.gradePlaceholder')}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDate">{t('createCertificate.issueDate')}</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={certificateData.issueDate}
                      onChange={(e) => setCertificateData({...certificateData, issueDate: e.target.value})}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('createCertificate.description')}</Label>
                  <Textarea
                    id="description"
                    value={certificateData.description}
                    onChange={(e) => setCertificateData({...certificateData, description: e.target.value})}
                    placeholder={t('createCertificate.descriptionPlaceholder')}
                    className="rounded-xl"
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <Label>{t('createCertificate.skills')}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder={t('createCertificate.addSkillPlaceholder')}
                      className="h-10 rounded-lg"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    />
                    <Button 
                      type="button"
                      onClick={handleAddSkill}
                      size="sm"
                      className="rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {certificateData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {certificateData.skills.map((skill, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="flex items-center gap-1 px-3 py-1"
                        >
                          <Tag className="h-3 w-3" />
                          {skill}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRemoveSkill(skill)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review & Publish */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Certificate Preview */}
                <div className="space-y-4">
                  <Label>{t('createCertificate.certPreview')}</Label>
                  <div className="bg-gradient-to-br from-background to-accent/10 p-6 rounded-2xl">
                    <div className="aspect-[4/3] bg-white shadow-xl rounded-xl p-8 flex flex-col justify-between">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                          <Award className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold mb-2">{certificateData.title || t('createCertificate.certTitleDefault')}</h2>
                          <p className="text-lg">{t('createCertificate.awardedTo')}</p>
                          <p className="text-xl font-bold text-primary">{selectedStudent?.name}</p>
                        </div>
                        {certificateData.grade && (
                          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
                            <span className="text-primary font-medium">{t('createCertificate.mentionLabel', { grade: certificateData.grade })}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        <p>{t('createCertificate.issuedOn', { date: certificateData.issueDate || new Date().toLocaleDateString(dateLocale) })}</p>
                        <p>{t('createCertificate.previewFooter')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {t('createCertificate.summaryTitle')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createCertificate.recipient')}</span>
                        <span className="font-medium">{selectedStudent?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createCertificate.formationLabel')}</span>
                        <span className="font-medium">
                          {formations.find(f => f.id.toString() === certificateData.formationId)?.nomFormation || t('createCertificate.noFormationSelected')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createCertificate.titleLabel')}</span>
                        <span className="font-medium">{certificateData.title}</span>
                      </div>
                      {certificateData.grade && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('createCertificate.gradeLabel')}</span>
                          <span className="font-medium">{certificateData.grade}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createCertificate.skillsLabel')}</span>
                        <span className="font-medium">{t('createCertificate.skillsCertified', { count: certificateData.skills.length })}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t('createCertificate.blockchainPublish')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createCertificate.network')}</span>
                        <span className="font-medium">Polygon Mainnet</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createCertificate.estimatedCost')}</span>
                        <span className="font-medium">~0.005 MATIC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createCertificate.time')}</span>
                        <span className="font-medium">{t('createCertificate.timeValue')}</span>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <Check className="h-4 w-4" />
                          {t('createCertificate.gasIncluded')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Notification Settings */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      {t('createCertificate.notifications')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{t('createCertificate.notifyEmail')}</p>
                          <p className="text-sm text-muted-foreground">{t('createCertificate.notifyEmailDesc')}</p>
                        </div>
                        <input title={t('createCertificate.notifyEmail')} type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{t('createCertificate.addPortfolio')}</p>
                          <p className="text-sm text-muted-foreground">{t('createCertificate.addPortfolioDesc')}</p>
                        </div>
                        <input title={t('createCertificate.addPortfolio')} type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Publishing Button */}
                {isPublishing && (
                  <Card className="rounded-2xl border-primary/20 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full animate-pulse">
                          <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-2">{t('createCertificate.publishingTitle')}</h3>
                          <p className="text-muted-foreground mb-4">
                            {t('createCertificate.publishingDesc')}
                          </p>
                          <Progress value={66} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('createCertificate.back')}
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !selectedStudent) || 
                    (currentStep === 2 && (!certificateData.title || !certificateData.issueDate || !certificateData.formationId)) ||
                    isCreatingDraft // ✅ Désactiver le bouton pendant la création
                  }
                  className="rounded-xl"
                >
                  {isCreatingDraft ? t('createCertificate.creating') : t('createCertificate.continue')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handlePublish}
                  disabled={isPublishing || !draftId}
                  className="rounded-xl"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {isPublishing ? t('createCertificate.publishing') : t('createCertificate.publish')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}