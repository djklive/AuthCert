import { useState } from 'react';
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
  X
} from 'lucide-react';

interface Student {
  id: number;
  name: string;
  email: string;
  courses: string[];
  certificates: number;
  avatar: string;
}

interface CreateCertificateScreenProps {
  onNavigate: (screen: string) => void;
}

export function CreateCertificateScreen({ onNavigate }: CreateCertificateScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [certificateData, setCertificateData] = useState({
    type: '',
    title: '',
    grade: '',
    issueDate: '',
    completionDate: '',
    skills: [] as string[],
    description: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Mock students data
  const students = [
    { id: 1, name: 'Alice Dubois', email: 'alice.dubois@email.com', courses: ['Master Marketing', 'Formation Leadership'], certificates: 3, avatar: 'AD' },
    { id: 2, name: 'Jean Martin', email: 'jean.martin@email.com', courses: ['Certification Agile', 'Formation Management'], certificates: 1, avatar: 'JM' },
    { id: 3, name: 'Sophie Laurent', email: 'sophie.laurent@email.com', courses: ['Master Commerce', 'Formation Digital'], certificates: 5, avatar: 'SL' },
    { id: 4, name: 'Thomas Wilson', email: 'thomas.wilson@email.com', courses: ['Formation Data Science'], certificates: 0, avatar: 'TW' },
  ];

  const certificateTypes = [
    { value: 'diploma', label: 'Diplôme' },
    { value: 'certificate', label: 'Certificat de formation' },
    { value: 'attendance', label: 'Attestation de présence' },
    { value: 'competency', label: 'Certification de compétences' }
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const steps = [
    { title: 'Sélection de l\'étudiant', description: 'Choisissez l\'étudiant destinataire du certificat' },
    { title: 'Détails du certificat', description: 'Configurez les informations du certificat' },
    { title: 'Vérification & Publication', description: 'Validez et publiez sur la blockchain' }
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
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

  const handlePublish = async () => {
    setIsPublishing(true);
    // Simulate blockchain publication process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsPublishing(false);
    onNavigate('certificates');
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Créer un certificat</h1>
          <p className="text-muted-foreground">
            Étape {currentStep} sur 3 - {steps[currentStep - 1].description}
          </p>
        </div>
        <Button variant="outline" onClick={() => onNavigate('dashboard')} className="rounded-xl">
          Annuler
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
        </div>

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
                  <Label>Rechercher un étudiant</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nom ou email de l'étudiant..."
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Étudiants liés ({filteredStudents.length})</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onNavigate('students')}
                      className="rounded-lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Lier un nouvel étudiant
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStudents.map((student) => (
                      <Card 
                        key={student.id}
                        className={`cursor-pointer transition-all hover:shadow-md rounded-2xl ${
                          selectedStudent?.id === student.id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                              <span className="font-medium">{student.avatar}</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{student.name}</h3>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {student.certificates} certificats
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {student.courses.length} formations
                                </Badge>
                              </div>
                            </div>
                            {selectedStudent?.id === student.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Aucun étudiant trouvé</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Modifiez votre recherche ou liez de nouveaux étudiants à votre établissement.
                      </p>
                      <Button onClick={() => onNavigate('students')} className="rounded-xl">
                        <Plus className="h-4 w-4 mr-2" />
                        Lier un étudiant
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
                    <span className="font-medium">Destinataire sélectionné</span>
                  </div>
                  <p className="text-sm">{selectedStudent?.name} - {selectedStudent?.email}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type de certificat *</Label>
                    <Select value={certificateData.type} onValueChange={(value) => setCertificateData({...certificateData, type: value})}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {certificateTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Titre du certificat *</Label>
                    <Input
                      id="title"
                      value={certificateData.title}
                      onChange={(e) => setCertificateData({...certificateData, title: e.target.value})}
                      placeholder="Master en Marketing Digital"
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">Mention/Note</Label>
                    <Input
                      id="grade"
                      value={certificateData.grade}
                      onChange={(e) => setCertificateData({...certificateData, grade: e.target.value})}
                      placeholder="Très Bien, 18/20, A+..."
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Date d'émission *</Label>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={certificateData.description}
                    onChange={(e) => setCertificateData({...certificateData, description: e.target.value})}
                    placeholder="Description des compétences acquises ou du contenu de la formation..."
                    className="rounded-xl"
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Compétences certifiées</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Ajouter une compétence..."
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
                  <Label>Aperçu du certificat</Label>
                  <div className="bg-gradient-to-br from-background to-accent/10 p-6 rounded-2xl">
                    <div className="aspect-[4/3] bg-white shadow-xl rounded-xl p-8 flex flex-col justify-between">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                          <Award className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold mb-2">{certificateData.title || 'Titre du certificat'}</h2>
                          <p className="text-lg">Décerné à</p>
                          <p className="text-xl font-bold text-primary">{selectedStudent?.name}</p>
                        </div>
                        {certificateData.grade && (
                          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
                            <span className="text-primary font-medium">Mention : {certificateData.grade}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        <p>Émis le {certificateData.issueDate || new Date().toLocaleDateString('fr-FR')}</p>
                        <p>École Supérieure de Commerce • Certificat sécurisé par blockchain</p>
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
                        Résumé du certificat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Destinataire :</span>
                        <span className="font-medium">{selectedStudent?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type :</span>
                        <span className="font-medium">
                          {certificateTypes.find(t => t.value === certificateData.type)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Titre :</span>
                        <span className="font-medium">{certificateData.title}</span>
                      </div>
                      {certificateData.grade && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mention :</span>
                          <span className="font-medium">{certificateData.grade}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Compétences :</span>
                        <span className="font-medium">{certificateData.skills.length} certifiées</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Publication blockchain
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Réseau :</span>
                        <span className="font-medium">Ethereum Mainnet</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coût estimé :</span>
                        <span className="font-medium">~0.005 ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Temps :</span>
                        <span className="font-medium">2-5 minutes</span>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <Check className="h-4 w-4" />
                          Frais de gaz inclus dans votre abonnement
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
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Notifier l'étudiant par email</p>
                          <p className="text-sm text-muted-foreground">L'étudiant recevra un email avec le lien de téléchargement</p>
                        </div>
                        <input title="Notifier l'étudiant par email" type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Ajouter au portfolio public</p>
                          <p className="text-sm text-muted-foreground">Le certificat sera visible sur le profil public de l'étudiant</p>
                        </div>
                        <input title='Ajouter au portfolio public' type="checkbox" defaultChecked className="rounded" />
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
                          <h3 className="font-bold text-lg mb-2">Publication en cours...</h3>
                          <p className="text-muted-foreground mb-4">
                            Votre certificat est en cours de publication sur la blockchain. Cela peut prendre quelques minutes.
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
                Retour
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  onClick={handleNext}
                  disabled={currentStep === 1 && !selectedStudent}
                  className="rounded-xl"
                >
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handlePublish}
                  disabled={isPublishing || !certificateData.type || !certificateData.title}
                  className="rounded-xl"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  {isPublishing ? 'Publication...' : 'Publier le certificat'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}