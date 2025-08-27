import authService from '../../services/authService';

const API_BASE_URL = 'http://localhost:5000/api';

export interface Establishment {
  id_etablissement: number;
  nomEtablissement: string;
  emailEtablissement: string;
  statut: 'EN_ATTENTE' | 'ACTIF' | 'REJETE';
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
  cheminFichier: string;
  dateUpload: string;
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
  async viewDocument(documentId: number): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }
      
      const url = `${API_BASE_URL}/admin/document/${documentId}/view`;
      // Ouvrir dans un nouvel onglet avec le token dans l'URL (pour la démo)
      // En production, on utiliserait une approche plus sécurisée
      window.open(url, '_blank');
      console.log(`👁️ Document ouvert: ${documentId}`);
    } catch (error) {
      console.error('Erreur visualisation:', error);
      throw error;
    }
  },

  // Télécharger un document
  async downloadDocument(documentId: number, fileName: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/document/${documentId}/download`, {
        headers: authService.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }
      
      // Créer un blob à partir de la réponse
      const blob = await response.blob();
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`📥 Document téléchargé: ${fileName}`);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      throw error;
    }
  }
};
