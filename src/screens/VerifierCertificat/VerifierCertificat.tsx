import { DownloadIcon, Shield, CheckCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { AnimatedSection, AnimatedTitle, AnimatedImage, AnimatedCard } from "../../components/animations/ScrollAnimation";
import { API_BASE } from "../../services/api";

export const VerifierCertificat = () => {
  const [searchParams] = useSearchParams();
  const [uuid, setUuid] = useState<string>(searchParams.get('uuid') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<null | {
    uuid: string;
    titre: string;
    mention?: string;
    dateObtention: string;
    statut: string;
    pdfUrl?: string;
    pdfHash?: string;
    txHash?: string;
    contractAddress?: string;
  }>(null);
  const [onchain, setOnchain] = useState<null | { onchain: boolean; issuer?: string; student?: string; issuedAt?: number; txHash?: string; contractAddress?: string }>(null);

  useEffect(() => {
    if (uuid) {
      void handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fileUrl = useMemo(() => {
    if (!result?.pdfUrl) return undefined;
    return result.pdfUrl.startsWith('http') ? result.pdfUrl : `${API_BASE.replace(/\/$/, '')}${result.pdfUrl}`;
  }, [result]);

  const handleVerify = async () => {
    if (!uuid.trim()) {
      setError('Veuillez saisir un identifiant de certificat (UUID)');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/certificats/public/${encodeURIComponent(uuid.trim())}`);
      if (!res.ok) throw new Error('Certificat introuvable');
      const data = await res.json();
      setResult(data.data);

      // Vérification on-chain publique (best-effort)
      try {
        const v = await fetch(`${API_BASE}/certificats/public/${encodeURIComponent(uuid.trim())}/verify`);
        if (v.ok) {
          const vd = await v.json();
          if (vd?.data) {
            setOnchain({
              onchain: vd.data.onchain === true,
              issuer: vd.data.record?.issuer,
              student: vd.data.record?.student,
              issuedAt: vd.data.record?.issuedAt,
              txHash: vd.data.txHash,
              contractAddress: vd.data.contractAddress
            });
          }
        }
      } catch (e) {
        console.log(e);

      }
    } catch (e) {
      console.log(e);
      setError('Certificat introuvable ou invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 w-full">
      <Header activePage="Verifier Certificat" />

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <AnimatedSection delay={0.1}>
            <div className="flex justify-center mb-6 lg:mb-8">
              <Badge
                variant="secondary"
                className="px-6 py-2 bg-[#ffffff99] rounded-[60px] border border-zinc-200 backdrop-blur-[7px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(7px)_brightness(100%)] text-sm sm:text-base"
              >
                <span className="font-semibold text-gray-900">
                  Émission sécurisée et traçabilité 100% blockchain
                </span>
              </Badge>
            </div>
          </AnimatedSection>

          {/* Title Section */}
          <AnimatedSection delay={0.2}>
            <div className="mb-8 lg:mb-12 relative">
              {/* Decorative Vector - Hidden on mobile */}
              <AnimatedImage
                src="/Vector 10.svg"
                alt="Vector"
                className="hidden sm:block absolute left-52 transform -translate-x-1/2 top-12 lg:top-16 w-32 sm:w-48 lg:w-[259px] h-auto opacity-50"
                delay={0.3}
              />
              
              <AnimatedTitle delay={0.4}>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[52px] font-bold text-gray-900 leading-tight lg:leading-[62px] px-4">
                  Vérifiez instantanément l'authenticité des certificats.
                </h1>
              </AnimatedTitle>
            </div>
          </AnimatedSection>

          {/* Description */}
          <AnimatedSection delay={0.5}>
            <p className="text-base lg:text-lg text-gray-600 leading-relaxed mb-12 lg:mb-16 max-w-2xl mx-auto px-4">
              Blockchain sécurisée, QR code fluides, confiance certifiée.
              Notre solution révolutionne la vérification des certificats,
              garantissant une transparence totale et une sécurité inégalée.
            </p>
          </AnimatedSection>

          {/* Verification Card */}
          <AnimatedSection delay={0.6}>
            <div className="flex justify-center">
              <AnimatedCard delay={0.7}>
                <Card className="w-full max-w-lg bg-white rounded-[10px] border-0 shadow-lg">
                  <CardContent className="p-6 sm:p-8">
                    {/* UUID Input */}
                    <div className="mb-6 text-left">
                      <label className="block font-medium text-black text-base mb-3">
                        Identifiant du certificat (UUID)
                      </label>
                      <input
                        value={uuid}
                        onChange={(e) => setUuid(e.target.value)}
                        placeholder="Ex: 7b59e53e-0b36-4616-97c5-08b59021a02c"
                        className="w-full h-12 px-4 border border-zinc-200 rounded-[9px] focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    {/* Verify Button */}
                    <div className="relative">
                      <div className="absolute inset-0 blur-[22.5px] bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 opacity-30 rounded-[10px]" />
                      <Button disabled={loading} onClick={handleVerify} className="relative w-full h-14 bg-rose-500 hover:bg-rose-600 rounded-[10px] text-white font-bold text-lg">
                        {loading ? 'Vérification...' : 'VÉRIFIER'}
                      </Button>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-[9px] text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          </AnimatedSection>

          {/* Result */}
          {result && (
            <AnimatedSection delay={0.8}>
              <div className="max-w-3xl mx-auto mt-8">
                <Card className="bg-white rounded-[12px] border-0 shadow-lg">
                  <CardContent className="p-6 sm:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Certificat authentique</h3>
                        <p className="text-sm text-gray-600">Vérifié avec succès</p>
                      </div>
                      <div className="ml-auto">
                        <Badge variant="secondary">{result.statut}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div>
                        <p className="text-sm text-gray-500">Titre</p>
                        <p className="font-medium">{result.titre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">UUID</p>
                        <p className="font-mono text-sm">{result.uuid}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date d'obtention</p>
                        <p className="font-medium">{new Date(result.dateObtention).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Empreinte (hash)</p>
                        <p className="font-mono text-xs break-all">{result.pdfHash || '—'}</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t text-left">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Shield className="w-4 h-4 text-rose-500" />
                        <span>
                          {onchain?.onchain ? 'Preuve inscrite sur la blockchain' : 'Preuve blockchain non trouvée'}
                        </span>
                      </div>
                      {onchain?.onchain && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Issuer</p>
                            <p className="font-mono break-all">{onchain.issuer}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Étudiant</p>
                            <p className="font-mono break-all">{onchain.student}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Date émission</p>
                            <p>{onchain.issuedAt ? new Date(onchain.issuedAt).toLocaleString() : '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Transaction</p>
                            {onchain.txHash ? (
                              <a className="text-rose-600 underline" target="_blank" rel="noreferrer" href={`https://amoy.polygonscan.com/tx/${onchain.txHash}`}>{onchain.txHash}</a>
                            ) : (
                              <p className="font-mono break-all">—</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={!fileUrl} onClick={() => fileUrl && window.open(fileUrl, '_blank')}>
                          <DownloadIcon className="w-4 h-4 mr-2" />
                          Télécharger PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AnimatedSection>
          )}
        </div>
      </main>
    </div>
  );
};