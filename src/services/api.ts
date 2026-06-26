// const API_BASE_URL = import.meta.env.BACKEND_URL || 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
const API_BASE_URL = 'http://localhost:5000/api';
export const API_BASE = API_BASE_URL;

export interface Document {
  id: number;
  typeDocument: string;
  nomFichier: string;
  cheminFichier: string;
  dateUpload: string;
}

export interface Establishment {
    id_etablissement: number;
    nomEtablissement: string;
    emailEtablissement: string;
    statut: 'EN_ATTENTE' | 'ACTIF' | 'REJETE' | 'SUSPENDU';
    dateCreation: string;
    nomResponsableEtablissement: string;
    telephoneEtablissement: string;
    adresseEtablissement: string;
    typeEtablissement: string;
    documents: Document[];
  }

// Interfaces abonnement
export interface PlanLimits {
  certificatsParMois: number | null;
  apprenants: number | null;
  formations: number | null;
  storageGB: number | null;
  statsAvancees: boolean;
  apiAccess: boolean;
}

export interface SubscriptionSummary {
  subscription: {
    plan: string;
    planName: string;
    statut: 'TRIAL' | 'ACTIF' | 'PAST_DUE' | 'EXPIRE' | 'ANNULE';
    periode: 'MENSUEL' | 'ANNUEL';
    dateDebut: string;
    dateFin: string;
    actif: boolean;
    annulationDemandee: boolean;
  };
  limits: PlanLimits;
  usage: {
    certificats: { utilises: number; limite: number | null; restant: number | null; depasse: boolean };
    apprenants: { utilises: number; limite: number | null };
    formations: { utilises: number; limite: number | null };
    fenetreJours: number;
  };
}

export interface PaymentRecord {
  id: number;
  reference: string;
  montant: number;
  devise: string;
  plan: string;
  periode: 'MENSUEL' | 'ANNUEL';
  statut: 'EN_ATTENTE' | 'REUSSI' | 'ECHOUE' | 'ANNULE';
  paidAt?: string | null;
  createdAt: string;
}

// Interfaces pour les demandes de certificat
export interface DocumentDemandeCertificat {
  id: number;
  nomFichier: string;
  typeMime: string;
  tailleFichier: number;
  cheminFichier: string;
  dateUpload: string;
}

export interface DemandeCertificat {
  id: number;
  titre: string;
  description?: string;
  messageDemande?: string;
  statutDemande: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE' | 'EN_COURS_TRAITEMENT';
  dateDemande: string;
  dateTraitement?: string;
  messageReponse?: string;
  traitePar?: number;
  apprenant: {
    id_apprenant: number;
    nomApprenant: string;
    prenomApprenant: string;
    emailApprenant: string;
  };
  etablissement: {
    id_etablissement: number;
    nomEtablissement: string;
  };
  documents: DocumentDemandeCertificat[];
}

// Interfaces IA
export interface ProfileAnalysis {
  resumeProfil: string;
  posteCible: string;
  domaines: string[];
  certificationsRecommandees: string[];
  nombreCertificats: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiplomaExtraction {
  extracted: {
    nomComplet: string | null;
    titre: string | null;
    mention: string | null;
    dateObtention: string | null;
    etablissement: string | null;
    texteBrut: string | null;
  };
  match: {
    scoreNom: number;
    scoreFormation: number;
    ok: boolean;
    details: Record<string, unknown>;
  };
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
  }

