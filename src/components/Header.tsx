import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const navigationItems = [
  { label: "Accueil", href: "/" },
  { label: "A Propos", href: "#" },
  { label: "Tarif", href: "/tarif" },
];

interface HeaderProps {
  activePage: string;
}

export const Header = ({ activePage }: HeaderProps) => {
  return (
    <header className="w-full px-4 sm:px-6 lg:px-8 py-4 bg-transparent">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link to="/" className="flex items-center gap-2">
            
          <div className="font-bold text-gray-900 text-base tracking-[3.00px] leading-[30px] flex items-center gap-2">
              {/* <span className="text-rose-500 tracking-[0.48px]">/</span> */}
              <img src="/Logo - 32.svg" alt="Logo" />
              <span className="text-zinc-900 tracking-[0.48px]">AUTHCERT</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8 xl:gap-[90px] -mr-30">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className={`font-medium text-base transition-colors whitespace-nowrap ${
                activePage === item.label
                  ? "text-rose-500 font-semibold"
                  : "text-gray-900 hover:text-rose-500"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Links */}
        <div className="hidden lg:flex items-center gap-4">
          <Link
            to="/auth"
            className="font-medium text-gray-900 text-base hover:text-rose-500 transition-colors whitespace-nowrap"
          >
            Se connecter
          </Link>
          <Button
            variant="outline"
            className="px-6 py-2.5 rounded-[10px] border-[1.5px] border-zinc-400 bg-transparent hover:bg-rose-50"
          >
            <Link to="/auth/signup">
              <span className="font-semibold text-rose-500 text-base">
                Inscrivez-vous
              </span>
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button className="lg:hidden p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>
    </header>
  );
};
