import { useState } from 'react';
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
  Calendar
} from 'lucide-react';

// Mock data
const mockRequests = [
  {
    id: 1,
    title: "Certification JavaScript Advanced",
    establishment: "Tech Academy",
    course: "JavaScript ES6+ & Modern Frameworks",
    status: "pending",
    date: "15 Mar 2024",
    estimatedCompletion: "25 Mar 2024",
    progress: 65,
    documents: ["transcript.pdf", "completion_proof.jpg"]
  },
  {
    id: 2,
    title: "UX Research Specialist",
    establishment: "Design Institute",
    course: "User Experience Research Methods",
    status: "approved",
    date: "10 Mar 2024",
    estimatedCompletion: "20 Mar 2024",
    progress: 100,
    documents: ["portfolio.pdf", "project_summary.docx"]
  },
  {
    id: 3,
    title: "Data Analysis Fundamentals",
    establishment: "Data University",
    course: "Introduction to Data Science",
    status: "rejected",
    date: "05 Mar 2024",
    estimatedCompletion: "-",
    progress: 0,
    documents: ["incomplete_coursework.pdf"],
    rejectionReason: "Documentation incomplète - veuillez soumettre tous les travaux requis"
  }
];

const establishments = [
  { id: 1, name: "Tech Academy", courses: ["JavaScript Advanced", "React Professional", "Node.js Expert"] },
  { id: 2, name: "Design Institute", courses: ["UX Research", "UI Design", "Design Systems"] },
  { id: 3, name: "Data University", courses: ["Data Analysis", "Machine Learning", "Statistics"] }
];

interface RequestsScreenProps {
  onNavigate: (screen: string) => void;
}

export function RequestsScreen({ onNavigate }: RequestsScreenProps) {
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEstablishment, setSelectedEstablishment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approuvé
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Refusé
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => file.name);
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const handleSubmitRequest = () => {
    // Submit logic here
    setIsNewRequestOpen(false);
    setCurrentStep(1);
    setSelectedEstablishment('');
    setSelectedCourse('');
    setRequestMessage('');
    setUploadedFiles([]);
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const selectedEstablishmentData = establishments.find(e => e.name === selectedEstablishment);

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

            <div className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={currentStep >= 1 ? "text-primary" : "text-muted-foreground"}>
                    Établissement
                  </span>
                  <span className={currentStep >= 2 ? "text-primary" : "text-muted-foreground"}>
                    Formation
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
                    <Select value={selectedEstablishment} onValueChange={setSelectedEstablishment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un établissement" />
                      </SelectTrigger>
                      <SelectContent>
                        {establishments.map((est) => (
                          <SelectItem key={est.id} value={est.name}>
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>{est.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEstablishment && (
                    <div className="p-4 bg-accent/50 rounded-lg">
                      <h4 className="font-semibold mb-2">À propos de {selectedEstablishment}</h4>
                      <p className="text-sm text-muted-foreground">
                        Cet établissement propose {selectedEstablishmentData?.courses.length} formations certifiantes.
                        En moyenne, les demandes sont traitées sous 5-7 jours ouvrés.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Course */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="course">Sélectionner une formation</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une formation" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedEstablishmentData?.courses.map((course, index) => (
                          <SelectItem key={index} value={course}>
                            {course}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCourse && (
                    <div className="p-4 bg-accent/50 rounded-lg">
                      <h4 className="font-semibold mb-2">{selectedCourse}</h4>
                      <p className="text-sm text-muted-foreground">
                        Formation certifiante reconnue. Durée moyenne: 3-6 mois.
                        Prérequis: connaissances de base recommandées.
                      </p>
                    </div>
                  )}
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="documents">Documents justificatifs</Label>
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
                            <span className="text-sm">{file}</span>
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
                      (currentStep === 1 && !selectedEstablishment) ||
                      (currentStep === 2 && !selectedCourse)
                    }
                  >
                    Suivant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={!requestMessage.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer la demande
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">8</p>
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
                <p className="text-2xl font-bold">3</p>
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
                <p className="text-2xl font-bold">4</p>
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
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-muted-foreground">Refusées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Mes demandes</CardTitle>
          <CardDescription>Suivez l'état de vos demandes de certificat</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {mockRequests.map((request) => (
            <div key={request.id} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-lg">{request.title}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center">
                      <Building2 className="mr-1 h-3 w-3" />
                      {request.establishment}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      Demandé le {request.date}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{request.course}</p>
                  
                  {request.status === 'pending' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression du traitement</span>
                        <span>{request.progress}%</span>
                      </div>
                      <Progress value={request.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Estimation de finalisation: {request.estimatedCompletion}
                      </p>
                    </div>
                  )}

                  {request.status === 'rejected' && request.rejectionReason && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium mb-1">Raison du refus:</p>
                      <p className="text-sm text-muted-foreground">{request.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {request.documents.length} document{request.documents.length !== 1 ? 's' : ''} fourni{request.documents.length !== 1 ? 's' : ''}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Voir détails
                  </Button>
                  {request.status === 'rejected' && (
                    <Button size="sm">
                      Relancer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}