  export const api = {
  // Récupérer tous les établissements actifs
    async getEstablishments(): Promise<Establishment[]> {
      try {
        const response = await fetch(`${API_BASE_URL}/accueil/etablissements`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des établissements');
        }
        const data = await response.json();
      
      console.log('📊 Données reçues de l\'API:', data);
      
      // Temporairement, retourner tous les établissements pour debug
      if (data.success && data.data) {
        const allEstablishments = data.data;
        const activeEstablishments = allEstablishments.filter((etablissement: Establishment) => 
          etablissement.statut === 'ACTIF'
        );
        
        console.log('🏫 Tous les établissements:', allEstablishments.map((e: Establishment) => ({ nom: e.nomEtablissement, statut: e.statut })));
        console.log('✅ Établissements actifs:', activeEstablishments.map((e: Establishment) => ({ nom: e.nomEtablissement, statut: e.statut })));
        
        // Pour le moment, retourner tous les établissements pour debug
        return activeEstablishments;
      }
      
      return [];
      } catch (error) {
        console.error('Erreur API:', error);
        throw error;
      }
    },

  // ======== Certificats ========
  async createCertificateDraft(params: { apprenantId: number; titre: string; mention?: string; dateObtention: string; formationId?: string; }) {
    const res = await fetch(`${API_BASE_URL}/certificats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Erreur création brouillon');
    return res.json();
  },

  async generateCertificatePdf(certificatId: number) {
    const res = await fetch(`${API_BASE_URL}/certificats/${certificatId}/pdf`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) throw new Error('Erreur génération PDF');
    return res.json();
  },

  async emitCertificate(certificatId: number) {
    const res = await fetch(`${API_BASE_URL}/certificats/${certificatId}/emit`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) throw new Error('Erreur émission on-chain');
    return res.json();
  },

  async verifyCertificateOnchain(certificatId: number) {
    const res = await fetch(`${API_BASE_URL}/certificats/${certificatId}/verify-onchain`, {
      headers: {
        ...authHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) throw new Error('Erreur vérification on-chain');
    return res.json();
  },

  async listCertificates() {
    const res = await fetch(`${API_BASE_URL}/certificats`, {
      headers: {
        ...authHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) throw new Error('Erreur récupération certificats');
    return res.json();
  },

  // Récupérer les infos du wallet relayer (trésorerie plateforme) — réservé à l'admin
  async getRelayerWallet() {
    const res = await fetch(`${API_BASE_URL}/admin/relayer-wallet`, {
      headers: {
        ...authHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) throw new Error('Erreur récupération wallet relayer');
    return res.json();
  },

  // Révoquer un certificat
  async revokeCertificate(certificatId: number, reason?: string) {
    const res = await fetch(`${API_BASE_URL}/certificats/${certificatId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Erreur révocation certificat');
    return res.json();
  },

  // Re-révoquer un certificat (en cas d'échec blockchain)
  async retryRevokeCertificate(certificatId: number, reason?: string) {
    const res = await fetch(`${API_BASE_URL}/certificats/${certificatId}/retry-revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Erreur re-révocation certificat');
    return res.json();
  },

  // Re-publier un certificat (en cas d'échec blockchain)
  async retryEmitCertificate(certificatId: number) {
    const res = await fetch(`${API_BASE_URL}/certificats/${certificatId}/retry-emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) throw new Error('Erreur re-publication certificat');
    return res.json();
  },

  // ======== Assistant IA (apprenant) ========

  // Analyse du portefeuille de certificats de l'apprenant connecté
  async analyzeProfile(): Promise<{ success: boolean; data: ProfileAnalysis }> {
    const res = await fetch(`${API_BASE_URL}/ai/profile-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
      body: JSON.stringify({})
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Erreur lors de l'analyse du profil");
    }
    return res.json();
  },

  // Discuter avec l'assistant IA
  async chatWithAssistant(messages: ChatMessage[]): Promise<{ success: boolean; data: { reply: string } }> {
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
      body: JSON.stringify({ messages })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Erreur lors de la discussion avec l'assistant");
    }
    return res.json();
  },

  // Numériser un diplôme (OCR) et vérifier la correspondance étudiant/formation
  async extractDiploma(
    file: File,
    apprenantId: number,
    formationId?: string
  ): Promise<{ success: boolean; data: DiplomaExtraction }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('apprenantId', apprenantId.toString());
    if (formationId) formData.append('formationId', formationId);

    const res = await fetch(`${API_BASE_URL}/ai/ocr/diploma`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erreur lors de la numérisation du diplôme');
    }
    return res.json();
  },

  // ===============================================
  //                GESTION PROFIL UTILISATEUR
  // ===============================================

  // Récupérer le profil de l'utilisateur connecté
  async getUserProfile() {
    const res = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération profil');
    return res.json();
  },

  // Modifier le profil de l'utilisateur
  async updateUserProfile(profileData: {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur modification profil');
    }
    return res.json();
  },

  // Changer le mot de passe
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_BASE_URL}/user/password`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur changement mot de passe');
    }
    return res.json();
  },

  // Récupérer les sessions actives
  async getUserSessions() {
    const res = await fetch(`${API_BASE_URL}/user/sessions`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération sessions');
    return res.json();
  },

  // Terminer une session
  async terminateSession(sessionId: string) {
    const res = await fetch(`${API_BASE_URL}/user/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur suppression session');
    }
    return res.json();
  },

  // Supprimer le compte
  async deleteAccount(password: string) {
    const res = await fetch(`${API_BASE_URL}/user/account`, {
      method: 'DELETE',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur suppression compte');
    }
    return res.json();
  },

  // ===============================================
  //                DEMANDES DE CERTIFICAT
  // ===============================================

  // Créer une demande de certificat
  async createDemandeCertificat(demandeData: {
    etablissementId: number;
    titre: string;
    description?: string;
    messageDemande?: string;
    documents?: File[];
  }) {
    const formData = new FormData();
    formData.append('etablissementId', demandeData.etablissementId.toString());
    formData.append('titre', demandeData.titre);
    if (demandeData.description) formData.append('description', demandeData.description);
    if (demandeData.messageDemande) formData.append('messageDemande', demandeData.messageDemande);
    
    // Ajouter les fichiers
    if (demandeData.documents && demandeData.documents.length > 0) {
      demandeData.documents.forEach((file) => {
        formData.append('documents', file);
      });
    }

    const res = await fetch(`${API_BASE_URL}/demandes-certificat`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur création demande');
    }
    return res.json();
  },

  // Récupérer les demandes d'un apprenant
  async getDemandesApprenant(apprenantId: number) {
    const res = await fetch(`${API_BASE_URL}/apprenant/${apprenantId}/demandes-certificat`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération demandes apprenant');
    return res.json();
  },

  // Récupérer les demandes d'un établissement
  async getDemandesEtablissement(etablissementId: number) {
    const res = await fetch(`${API_BASE_URL}/etablissement/${etablissementId}/demandes-certificat`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération demandes établissement');
    return res.json();
  },

  // Récupérer les détails d'une demande
  async getDemandeDetails(demandeId: number) {
    const res = await fetch(`${API_BASE_URL}/demandes-certificat/${demandeId}`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération détails demande');
    return res.json();
  },

  // Traiter une demande (approuver/rejeter)
  async traiterDemande(demandeId: number, statut: 'APPROUVE' | 'REJETE', messageReponse?: string) {
    const res = await fetch(`${API_BASE_URL}/demandes-certificat/${demandeId}/statut`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ statutDemande: statut, messageReponse })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur traitement demande');
    }
    return res.json();
  },

  // Upload de fichiers vers Supabase
  async uploadFileToSupabase(file: File, folder: string = 'demandes-certificat') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch(`${API_BASE_URL}/upload/supabase`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur upload fichier');
    }
    return res.json();
  },

  // Récupérer l'URL d'un document
  async getDocumentUrl(documentId: number) {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/url`, {
      method: 'GET',
      headers: authHeaders()
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur récupération URL document');
    }
    return res.json();
  },

  // Méthode générique pour les requêtes GET
  async get(url: string) {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: authHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur requête GET');
    }
    return res.json();
  },

  // Méthode générique pour les requêtes POST
  async post(url: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur requête POST');
    }
    return res.json();
  },

  // Méthode générique pour les requêtes PUT
  async put(url: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      } as HeadersInit,
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur requête PUT');
    }
    return res.json();
  },

  // Méthode générique pour les requêtes DELETE
  async delete(url: string) {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Erreur requête DELETE');
    }
    return res.json();
  },

