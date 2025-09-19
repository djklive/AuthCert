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
  async createCertificateDraft(params: { apprenantId: number; titre: string; mention?: string; dateObtention: string; }) {
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

  // Récupérer l'adresse du wallet de l'établissement avec solde
  async getEstablishmentWallet() {
    const res = await fetch(`${API_BASE_URL}/etablissement/me/wallet`, {
      headers: {
        ...authHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) throw new Error('Erreur récupération wallet');
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
};