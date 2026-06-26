import { useUser } from '../../hooks/useUser';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { 
  Award, 
  Search, 
  Grid3X3, 
  List, 
  Download, 
  QrCode, 
  Share2,
  Building2,
  ExternalLink,
  Shield,
  Verified,
  Ban,
  AlertTriangle,
  RefreshCw,
  Copy,
  FileText,
  Eye
} from 'lucide-react';
import { api, API_BASE } from '../../../services/api';
// QR code lib will be loaded dynamically to avoid TS type resolution issues

interface CertificatesScreenProps {
  onNavigate: (screen: string) => void;
}

type CertificateStatus = 'BROUILLON' | 'A_EMETTRE' | 'EN_COURS_EMISSION' | 'EMIS' | 'EMISSION_ECHEC' | 'EN_COURS_REVOCATION' | 'REVOQUE' | 'REVOQUE_ECHEC';

interface CertificateDto {
  id: number;
  uuid: string;
  titre: string;
  mention?: string;
  dateObtention: string;
  pdfUrl?: string;
  pdfHash?: string;
  statut: CertificateStatus;
  txHash?: string;
  contractAddress?: string;
  createdAt: string;
  formation?: {
    id: number;
    nomFormation: string;
    typeFormation: string;
  };
  etablissement?: {
    id_etablissement: number;
    nomEtablissement: string;
    typeEtablissement: string;
  };
  apprenant?: {
    id_apprenant: number;
    nom: string;
    prenom: string;
    email: string;
  };
  verificationCount?: number; // Nouveau champ pour le nombre de vérifications
  _count?: {
    verificationStats: number;
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

export function CertificatesScreen({ onNavigate }: CertificatesScreenProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | CertificateStatus>('all');
  const [selectedFormation, setSelectedFormation] = useState<string>('all');
  const [selectedEtablissement, setSelectedEtablissement] = useState<string>('all');
  const [selectedApprenant, setSelectedApprenant] = useState<string>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateDto | null>(null);
  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // QR modal state
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);

  // Revoke modal state
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Republish state
  const [republishing, setRepublishing] = useState<number | null>(null);

  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';

  // Fonction pour tronquer les adresses longues
  const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
    if (!address || address.length <= startLength + endLength) return address;
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
  };

  // Fonction pour copier dans le presse-papiers
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Vous pourriez ajouter une notification de succès ici
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        
              // Charger les certificats et les formations en parallèle
              const [certificatesRes, formationsRes] = await Promise.all([
                api.listCertificates(),
                user?.role === 'establishment' ? api.get(`/etablissement/${user.id}/formations`) : Promise.resolve({ success: true, data: [] })
              ]);
              
              console.log('📊 Certificats chargés:', certificatesRes.data);
              setCertificates(certificatesRes.data || []);
              
