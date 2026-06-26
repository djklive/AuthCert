import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Target,
  TrendingUp,
  RefreshCw,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, type ChatMessage, type ProfileAnalysis } from '../../../services/api';

interface AssistantScreenProps {
  onNavigate?: (screen: string) => void;
}

export function AssistantScreen(_props: AssistantScreenProps) {
  const { t } = useTranslation();
  const SUGGESTIONS = [
    t('assistant.chat.suggestion1'),
    t('assistant.chat.suggestion2'),
    t('assistant.chat.suggestion3'),
  ];

  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: t('assistant.chat.greeting'),
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const res = await api.analyzeProfile();
      setAnalysis(res.data);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : t('assistant.chat.analysisError')
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || chatLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setChatLoading(true);
    setChatError('');

    try {
      const res = await api.chatWithAssistant(
        nextMessages.filter((m) => m.role === 'user' || m.role === 'assistant')
      );
      setMessages([...nextMessages, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : t('assistant.chat.error')
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            {t('assistant.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('assistant.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analyse de profil */}
        <Card className="border-0 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t('assistant.profileCard.title')}
            </CardTitle>
            <CardDescription>
              {t('assistant.profileCard.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!analysis && !analysisLoading && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('assistant.profileCard.intro')}
                </p>
                <Button onClick={runAnalysis} className="rounded-xl">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('assistant.profileCard.analyze')}
                </Button>
              </div>
            )}

            {analysisLoading && (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">{t('assistant.profileCard.analyzing')}</p>
              </div>
            )}

            {analysisError && !analysisLoading && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {analysisError}
              </div>
            )}

            {analysis && !analysisLoading && (
              <div className="space-y-4">
                <div className="p-4 bg-accent/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t('assistant.profileCard.yourProfile')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.resumeProfil}</p>
                </div>

                {analysis.posteCible && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('assistant.profileCard.targetPost')}</span>
                    <Badge className="rounded-full">{analysis.posteCible}</Badge>
                  </div>
                )}

                {analysis.domaines.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {analysis.domaines.map((d, i) => (
                      <Badge key={i} variant="secondary" className="rounded-full">
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}

                {analysis.certificationsRecommandees.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {t('assistant.profileCard.recommended')}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {analysis.certificationsRecommandees.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm p-2 rounded-lg bg-background border border-border"
                        >
                          <GraduationCap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={runAnalysis}
                  className="rounded-xl"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('assistant.profileCard.rerun')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chatbot */}
        <Card className="border-0 shadow-lg rounded-3xl flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {t('assistant.chat.title')}
            </CardTitle>
            <CardDescription>{t('assistant.chat.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 space-y-4">
            <ScrollArea className="h-80 pr-3">
              <div ref={scrollRef} className="space-y-4 overflow-y-auto max-h-80">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/50'
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-accent/50 rounded-2xl px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {chatError && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {chatError}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={t('assistant.chat.placeholder')}
                className="rounded-xl resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={chatLoading || !input.trim()}
                className="rounded-xl h-11 px-4 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
