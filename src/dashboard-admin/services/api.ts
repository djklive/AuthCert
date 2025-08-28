import authService from '../../services/authService';

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
  }
};
