// Service d'authentification pour gérer les JWT

const API_BASE_URL = import.meta.env.BACKEND_URL || 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'https://authcert-production.up.railway.app/api';
//const API_BASE_URL = 'http://localhost:5000/api';
class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private user: any = null;

  private constructor() {
    // Récupérer le token depuis le localStorage au démarrage
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('authUser') || 'null');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Définir le token et l'utilisateur
  public setAuth(token: string, user: any): void {
    this.token = token;
    this.user = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
  }

  // Récupérer le token
  public getToken(): string | null {
    return this.token;
  }

  // Récupérer l'utilisateur
  public getUser(): any {
    return this.user;
  }

  // Vérifier si l'utilisateur est connecté
  public isAuthenticated(): boolean {
    return !!this.token;
  }

  // Vérifier le rôle de l'utilisateur
  public hasRole(role: string): boolean {
    return this.user?.role === role;
  }

  // Vérifier le statut (pour les établissements)
  public hasStatus(status: string): boolean {
    return this.user?.statut === status;
  }

  // Déconnexion
  public logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  // Vérifier la validité du token avec le serveur
  public async verifyToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user; // Mettre à jour les infos utilisateur
        localStorage.setItem('authUser', JSON.stringify(data.user));
        return true;
      } else {
        // Token invalide, déconnexion
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Erreur vérification token:', error);
      this.logout();
      return false;
    }
  }

  // Créer les headers d'autorisation pour les requêtes API
  public getAuthHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }
}

export default AuthService.getInstance();
