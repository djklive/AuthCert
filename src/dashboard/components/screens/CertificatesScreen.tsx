import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Award, 
  Search, 
  Grid3X3, 
  List, 
  Eye, 
  Download, 
  QrCode, 
  Share2,
  Building2,
  ExternalLink,
  Shield,
  Verified
} from 'lucide-react';

// Mock data
const mockCertificates = [
  {
    id: 1,
    title: "Certification React Advanced",
    institution: "Tech Academy",
    institutionLogo: "🎓",
    date: "15 Jan 2024",
    status: "verified",
    views: 24,
    category: "Développement",
    description: "Certification avancée en développement React avec hooks, context et performance",
    skills: ["React", "JavaScript", "Hooks", "Performance"],
    issueDate: "15 Jan 2024",
    expiryDate: "15 Jan 2027",
    credentialId: "REACT-ADV-2024-001",
    color: "bg-primary"
  },
  {
    id: 2,
    title: "UX/UI Design Professional",
    institution: "Design Institute",
    institutionLogo: "🎨",
    date: "08 Déc 2023",
    status: "verified",
    views: 15,
    category: "Design",
    description: "Certification professionnelle en design UX/UI avec projets pratiques",
    skills: ["Figma", "Prototyping", "User Research", "Design Systems"],
    issueDate: "08 Déc 2023",
    expiryDate: "08 Déc 2026",
    credentialId: "UX-PRO-2023-089",
    color: "bg-chart-2"
  },
  {
    id: 3,
    title: "Project Management PMP",
    institution: "Business School",
    institutionLogo: "📊",
    date: "22 Nov 2023",
    status: "pending",
    views: 3,
    category: "Management",
    description: "Certification Project Management Professional reconnue internationalement",
    skills: ["Leadership", "Agile", "Risk Management", "Communication"],
    issueDate: "22 Nov 2023",
    expiryDate: "22 Nov 2026",
    credentialId: "PMP-2023-145",
    color: "bg-chart-4"
  },
  {
    id: 4,
    title: "Data Science Fundamentals",
    institution: "Data University",
    institutionLogo: "📈",
    date: "10 Oct 2023",
    status: "verified",
    views: 31,
    category: "Data",
    description: "Formation complète aux fondamentaux de la science des données",
    skills: ["Python", "Machine Learning", "Statistics", "Visualization"],
    issueDate: "10 Oct 2023",
    expiryDate: "10 Oct 2026",
    credentialId: "DS-FUND-2023-067",
    color: "bg-chart-5"
  }
];

interface CertificatesScreenProps {
  onNavigate: (screen: string) => void;
}

