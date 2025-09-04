import authService from '../../services/authService';

//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
const API_BASE_URL = 'http://localhost:5000/api';

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

export interface Document {
  id: number;
  typeDocument: string;
  nomFichier: string;
  cheminFichier: string; // Peut contenir soit un chemin local soit une URL Supabase
  dateUpload: string;
  typeMime?: string;
  tailleFichier?: number;
}

export interface Apprenant {
  id_apprenant: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  statut: 'EN_ATTENTE' | 'ACTIF' | 'SUSPENDU';
  dateCreation: string;
  dateModification: string;
  etablissementId?: number;
  etablissement?: {
    nomEtablissement: string;
  };
}

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom?: string;
  type: 'apprenant' | 'etablissement';
  statut: 'EN_ATTENTE' | 'ACTIF' | 'REJETE' | 'SUSPENDU';
  dateCreation: string;
  dateModification: string;
  telephone?: string;
  etablissementNom?: string;
}

export const api = {
  // Récupérer tous les établissements
  async getEstablishments(): Promise<Establishment[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/etablissements`, {
        headers: authService.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des établissements');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  },

  // Changer le statut d'un établissement
  async updateEstablishmentStatus(
    id: number, 
    statut: 'EN_ATTENTE' | 'ACTIF' | 'REJETE' | 'SUSPENDU', 
    commentaires?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/etablissement/${id}/status`, {
        method: 'PATCH',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ statut, commentaires }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }
      
      const data = await response.json();
      console.log('Statut mis à jour:', data.message);
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  },

  // Visualiser un document dans le navigateur
  async viewDocument(documentId: number, documentUrl?: string): Promise<void> {
    try {
      // Si c'est une URL Supabase, l'ouvrir directement
      if (documentUrl && documentUrl.startsWith('http')) {
        window.open(documentUrl, '_blank');
        console.log(`👁️ Document Supabase ouvert: ${documentUrl}`);
        return;
      }

      // Sinon, utiliser l'ancienne méthode pour les documents locaux
      const token = authService.getToken();
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }
      
      const url = `${API_BASE_URL}/admin/document/${documentId}/view`;
      window.open(url, '_blank');
      console.log(`👁️ Document local ouvert: ${documentId}`);
    } catch (error) {
      console.error('Erreur visualisation:', error);
      throw error;
    }
  },

  // Télécharger un document
  async downloadDocument(documentId: number, fileName: string, documentUrl?: string): Promise<void> {
    try {
      // Si c'est une URL Supabase, télécharger directement
      if (documentUrl && documentUrl.startsWith('http')) {
        const response = await fetch(documentUrl);
        if (!response.ok) {
          throw new Error('Erreur lors du téléchargement depuis Supabase');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log(`📥 Document Supabase téléchargé: ${fileName}`);
        return;
      }

      // Sinon, utiliser l'ancienne méthode pour les documents locaux
      const response = await fetch(`${API_BASE_URL}/admin/document/${documentId}/download`, {
        headers: authService.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`📥 Document local téléchargé: ${fileName}`);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      throw error;
    }
  },

  // Récupérer tous les utilisateurs (apprenants et établissements)
  async getAllUsers(): Promise<User[]> {
    try {
      const [apprenantsResponse, etablissementsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/apprenants`, {
          headers: authService.getAuthHeaders()
        }),
        fetch(`${API_BASE_URL}/admin/etablissements`, {
          headers: authService.getAuthHeaders()
        })
      ]);

      if (!apprenantsResponse.ok || !etablissementsResponse.ok) {
        throw new Error('Erreur lors de la récupération des utilisateurs');
      }

      const [apprenantsData, etablissementsData] = await Promise.all([
        apprenantsResponse.json(),
        etablissementsResponse.json()
      ]);

      const apprenants: User[] = apprenantsData.data.map((app: Apprenant) => ({
        id: app.id_apprenant,
        email: app.email,
        nom: app.nom,
        prenom: app.prenom,
        type: 'apprenant' as const,
        statut: app.statut,
        dateCreation: app.dateCreation,
        dateModification: app.dateModification,
        telephone: app.telephone,
        etablissementNom: app.etablissement?.nomEtablissement
      }));

      const etablissements: User[] = etablissementsData.data.map((etab: Establishment) => ({
        id: etab.id_etablissement,
        email: etab.emailEtablissement,
        nom: etab.nomEtablissement,
        type: 'etablissement' as const,
        statut: etab.statut,
        dateCreation: etab.dateCreation,
        dateModification: etab.dateCreation, // Pas de dateModification dans l'interface
        telephone: etab.telephoneEtablissement
      }));

      return [...apprenants, ...etablissements];
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  },

  // Mettre à jour le statut d'un utilisateur
  async updateUserStatus(
    userId: number,
    userType: 'apprenant' | 'etablissement',
    statut: 'EN_ATTENTE' | 'ACTIF' | 'REJETE' | 'SUSPENDU',
    commentaires?: string
  ): Promise<void> {
    try {
      const endpoint = userType === 'apprenant' 
        ? `/admin/apprenant/${userId}/status`
        : `/admin/etablissement/${userId}/status`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ statut, commentaires }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }
      
      const data = await response.json();
      console.log('Statut utilisateur mis à jour:', data.message);
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  },

  // Supprimer un utilisateur
  async deleteUser(
    userId: number,
    userType: 'apprenant' | 'etablissement'
  ): Promise<void> {
    try {
      const endpoint = userType === 'apprenant' 
        ? `/admin/apprenant/${userId}`
        : `/admin/etablissement/${userId}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }
      
      console.log('Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  },

  // Créer un nouvel apprenant
  async createApprenant(userData: {
    email: string;
    motDePasse: string;
    nom: string;
    prenom: string;
    telephone?: string;
    etablissementId?: number;
  }): Promise<Apprenant> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/apprenant`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'apprenant');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  },

  // Créer un nouvel établissement
  async createEtablissement(userData: {
    nomEtablissement: string;
    emailEtablissement: string;
    motDePasseEtablissement: string;
    rccmEtablissement: string;
    typeEtablissement: string;
    adresseEtablissement: string;
    telephoneEtablissement: string;
    nomResponsableEtablissement: string;
    emailResponsableEtablissement: string;
    telephoneResponsableEtablissement: string;
  }): Promise<Establishment> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/etablissement`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'établissement');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }
};
