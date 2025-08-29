import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Users, 
  Search, 
  Plus, 
  Award, 
  Eye, 
  Mail,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  UserPlus
} from 'lucide-react';

interface StudentsManagementScreenProps {
  onNavigate: (screen: string) => void;
}

export function StudentsManagementScreen({ onNavigate }: StudentsManagementScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('linked');

  // Mock data
  const linkedStudents = [
    { 
      id: 1, 
      name: 'Alice Dubois', 
      email: 'alice.dubois@email.com', 
      courses: ['Master Marketing Digital', 'Formation Leadership'], 
      certificates: 5,
      lastActivity: '2024-01-15',
      status: 'active',
      joinDate: '2023-09-15'
    },
    { 
      id: 2, 
      name: 'Jean Martin', 
      email: 'jean.martin@email.com', 
      courses: ['Certification Agile', 'Formation Management'], 
      certificates: 3,
      lastActivity: '2024-01-12',
      status: 'active',
      joinDate: '2023-10-20'
    },
    { 
      id: 3, 
      name: 'Sophie Laurent', 
      email: 'sophie.laurent@email.com', 
      courses: ['Master Commerce International'], 
      certificates: 8,
      lastActivity: '2024-01-10',
      status: 'active',
      joinDate: '2023-08-30'
    },
    { 
      id: 4, 
      name: 'Thomas Wilson', 
      email: 'thomas.wilson@email.com', 
      courses: ['Formation Data Science'], 
      certificates: 2,
      lastActivity: '2023-12-20',
      status: 'inactive',
      joinDate: '2023-11-10'
    },
  ];

  const pendingRequests = [
    {
      id: 1,
      name: 'Marie Leroy',
      email: 'marie.leroy@email.com',
      course: 'Master Marketing Digital',
      requestDate: '2024-01-15',
      message: 'Bonjour, je souhaite lier mon compte étudiant pour obtenir mes certificats du Master Marketing Digital suivi en 2023.',
      documents: ['transcript.pdf', 'student_id.jpg']
    },
    {
      id: 2,
      name: 'Pierre Dubois',
      email: 'pierre.dubois@email.com',
      course: 'Formation Leadership',
      requestDate: '2024-01-14',
      message: 'Demande de liaison pour la formation Leadership Management terminée en décembre 2023.',
      documents: ['certificate_completion.pdf']
    },
    {
      id: 3,
      name: 'Emma Rodriguez',
      email: 'emma.rodriguez@email.com',
      course: 'Certification Agile Scrum Master',
      requestDate: '2024-01-13',
      message: 'Je souhaite récupérer mon certificat Scrum Master obtenu lors de la session d\'automne 2023.',
      documents: ['scrum_certificate.pdf', 'exam_results.pdf']
    }
  ];

  const filteredLinkedStudents = linkedStudents.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.courses.some(course => course.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPendingRequests = pendingRequests.filter(request =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApproveRequest = (requestId: number) => {
    console.log('Approving request:', requestId);
    // Here you would handle the approval logic
  };

  const handleRejectRequest = (requestId: number) => {
    console.log('Rejecting request:', requestId);
    // Here you would handle the rejection logic
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Gestion des étudiants</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Gérez vos étudiants liés et traitez les nouvelles demandes de liaison
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" className="rounded-xl w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button className="rounded-xl w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter un étudiant
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email ou formation..."
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Button variant="outline" className="rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted">
          <TabsTrigger value="linked" className="flex items-center gap-2 h-10 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            Étudiants liés ({linkedStudents.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2 h-10 rounded-lg">
            <Clock className="h-4 w-4" />
            Demandes en attente ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Linked Students Tab */}
        <TabsContent value="linked" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total étudiants</p>
                    <p className="text-3xl font-bold">{linkedStudents.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Étudiants actifs</p>
                    <p className="text-3xl font-bold">{linkedStudents.filter(s => s.status === 'active').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Certificats émis</p>
                    <p className="text-3xl font-bold">{linkedStudents.reduce((acc, s) => acc + s.certificates, 0)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Award className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Liste des étudiants liés</CardTitle>
              <CardDescription>
                Gérez vos étudiants et leurs certificats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredLinkedStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {student.status === 'active' ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {student.certificates} certificats
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {student.courses.length} formations
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => onNavigate('profile')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir profil
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-lg"
                        onClick={() => onNavigate('create-certificate')}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Créer certificat
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-lg">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredLinkedStudents.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Aucun étudiant trouvé</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Modifiez votre recherche ou' : 'Commencez par'} inviter des étudiants à se lier à votre établissement.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="rounded-2xl border-orange-200 bg-gradient-to-br from-orange-50 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Demandes en attente</p>
                    <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Traitées cette semaine</p>
                    <p className="text-3xl font-bold">12</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Temps moyen de traitement</p>
                    <p className="text-3xl font-bold">2.5j</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {filteredPendingRequests.map((request) => (
              <Card key={request.id} className="rounded-2xl border-orange-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-50">
                            {request.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{request.name}</h3>
                          <p className="text-sm text-muted-foreground">{request.email}</p>
                          <Badge variant="outline" className="mt-2">
                            {request.course}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Demandé le {new Date(request.requestDate).toLocaleDateString('fr-FR')}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 bg-accent/30 rounded-xl">
                      <h4 className="font-medium mb-2">Message de l'étudiant :</h4>
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                    </div>

                    {request.documents.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Documents fournis ({request.documents.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {request.documents.map((doc, index) => (
                            <Badge key={index} variant="outline" className="cursor-pointer">
                              {doc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg">
                          <Mail className="h-4 w-4 mr-1" />
                          Contacter
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg">
                          <Eye className="h-4 w-4 mr-1" />
                          Voir détails
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                        <Button 
                          size="sm" 
                          className="rounded-lg bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredPendingRequests.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">
                  {searchQuery ? 'Aucune demande trouvée' : 'Aucune demande en attente'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? 'Modifiez votre recherche pour voir d\'autres demandes.' 
                    : 'Toutes les demandes de liaison ont été traitées.'
                  }
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}