              if (formationsRes.success) {
                console.log('📊 Formations chargées dans CertificatesScreen:', formationsRes.data);
                setFormations(formationsRes.data || []);
              } else {
                console.log('❌ Erreur chargement formations:', formationsRes);
              }
      } catch {
        setError(t('common.loadDataError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.role, t]);

  const generateButton = () => {
    if (user?.role === 'establishment') {
      return (
        <Button onClick={() => onNavigate('create-certificate')} className="rounded-xl">
          <Award className="mr-2 h-4 w-4" />
          {t('certificates.newCertificate')}
        </Button>
      );
    } else {
      return null;
    }
  };

  const filteredCertificates = useMemo(() => {
    const filtered = certificates.filter((cert) => {
      const matchesSearch = cert.titre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || cert.statut === selectedStatus;
      const matchesFormation = selectedFormation === 'all' || 
        (cert.formation && cert.formation.id === parseInt(selectedFormation));
      const matchesEtablissement = selectedEtablissement === 'all' || 
        (cert.etablissement && cert.etablissement.id_etablissement === parseInt(selectedEtablissement));
      const matchesApprenant = selectedApprenant === 'all' || 
        (cert.apprenant && cert.apprenant.id_apprenant === parseInt(selectedApprenant));
      
      // Filtrage selon le rôle : les étudiants voient uniquement les certificats émis et révoqués
      const matchesRole = user?.role === 'establishment' || (cert.statut === 'EMIS' || cert.statut === 'REVOQUE');
      
      return matchesSearch && matchesStatus && matchesFormation && matchesEtablissement && matchesApprenant && matchesRole;
    });
    
    console.log('🔍 Filtrage certificats:', {
      total: certificates.length,
      filtered: filtered.length,
      userRole: user?.role,
      selectedStatus,
      selectedFormation,
      formations: formations.length,
      certificatesWithFormation: certificates.filter(c => c.formation).length,
      sampleCertificate: certificates[0] ? {
        id: certificates[0].id,
        titre: certificates[0].titre,
        formation: certificates[0].formation
      } : null
    });
    
    return filtered;
  }, [certificates, searchQuery, selectedStatus, selectedFormation, selectedEtablissement, selectedApprenant, user?.role, formations.length]);

  const handleDownload = (cert: CertificateDto) => {
    if (cert.pdfUrl) {
      const url = cert.pdfUrl.startsWith('http') ? cert.pdfUrl : `${API_BASE.replace(/\/$/, '')}${cert.pdfUrl}`;
      window.open(url, '_blank');
    }
  };

  const openQr = async (cert: CertificateDto) => {
    const link = `${window.location.origin}/verifier-certificat?uuid=${cert.uuid}`;
    setQrLoading(true);
    setQrDataUrl(null);
    setQrLink(link);
    try {
      type QrToDataURL = (text: string, opts?: { width?: number; margin?: number }) => Promise<string>;
      type QrModule = { default: { toDataURL: QrToDataURL } } | { toDataURL: QrToDataURL };
      const mod = (await import('qrcode')) as QrModule;
      const toDataURL: QrToDataURL = 'default' in mod ? mod.default.toDataURL : mod.toDataURL;
      const dataUrl = await toDataURL(link, { width: 256, margin: 1 });
      setQrDataUrl(dataUrl);
      setIsQrOpen(true);
    } catch {
      // ignore
    } finally {
      setQrLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedCertificate) return;
    
    try {
      setRevoking(true);
      const response = await api.revokeCertificate(selectedCertificate.id, revokeReason);
      
      // Mettre à jour la liste des certificats avec le bon statut
      setCertificates(prev => 
        prev.map(cert => 
          cert.id === selectedCertificate.id 
            ? { ...cert, statut: response.data.statut as CertificateStatus }
            : cert
        )
      );
      
      setIsRevokeOpen(false);
      setRevokeReason('');
      setSelectedCertificate(null);
      
      // Recharger la liste
      const res = await api.listCertificates();
      setCertificates(res.data || []);
      
    } catch (error) {
      console.error('Erreur révocation:', error);
    } finally {
      setRevoking(false);
    }
  };

  const handleRetryRevoke = async () => {
    if (!selectedCertificate) return;
    
    try {
      setRevoking(true);
      const response = await api.retryRevokeCertificate(selectedCertificate.id, revokeReason);
      
      // Mettre à jour la liste des certificats avec le bon statut
      setCertificates(prev => 
        prev.map(cert => 
          cert.id === selectedCertificate.id 
            ? { ...cert, statut: response.data.statut as CertificateStatus }
            : cert
        )
      );
      
      setIsRevokeOpen(false);
      setRevokeReason('');
      setSelectedCertificate(null);
      
      // Recharger la liste
      const res = await api.listCertificates();
      setCertificates(res.data || []);
      
    } catch (error) {
      console.error('Erreur re-révocation:', error);
    } finally {
      setRevoking(false);
    }
  };

  const handleRepublish = async (certificateId: number) => {
    try {
      setRepublishing(certificateId);
      
      // Trouver le certificat pour déterminer le bon appel API
      const cert = certificates.find(c => c.id === certificateId);
      if (!cert) {
        console.error('Certificat introuvable pour republication');
        return;
      }
      
      let response;
      if (cert.statut === 'EMISSION_ECHEC') {
        // Re-publication pour les certificats avec émission échouée
        response = await api.retryEmitCertificate(certificateId);
      } else if (cert.statut === 'BROUILLON') {
        // Pour les brouillons, générer d'abord le PDF puis publier
        console.log('🔄 Génération du PDF pour le certificat brouillon...');
        const pdfResponse = await api.generateCertificatePdf(certificateId);
        if (!pdfResponse?.data?.pdfUrl) {
          throw new Error('Erreur lors de la génération du PDF');
        }
        console.log('✅ PDF généré avec succès, publication en cours...');
        response = await api.emitCertificate(certificateId);
      } else {
        console.error('Statut de certificat non supporté pour republication:', cert.statut);
        return;
      }
      
      // Mettre à jour la liste des certificats avec le bon statut
      setCertificates(prev => 
        prev.map(cert => 
          cert.id === certificateId 
            ? { ...cert, statut: response.data.statut as CertificateStatus }
            : cert
        )
      );
      
      // Recharger la liste des certificats
      const res = await api.listCertificates();
      setCertificates(res.data || []);
      
    } catch (error) {
      console.error('Erreur republication:', error);
      // Vous pourriez ajouter une notification d'erreur ici
    } finally {
      setRepublishing(null);
    }
  };

  const CertificateCard = ({ certificate, isGridView }: { certificate: CertificateDto, isGridView: boolean }) => (
    <Card className={`group hover:shadow-lg transition-all duration-200 cursor-pointer ${
      isGridView ? 'h-full' : 'mb-4'
    }`} onClick={() => setSelectedCertificate(certificate)}>
      <CardContent className={`p-6 ${isGridView ? 'h-full flex flex-col' : ''}`}>
        <div className={`flex ${isGridView ? 'flex-col' : 'items-center space-x-4'}`}>
          {/* Certificate Icon/Logo */}
          <div className={`bg-primary/10 rounded-xl flex items-center justify-center ${
            isGridView ? 'w-16 h-16 mb-4 mx-auto' : 'w-12 h-12 flex-shrink-0'
          }`}>
            <Award className={`${isGridView ? 'h-8 w-8' : 'h-6 w-6'} text-primary`} />
          </div>

          <div className={`${isGridView ? 'text-center flex-1' : 'flex-1 min-w-0'}`}>
            <h3 className={`font-semibold ${isGridView ? 'mb-2' : 'mb-1'} line-clamp-2`}>
              {certificate.titre}
            </h3>
            <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground mb-2`}>
              <Building2 className="mr-1 h-3 w-3" />
              <span>{t('certificates.issuedOn', { date: new Date(certificate.dateObtention).toLocaleDateString(dateLocale) })}</span>
            </div>
            
            {/* Affichage de l'établissement pour les étudiants */}
            {user?.role === 'student' && certificate.etablissement && (
              <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground mb-2`}>
                <Building2 className="mr-1 h-3 w-3" />
                <span>{certificate.etablissement.nomEtablissement}</span>
              </div>
            )}
            
            {/* Affichage de l'étudiant pour les établissements */}
            {user?.role === 'establishment' && certificate.apprenant && (
              <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground mb-2`}>
                <Award className="mr-1 h-3 w-3" />
                <span>{certificate.apprenant.prenom} {certificate.apprenant.nom}</span>
              </div>
            )}
            
            {/* Affichage du nombre de vérifications */}
            {(() => {
              const verificationCount = certificate._count?.verificationStats || certificate.verificationCount;
              return verificationCount && verificationCount > 0 ? (
                <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground mb-2`}>
                  <Eye className="mr-1 h-3 w-3" />
                  <span>
                    {t('certificates.verificationCount', { count: verificationCount })}
                  </span>
                </div>
              ) : null;
            })()}

            {certificate.formation && (
              <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground mb-2`}>
                <Award className="mr-1 h-3 w-3" />
                <span>{certificate.formation.nomFormation}</span>
              </div>
            )}

            <div className={`flex items-center ${isGridView ? 'justify-center' : ''} space-x-2 mb-3`}>
              <Badge variant={certificate.statut === 'EMIS' ? 'default' : 'secondary'} className="text-xs">
                {certificate.statut === 'EMIS' ? (
                  <><Verified className="mr-1 h-3 w-3" /> {t('certificates.statusVerified')}</>
                ) : certificate.statut === 'BROUILLON' ? (
                  <><AlertTriangle className="mr-1 h-3 w-3" /> {t('certificates.statusDraft')}</>
                ) : certificate.statut === 'REVOQUE' ? (
                  <><Ban className="mr-1 h-3 w-3" /> {t('certificates.statusRevoked')}</>
                ) : certificate.statut === 'REVOQUE_ECHEC' ? (
                  <><AlertTriangle className="mr-1 h-3 w-3" /> {t('certificates.revocationFailed')}</>
                ) : certificate.statut === 'EN_COURS_REVOCATION' ? (
                  <><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> {t('certificates.revocationInProgress')}</>
                ) : certificate.statut === 'EMISSION_ECHEC' ? (
                  <><AlertTriangle className="mr-1 h-3 w-3" /> {t('certificates.publicationFailed')}</>
                ) : certificate.statut === 'EN_COURS_EMISSION' ? (
                  <><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> {t('certificates.publicationInProgress')}</>
                ) : (
                  <>{t('certificates.statusDraft')}</>
                )}
              </Badge>
              {certificate.mention && (
                <Badge variant="outline" className="text-xs">{certificate.mention}</Badge>
              )}
              {certificate.statut === 'BROUILLON' && user?.role === 'establishment' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRepublish(certificate.id);
                  }}
                  disabled={republishing === certificate.id}
                >
                  {republishing === certificate.id ? (
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  {t('certificates.publish')}
                </Button>
                )}
              {certificate.statut === 'EMISSION_ECHEC' && user?.role === 'establishment' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRepublish(certificate.id);
                  }}
                  disabled={republishing === certificate.id}
                >
                  {republishing === certificate.id ? (
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  {t('certificates.republish')}
                </Button>
                )}
              </div>
          </div>

          {!isGridView && (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openQr(certificate); }}>
                <QrCode className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(certificate); }} disabled={!certificate.pdfUrl}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {isGridView && (
          <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex justify-center space-x-2">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openQr(certificate); }}>
                <QrCode className="mr-1 h-3 w-3" />
                QR
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDownload(certificate); }} disabled={!certificate.pdfUrl}>
                <Download className="mr-1 h-3 w-3" />
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                <Share2 className="mr-1 h-3 w-3" />
                {t('common.share')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">{t('certificates.title')}</h1>
          <p className="text-muted-foreground">{t('certificates.subtitle')}</p>
        </div>
        {generateButton()}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('certificates.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3">
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as 'all' | CertificateStatus)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('certificates.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('certificates.all')}</SelectItem>
                  <SelectItem value="EMIS">{t('certificates.emis')}</SelectItem>
                  <SelectItem value="REVOQUE">{t('certificates.revoques')}</SelectItem>
                  {user?.role === 'establishment' && (
                    <>
                      <SelectItem value="REVOQUE_ECHEC">{t('certificates.revocationFailed')}</SelectItem>
                      <SelectItem value="EN_COURS_REVOCATION">{t('certificates.revocationInProgress')}</SelectItem>
                      <SelectItem value="EMISSION_ECHEC">{t('certificates.publicationFailed')}</SelectItem>
                      <SelectItem value="EN_COURS_EMISSION">{t('certificates.publicationInProgress')}</SelectItem>
                      <SelectItem value="BROUILLON">{t('certificates.drafts')}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {formations.length > 0 && (
                <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('certificates.formation')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('certificates.allFormations')}</SelectItem>
                    {formations.map((formation) => (
                      <SelectItem key={formation.id} value={formation.id.toString()}>
                        {formation.nomFormation}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              )}
              
              {/* Filtre par établissement - visible uniquement pour les étudiants */}
              {user?.role === 'student' && (
                <Select value={selectedEtablissement} onValueChange={setSelectedEtablissement}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('certificates.establishment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('certificates.allEstablishments')}</SelectItem>
                    {Array.from(new Set(certificates.map(cert => cert.etablissement).filter(Boolean))).map((etab) => (
                      <SelectItem key={etab!.id_etablissement} value={etab!.id_etablissement.toString()}>
                        {etab!.nomEtablissement}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Filtre par étudiant - visible uniquement pour les établissements */}
              {user?.role === 'establishment' && (
                <Select value={selectedApprenant} onValueChange={setSelectedApprenant}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('certificates.student')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('certificates.allStudents')}</SelectItem>
                    {Array.from(new Set(certificates.map(cert => cert.apprenant).filter(Boolean))).map((apprenant) => (
                      <SelectItem key={apprenant!.id_apprenant} value={apprenant!.id_apprenant.toString()}>
                        {apprenant!.prenom} {apprenant!.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error and loading */}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Certificates list */}
      {loading ? ( 
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">{t('certificates.loading')}</p>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">
            {searchQuery ? t('certificates.noneFoundSearch') : t('certificates.none')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery 
              ? t('certificates.modifySearch')
              : t('certificates.noneIssued')
            }
          </p>
          {!searchQuery && (
            generateButton()
          )}
      </div>
      ) : (
        viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCertificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} isGridView={true} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCertificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} isGridView={false} />
          ))}
        </div>
        )
      )}

      <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCertificate && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center`}>
                    <Award className={`h-8 w-8 text-primary`} />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedCertificate.titre}</DialogTitle>
                    <DialogDescription className="flex items-center mt-1">
                      <Building2 className="mr-1 h-4 w-4" />
                      {t('certificates.issuedOn', { date: new Date(selectedCertificate.dateObtention).toLocaleDateString(dateLocale) })}
                    </DialogDescription>
                  </div>
                  <Badge variant={selectedCertificate.statut === 'EMIS' ? 'default' : 'secondary'}>
                    {selectedCertificate.statut === 'EMIS' ? (
                      <><Verified className="mr-1 h-3 w-3" /> {t('certificates.statusVerified')}</>
                    ) : (
                      <>{t('certificates.statusDraft')}</>
                    )}
                  </Badge>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">{t('certificates.tabDetails')}</TabsTrigger>
                  <TabsTrigger value="security">{t('certificates.tabSecurity')}</TabsTrigger>
                  <TabsTrigger value="share">{t('certificates.tabShare')}</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  <div className="space-y-4">
                  <div>
                      <h4 className="font-semibold mb-2">{t('certificates.certInfo')}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('certificates.fieldTitle')}</span>
                          <span className="font-medium">{selectedCertificate.titre}</span>
                        </div>
                        {selectedCertificate.mention && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('certificates.fieldMention')}</span>
                            <span className="font-medium">{selectedCertificate.mention}</span>
                  </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('certificates.fieldDate')}</span>
                          <span className="font-medium">{new Date(selectedCertificate.dateObtention).toLocaleDateString(dateLocale)}</span>
                    </div>
                        {selectedCertificate.formation && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('certificates.fieldFormation')}</span>
                            <span className="font-medium">{selectedCertificate.formation.nomFormation}</span>
                  </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('certificates.fieldStatus')}</span>
                          <Badge variant={selectedCertificate.statut === 'EMIS' ? 'default' : 'secondary'} className="text-xs">
                            {selectedCertificate.statut === 'EMIS' ? (
                              <><Verified className="mr-1 h-3 w-3" /> {t('certificates.statusVerified')}</>
                            ) : (
                              <><AlertTriangle className="mr-1 h-3 w-3" /> {t('certificates.statusDraft')}</>
                            )}
                          </Badge>
                    </div>
                    </div>
                  </div>

                  <div>
                      <h4 className="font-semibold mb-2">{t('certificates.technicalIds')}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">UUID :</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {truncateAddress(selectedCertificate.uuid, 8, 8)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(selectedCertificate.uuid)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('certificates.hashPdf')}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {selectedCertificate.pdfHash ? truncateAddress(selectedCertificate.pdfHash, 8, 8) : '—'}
                            </span>
                            {selectedCertificate.pdfHash && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(selectedCertificate.pdfHash || '')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                  <div className="flex items-center space-x-3 p-4 bg-accent/50 rounded-lg">
                    <Shield className="h-6 w-6 text-primary" />
                    <div>
                      <h4 className="font-semibold">{t('certificates.securedByBlockchain')}</h4>
                      <p className="text-sm text-muted-foreground">{t('certificates.securedDesc')}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('certificates.hashPdf')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {selectedCertificate.pdfHash ? truncateAddress(selectedCertificate.pdfHash, 8, 8) : '—'}
                          </span>
                          {selectedCertificate.pdfHash && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(selectedCertificate.pdfHash || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('certificates.transaction')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {selectedCertificate.txHash ? truncateAddress(selectedCertificate.txHash, 8, 8) : '—'}
                          </span>
                          {selectedCertificate.txHash && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(selectedCertificate.txHash || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('certificates.contract')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {selectedCertificate.contractAddress ? truncateAddress(selectedCertificate.contractAddress, 8, 8) : '—'}
                          </span>
                          {selectedCertificate.contractAddress && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(selectedCertificate.contractAddress || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                      </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        if (!selectedCertificate) return;
                        try {
                          const res = await api.verifyCertificateOnchain(selectedCertificate.id);
                          const ok = res?.data?.onchain === true;
                          const msg = ok
                            ? `On-chain: Oui\nStudent: ${res.data.record?.student || '—'}\nIssuer: ${res.data.record?.issuer || '—'}`
                            : 'On-chain: Non';
                          alert(msg);
                        } catch {
                          alert(t('certificates.onchainError'));
                        }
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {t('certificates.verifyOnchain')}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (!selectedCertificate?.txHash) return;
                        const url = `https://amoy.polygonscan.com/tx/${selectedCertificate.txHash}`;
                        window.open(url, '_blank');
                      }}
                      disabled={!selectedCertificate.txHash}
                    >
                    <ExternalLink className="mr-2 h-4 w-4" />
                      {t('certificates.viewPolygonscan')}
                  </Button>
                  </div>
                </TabsContent>

                <TabsContent value="share" className="space-y-6">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-muted rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <QrCode className="h-24 w-24 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('certificates.scanToVerify')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => handleDownload(selectedCertificate)} disabled={!selectedCertificate.pdfUrl}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('common.downloadPdf')}
                    </Button>
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/verifier-certificat?uuid=${selectedCertificate.uuid}`)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      {t('common.copyLink')}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                {selectedCertificate.statut === 'BROUILLON' && user?.role === 'establishment' && (
                  <Button 
                    variant="default" 
                    onClick={() => handleRepublish(selectedCertificate.id)}
                    disabled={republishing === selectedCertificate.id}
                    className="flex items-center gap-2"
                  >
                    {republishing === selectedCertificate.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {republishing === selectedCertificate.id ? t('certificates.republishing') : t('certificates.republishToBlockchain')}
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleDownload(selectedCertificate)} disabled={!selectedCertificate.pdfUrl}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('common.downloadPdf')}
                </Button>
              </div>
            </>
          )}
          
          {/* Actions Footer */}
          {selectedCertificate && (
            <DialogFooter className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedCertificate(null)}
              >
                {t('common.close')}
              </Button>
              
              {(selectedCertificate.statut === 'EMIS' || selectedCertificate.statut === 'REVOQUE_ECHEC') && user?.role === 'establishment' && (
                <Button
                  variant="destructive"
                  onClick={() => setIsRevokeOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Ban className="h-4 w-4" />
                  {selectedCertificate.statut === 'REVOQUE_ECHEC' ? t('certificates.reRevoke') : t('certificates.revoke')}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('certificates.qrTitle')}</DialogTitle>
            <DialogDescription>{t('certificates.qrDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrLoading ? (
              <div className="text-sm text-muted-foreground">{t('certificates.qrGenerating')}</div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
            ) : (
              <div className="text-sm text-red-600">{t('certificates.qrError')}</div>
            )}
            <Input readOnly value={qrLink} className="text-xs" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(qrLink)}>
                {t('common.copyLink')}
              </Button>
              {qrDataUrl && (
                <a href={qrDataUrl} download={`qr-${Date.now()}.png`}>
                  <Button variant="outline">{t('certificates.downloadQr')}</Button>
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Modal */}
      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('certificates.revokeTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('certificates.revokeDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('certificates.revokeTarget')}</label>
              <p className="text-sm text-muted-foreground">{selectedCertificate?.titre}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">{t('certificates.revokeReason')}</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder={t('certificates.revokeReasonPlaceholder')}
                className="w-full mt-1 p-2 border rounded-md text-sm"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRevokeOpen(false);
                setRevokeReason('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={selectedCertificate?.statut === 'REVOQUE_ECHEC' ? handleRetryRevoke : handleRevoke}
              disabled={revoking}
              className="flex items-center gap-2"
            >
              {revoking ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {selectedCertificate?.statut === 'REVOQUE_ECHEC' ? t('certificates.reRevoking') : t('certificates.revoking')}
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  {selectedCertificate?.statut === 'REVOQUE_ECHEC' ? t('certificates.confirmReRevoke') : t('certificates.confirmRevoke')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}