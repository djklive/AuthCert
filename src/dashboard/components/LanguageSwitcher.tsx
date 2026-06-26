import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from './ui/button';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'fr').toLowerCase();
  const isFr = current.startsWith('fr');

  const toggle = () => {
    i18n.changeLanguage(isFr ? 'en' : 'fr');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="w-full justify-start gap-3 h-10 lg:h-11 text-muted-foreground hover:text-foreground text-sm lg:text-base"
      title={isFr ? 'Switch to English' : 'Passer en français'}
    >
      <Languages className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{isFr ? 'Français' : 'English'}</span>
      <span className="text-xs font-semibold opacity-70">{isFr ? 'FR' : 'EN'}</span>
    </Button>
  );
}
