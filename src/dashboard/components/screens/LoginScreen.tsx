import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Eye, EyeOff, Mail, Lock, LogIn, GraduationCap, Building2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (userType: 'student' | 'establishment') => void;
  onStartOnboarding: (userType: 'student' | 'establishment') => void;
}

export function LoginScreen({ onLogin, onStartOnboarding }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'student' | 'establishment'>('student');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(userType);
    } else {
      onStartOnboarding(userType);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isLogin ? 'Bienvenue' : 'Créer un compte'}
          </h1>
          <p className="text-muted-foreground">
            {isLogin 
              ? 'Connectez-vous pour accéder à vos certificats' 
              : 'Rejoignez CertifiED pour gérer vos certificats'
            }
          </p>
        </div>

        <Card className="border-0 shadow-lg rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">
              {isLogin ? 'Connexion' : 'Inscription'}
            </CardTitle>
            <CardDescription className="text-center">
              Choisissez votre profil et {isLogin ? 'connectez-vous' : 'créez votre compte'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Selector */}
            <div className="space-y-3">
              <Label>Je suis</Label>
              <Tabs value={userType} onValueChange={(value) => setUserType(value as 'student' | 'establishment')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
                  <TabsTrigger value="student" className="flex items-center gap-2 h-10 rounded-lg">
                    <GraduationCap className="h-4 w-4" />
                    Apprenant
                  </TabsTrigger>
                  <TabsTrigger value="establishment" className="flex items-center gap-2 h-10 rounded-lg">
                    <Building2 className="h-4 w-4" />
                    Établissement
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-xl"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="text-right">
                  <Button variant="link" className="p-0 h-auto text-sm text-primary">
                    Mot de passe oublié ?
                  </Button>
                </div>
              )}

              <Button type="submit" className="w-full h-12 rounded-xl">
                {isLogin ? 'Se connecter' : 'Créer mon compte'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou continuer avec</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-12 rounded-xl">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="h-12 rounded-xl">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
                Facebook
              </Button>
            </div>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
              </span>
              <Button
                variant="link"
                className="p-0 h-auto ml-1 text-sm text-primary"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            En continuant, vous acceptez nos{' '}
            <Button variant="link" className="p-0 h-auto text-xs text-primary">
              Conditions d'utilisation
            </Button>{' '}
            et notre{' '}
            <Button variant="link" className="p-0 h-auto text-xs text-primary">
              Politique de confidentialité
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}