export function CertificatesScreen({ onNavigate }: CertificatesScreenProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState<typeof mockCertificates[0] | null>(null);

  const filteredCertificates = mockCertificates.filter(cert => {
    const matchesSearch = cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.institution.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || cert.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || cert.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const CertificateCard = ({ certificate, isGridView }: { certificate: typeof mockCertificates[0], isGridView: boolean }) => (
    <Card className={`group hover:shadow-lg transition-all duration-200 cursor-pointer ${
      isGridView ? 'h-full' : 'mb-4'
    }`} onClick={() => setSelectedCertificate(certificate)}>
      <CardContent className={`p-6 ${isGridView ? 'h-full flex flex-col' : ''}`}>
        <div className={`flex ${isGridView ? 'flex-col' : 'items-center space-x-4'}`}>
          {/* Certificate Icon/Logo */}
          <div className={`${certificate.color}/10 rounded-xl flex items-center justify-center ${
            isGridView ? 'w-16 h-16 mb-4 mx-auto' : 'w-12 h-12 flex-shrink-0'
          }`}>
            <Award className={`${certificate.color.replace('bg-', 'text-')} ${isGridView ? 'h-8 w-8' : 'h-6 w-6'}`} />
          </div>

          <div className={`${isGridView ? 'text-center flex-1' : 'flex-1 min-w-0'}`}>
            {/* Title and Institution */}
            <h3 className={`font-semibold ${isGridView ? 'mb-2' : 'mb-1'} line-clamp-2`}>
              {certificate.title}
            </h3>
            <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground mb-2`}>
              <Building2 className="mr-1 h-3 w-3" />
              <span>{certificate.institution}</span>
            </div>

            {/* Status and Date */}
            <div className={`flex items-center ${isGridView ? 'justify-center' : ''} space-x-2 mb-3`}>
              <Badge variant={certificate.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                {certificate.status === 'verified' ? (
                  <><Verified className="mr-1 h-3 w-3" /> Vérifié</>
                ) : (
                  <>En attente</>
                )}
              </Badge>
              <span className="text-xs text-muted-foreground">{certificate.date}</span>
            </div>

            {/* Stats */}
            <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground`}>
              <Eye className="mr-1 h-3 w-3" />
              <span>{certificate.views} vues</span>
            </div>

            {/* Skills (Grid only) */}
            {isGridView && (
              <div className="flex flex-wrap justify-center gap-1 mt-3">
                {certificate.skills.slice(0, 2).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {certificate.skills.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{certificate.skills.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions (List view) */}
          {!isGridView && (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <QrCode className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions (Grid view) */}
        {isGridView && (
          <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex justify-center space-x-2">
              <Button size="sm" variant="outline">
                <QrCode className="mr-1 h-3 w-3" />
                QR
              </Button>
              <Button size="sm" variant="outline">
                <Download className="mr-1 h-3 w-3" />
                PDF
              </Button>
              <Button size="sm" variant="outline">
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Mes Certificats</h1>
          <p className="text-muted-foreground">Gérez et partagez vos credentials</p>
        </div>
        <Button onClick={() => onNavigate('create-certificate')} className="rounded-xl">
          <Award className="mr-2 h-4 w-4" />
          Nouveau certificat
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  <SelectItem value="Développement">Développement</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="Data">Data</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="verified">Vérifiés</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
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

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCertificates.length} certificat{filteredCertificates.length !== 1 ? 's' : ''} trouvé{filteredCertificates.length !== 1 ? 's' : ''}
        </p>
        <Select defaultValue="recent">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Plus récents</SelectItem>
            <SelectItem value="oldest">Plus anciens</SelectItem>
            <SelectItem value="name">Par nom</SelectItem>
            <SelectItem value="institution">Par établissement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certificates Grid/List */}
      {viewMode === 'grid' ? (
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
      )}

      {/* Certificate Detail Modal */}
      <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCertificate && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-16 h-16 ${selectedCertificate.color}/10 rounded-xl flex items-center justify-center`}>
                    <Award className={`h-8 w-8 ${selectedCertificate.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedCertificate.title}</DialogTitle>
                    <DialogDescription className="flex items-center mt-1">
                      <Building2 className="mr-1 h-4 w-4" />
                      {selectedCertificate.institution}
                    </DialogDescription>
                  </div>
                  <Badge variant={selectedCertificate.status === 'verified' ? 'default' : 'secondary'}>
                    {selectedCertificate.status === 'verified' ? (
                      <><Verified className="mr-1 h-3 w-3" /> Vérifié</>
                    ) : (
                      <>En attente</>
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
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedCertificate.description}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Compétences acquises</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCertificate.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-1">Date d'émission</h4>
                      <p className="text-muted-foreground">{selectedCertificate.issueDate}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Date d'expiration</h4>
                      <p className="text-muted-foreground">{selectedCertificate.expiryDate}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">ID Credential</h4>
                    <p className="text-muted-foreground font-mono text-sm">{selectedCertificate.credentialId}</p>
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

                  <div>
                    <h4 className="font-semibold mb-3">Informations de vérification</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hash blockchain:</span>
                        <span className="font-mono">0x7f8a...9e2d</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timestamp:</span>
                        <span>{selectedCertificate.issueDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Statut:</span>
                        <Badge variant="outline" className="text-xs">
                          <Verified className="mr-1 h-2 w-2" />
                          Vérifié
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Vérifier sur la blockchain
                  </Button>
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
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger QR
                    </Button>
                    <Button variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Copier lien
                    </Button>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Statistiques</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vues totales:</span>
                      <span className="font-semibold">{selectedCertificate.views}</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger PDF
                </Button>
                <Button>
                  <Share2 className="mr-2 h-4 w-4" />
                  Partager
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}