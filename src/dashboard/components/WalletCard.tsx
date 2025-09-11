import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  QrCode, 
  Coins,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface WalletData {
  address: string;
  balance: string;
  balanceError?: string;
  network: string;
  explorerUrl: string;
  faucetUrl: string;
  currency: string;
}

interface WalletCardProps {
  className?: string;
}

export function WalletCard({ className }: WalletCardProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const response = await api.getEstablishmentWallet();
      if (response.success) {
        setWalletData(response.data);
      } else {
        toast.error('Erreur lors du chargement du wallet');
      }
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
      toast.error('Erreur lors du chargement du wallet');
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    try {
      setRefreshing(true);
      await loadWalletData();
      toast.success('Solde mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  const copyAddress = () => {
    if (walletData?.address) {
      navigator.clipboard.writeText(walletData.address);
      toast.success('Adresse copiée dans le presse-papiers');
    }
  };

  const openExplorer = () => {
    if (walletData?.explorerUrl) {
      window.open(walletData.explorerUrl, '_blank');
    }
  };

  const openFaucet = () => {
    if (walletData?.faucetUrl) {
      window.open(walletData.faucetUrl, '_blank');
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet établissement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!walletData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet établissement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">Impossible de charger les informations du wallet</p>
            <Button onClick={loadWalletData} className="mt-4">
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balance = parseFloat(walletData.balance);
  const hasBalance = balance > 0;
  const isLowBalance = balance > 0 && balance < 0.01; // Moins de 0.01 MATIC

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet établissement
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshBalance}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Gestion de votre wallet blockchain pour l'émission de certificats
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Adresse du wallet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Adresse du wallet</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-6 px-2 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copier
            </Button>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <code className="text-xs break-all font-mono">
              {walletData.address}
            </code>
          </div>
        </div>

        {/* Solde */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">Solde</label>
            <Badge variant={hasBalance ? "default" : "destructive"} className="text-xs">
              {walletData.network}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-bold">
              {walletData.balance} {walletData.currency}
            </span>
            {hasBalance && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
          {walletData.balanceError && (
            <p className="text-xs text-destructive">
              ⚠️ {walletData.balanceError}
            </p>
          )}
        </div>

        {/* Alertes */}
        {!hasBalance && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Solde insuffisant</span>
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              Vous devez recharger votre wallet pour émettre des certificats
            </p>
          </div>
        )}

        {isLowBalance && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Solde faible</span>
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              Votre solde est faible, pensez à recharger bientôt
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openFaucet}
            className="text-xs"
          >
            <Coins className="h-3 w-3 mr-1" />
            Faucet
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openExplorer}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Explorer
          </Button>
        </div>

        {/* QR Code (optionnel) */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              // TODO: Implémenter l'affichage du QR code
              toast.info('QR Code bientôt disponible');
            }}
          >
            <QrCode className="h-3 w-3 mr-1" />
            Afficher QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