  // ========================================
  // MÉTHODES POUR LES NOTIFICATIONS
  // ========================================

  // Récupérer les notifications
  async getNotifications(params?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
    
    const res = await fetch(`${API_BASE_URL}/notifications?${queryParams.toString()}`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération notifications');
    return res.json();
  },

  // Compter les notifications non lues
  async getUnreadNotificationsCount() {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur comptage notifications');
    return res.json();
  },

  // Marquer une notification comme lue
  async markNotificationAsRead(notificationId: number) {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur marquage notification');
    return res.json();
  },

  // Marquer toutes les notifications comme lues
  async markAllNotificationsAsRead() {
    const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur marquage notifications');
    return res.json();
  },

  // Supprimer une notification
  async deleteNotification(notificationId: number) {
    const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur suppression notification');
    return res.json();
  },

  // ========================================
  // MÉTHODES POUR LE DASHBOARD
  // ========================================

  // Récupérer les statistiques du dashboard d'un établissement
  async getEstablishmentDashboard(establishmentId: number) {
    const res = await fetch(`${API_BASE_URL}/etablissement/${establishmentId}/dashboard`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération dashboard');
    return res.json();
  },

  // Récupérer les statistiques du dashboard d'un apprenant
  async getStudentDashboard(studentId: number) {
    const res = await fetch(`${API_BASE_URL}/apprenant/${studentId}/dashboard`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération dashboard');
    return res.json();
  },

  // ========================================
  // MÉTHODES POUR L'ABONNEMENT (établissement)
  // ========================================

  // Liste des plans (source unique backend)
  async getPlans() {
    const res = await fetch(`${API_BASE_URL}/plans`);
    if (!res.ok) throw new Error('Erreur récupération plans');
    return res.json();
  },

  // Abonnement courant + usage
  async getMySubscription(): Promise<{ success: boolean; data: SubscriptionSummary }> {
    const res = await fetch(`${API_BASE_URL}/subscription/me`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération abonnement');
    return res.json();
  },

  // Historique des paiements
  async getSubscriptionPayments(): Promise<{ success: boolean; data: PaymentRecord[] }> {
    const res = await fetch(`${API_BASE_URL}/subscription/payments`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Erreur récupération paiements');
    return res.json();
  },

  // Souscrire / renouveler.
  // - Mode direct (operator + phone) : déclenche le push USSD, renvoie { mode:'direct', status }.
  // - Mode hébergé (sans operator) : renvoie { mode:'hosted', paymentUrl }.
  async subscribe(
    plan: string,
    periode: 'mensuel' | 'annuel',
    opts?: { operator?: 'mtn' | 'orange'; phone?: string }
  ) {
    const res = await fetch(`${API_BASE_URL}/subscription/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ plan, periode, operator: opts?.operator, phone: opts?.phone })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Erreur lors de la souscription');
    }
    return res.json();
  },

  // Vérifier/appliquer un paiement au retour de NotchPay
  async verifySubscriptionPayment(reference: string) {
    const res = await fetch(`${API_BASE_URL}/subscription/verify/${reference}`, {
      headers: authHeaders()
    });
    return res.json();
  },
};