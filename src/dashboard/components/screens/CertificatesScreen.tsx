import { useUser } from '../../hooks/useUser';
import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { api, API_BASE } from '../../../services/api';
// QR code lib will be loaded dynamically to avoid TS type resolution issues

interface CertificatesScreenProps {
  onNavigate: (screen: string) => void;
}

interface CertificateDto {
  id: number;
  uuid: string;
  titre: string;
  mention?: string;
  dateObtention: string;
  pdfUrl?: string;
  pdfHash?: string;
  statut: 'BROUILLON' | 'A_EMETTRE' | 'EMIS' | 'REVOQUE';
  txHash?: string;
  contractAddress?: string;
  createdAt: string;
}

export function CertificatesScreen({ onNavigate }: CertificatesScreenProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'EMIS' | 'BROUILLON'>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateDto | null>(null);
  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
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
        const res = await api.listCertificates();
        setCertificates(res.data || []);
      } catch {
        setError('Erreur lors du chargement des certificats');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const generateButton = () => {
    if (user?.role === 'establishment') {
      return (
        <Button onClick={() => onNavigate('create-certificate')} className="rounded-xl">
          <Award className="mr-2 h-4 w-4" />
          Nouveau certificat
        </Button>
      );
    } else {
      return null;
    }
  };

  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      const matchesSearch = cert.titre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || cert.statut === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [certificates, searchQuery, selectedStatus]);

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
      await api.revokeCertificate(selectedCertificate.id, revokeReason);
      
      // Mettre à jour la liste des certificats
      setCertificates(prev => 
        prev.map(cert => 
          cert.id === selectedCertificate.id 
            ? { ...cert, statut: 'REVOQUE' as const }
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

  const handleRepublish = async (certificateId: number) => {
    try {
      setRepublishing(certificateId);
      
      // 1) Générer le PDF si pas déjà fait
      const pdfRes = await api.generateCertificatePdf(certificateId);
      if (!pdfRes?.data?.pdfUrl) {
        throw new Error('PDF non généré');
      }
      
      // 2) Émettre sur la blockchain
      await api.emitCertificate(certificateId);
      
      // 3) Recharger la liste des certificats
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
              <span>Émis le {new Date(certificate.dateObtention).toLocaleDateString('fr-FR')}</span>
            </div>

            <div className={`flex items-center ${isGridView ? 'justify-center' : ''} space-x-2 mb-3`}>
              <Badge variant={certificate.statut === 'EMIS' ? 'default' : 'secondary'} className="text-xs">
                {certificate.statut === 'EMIS' ? (
                  <><Verified className="mr-1 h-3 w-3" /> Vérifié</>
                ) : certificate.statut === 'BROUILLON' ? (
                  <><AlertTriangle className="mr-1 h-3 w-3" /> Brouillon</>
                ) : (
                  <>Brouillon</>
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
                  Republier
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
                Partager
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
          <h1 className="text-3xl font-bold">Mes Certificats</h1>
          <p className="text-muted-foreground">Gérez et partagez vos credentials</p>
        </div>
        {generateButton()}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3">
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as 'all' | 'EMIS' | 'BROUILLON')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="EMIS">Émis</SelectItem>
                  <SelectItem value="BROUILLON">Brouillons</SelectItem>
                </SelectContent>
              </Select>
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
          <p className="text-sm text-muted-foreground mt-2">Chargement des certificats...</p>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">
            {searchQuery ? 'Aucun certificat trouvé' : 'Aucun certificat'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery 
              ? 'Modifiez votre recherche pour voir d\'autres certificats.' 
              : 'Aucun certificat n\'a été émis pour le moment.'
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
                      Émis le {new Date(selectedCertificate.dateObtention).toLocaleDateString('fr-FR')}
                    </DialogDescription>
                  </div>
                  <Badge variant={selectedCertificate.statut === 'EMIS' ? 'default' : 'secondary'}>
                    {selectedCertificate.statut === 'EMIS' ? (
                      <><Verified className="mr-1 h-3 w-3" /> Vérifié</>
                    ) : (
                      <>Brouillon</>
                    )}
                  </Badge>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Détails</TabsTrigger>
                  <TabsTrigger value="security">Sécurité</TabsTrigger>
                  <TabsTrigger value="share">Partage</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Informations du certificat</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Titre:</span>
                          <span className="font-medium">{selectedCertificate.titre}</span>
                        </div>
                        {selectedCertificate.mention && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Mention:</span>
                            <span className="font-medium">{selectedCertificate.mention}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date d'obtention:</span>
                          <span className="font-medium">{new Date(selectedCertificate.dateObtention).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Statut:</span>
                          <Badge variant={selectedCertificate.statut === 'EMIS' ? 'default' : 'secondary'} className="text-xs">
                            {selectedCertificate.statut === 'EMIS' ? (
                              <><Verified className="mr-1 h-3 w-3" /> Vérifié</>
                            ) : (
                              <><AlertTriangle className="mr-1 h-3 w-3" /> Brouillon</>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Identifiants techniques</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">UUID:</span>
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
                          <span className="text-muted-foreground">Hash PDF:</span>
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
                      <h4 className="font-semibold">Sécurisé par Blockchain</h4>
                      <p className="text-sm text-muted-foreground">Ce certificat est vérifiable et infalsifiable</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Hash PDF:</span>
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
                        <span className="text-muted-foreground">Transaction:</span>
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
                        <span className="text-muted-foreground">Contrat:</span>
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
                          alert('Erreur vérification on-chain');
                        }
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Vérifier on-chain
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
                      Voir sur Polygonscan
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="share" className="space-y-6">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-muted rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <QrCode className="h-24 w-24 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Scannez ce QR code pour vérifier le certificat
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => handleDownload(selectedCertificate)} disabled={!selectedCertificate.pdfUrl}>
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger PDF
                    </Button>
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/verifier-certificat?uuid=${selectedCertificate.uuid}`)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Copier lien
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
                    {republishing === selectedCertificate.id ? 'Republication...' : 'Republier sur blockchain'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => handleDownload(selectedCertificate)} disabled={!selectedCertificate.pdfUrl}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger PDF
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
                Fermer
              </Button>
              
              {selectedCertificate.statut === 'EMIS' && user?.role === 'establishment' && (
                <Button
                  variant="destructive"
                  onClick={() => setIsRevokeOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Révoquer
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
            <DialogTitle>Vérifier le certificat</DialogTitle>
            <DialogDescription>Scannez ce QR ou utilisez le lien</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrLoading ? (
              <div className="text-sm text-muted-foreground">Génération du QR...</div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
            ) : (
              <div className="text-sm text-red-600">Erreur de génération</div>
            )}
            <Input readOnly value={qrLink} className="text-xs" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(qrLink)}>
                Copier lien
              </Button>
              {qrDataUrl && (
                <a href={qrDataUrl} download={`qr-${Date.now()}.png`}>
                  <Button variant="outline">Télécharger QR</Button>
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
              Révoquer le certificat
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le certificat sera marqué comme révoqué et ne pourra plus être utilisé.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Certificat à révoquer</label>
              <p className="text-sm text-muted-foreground">{selectedCertificate?.titre}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Raison de la révocation (optionnel)</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ex: Erreur dans les informations, certificat frauduleux..."
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
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
              className="flex items-center gap-2"
            >
              {revoking ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Révocation...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Confirmer la révocation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}