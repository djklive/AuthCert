import { createContext, useEffect, useState, type ReactNode } from 'react';
import authService from '../../services/authService';

interface UserInfo {
  id: string | number;
  email: string;
  role: 'student' | 'establishment' | 'admin';
  nom?: string;
  prenom?: string;
  nomEtablissement?: string;
  statut?: string;
}

interface UserContextType {
  user: UserInfo | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export { UserContext };

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      // Vérifier si l'utilisateur est connecté
      if (authService.isAuthenticated()) {
        // Récupérer les informations utilisateur depuis le service
        const userData = authService.getUser();
        if (userData) {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des informations utilisateur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value = {
    user,
    isLoading,
    refreshUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}


