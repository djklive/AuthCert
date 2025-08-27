import { createContext } from 'react';
import { type UserType } from '../dashboard/types';

// Contexte pour l'état d'authentification global
export interface AuthContextType {
  userType: UserType | null;
  isAuthenticated: boolean;
  login: (userType: UserType) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
