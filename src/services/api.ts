const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';
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
};