//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
const API_BASE_URL = 'http://localhost:5000/api';

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
}