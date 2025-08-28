import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { HiMenuAlt4 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { useState } from "react";

const navigationItems = [
  { label: "Accueil", href: "/" },
  { label: "A Propos", href: "#" },
  { label: "Tarif", href: "/tarif" },
];

interface HeaderProps {
  activePage: string;
}

const NavbarItem = ({title, classProps}: {title: string, classProps: string}) => {
  return (
      <li className={`mx-4 cursor-pointer ${classProps}`}>
          {title}
      </li>
  )
}

export const Header = ({ activePage }: HeaderProps) => {

  const [toggleMenu, setToggleMenu] = useState(false);

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
          <Link to="/auth/signup">
            <Button
              variant="outline"
              className="px-6 py-2.5 rounded-[10px] border-[1.5px] border-zinc-400 bg-transparent hover:bg-rose-50"
            >
              <span className="font-semibold text-rose-500 text-base">
                Inscrivez-vous
              </span>
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        {/*<Button className="lg:hidden p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>*/}
        <div className='flex relative'>
                {
                    toggleMenu 
                    ? <AiOutlineClose fontSize={28} className='text-black md:hidden cursor-pointer' onClick={() => setToggleMenu(false)} />
                    : <HiMenuAlt4 fontSize={28} className='text-white rounded-sm p-2 bg-rose-500 md:hidden cursor-pointer' onClick={() => setToggleMenu(true)} />}
                {
                   toggleMenu && (
                    <ul
                        className='z-10 fixed top-0 -right-2 p-3 w-[70vw] h-screen shadow-2xl md:hidden list-none
                            flex flex-col justify-start items-center rounded-md blue-glassmorphism text-white animate-slide-in
                        '
                    >
                        <li className='text-xl w-full my-2'>
                            <AiOutlineClose className='cursor-pointer' onClick={() => setToggleMenu(false)} />
                        </li>
                        {navigationItems.map((item, index) => (
                          <Link
                            key={index}
                            to={item.href}
                            className={`font-medium text-base transition-colors whitespace-nowrap ${
                              activePage === item.label
                              ? "text-rose-500 font-semibold"
                              : "text-white hover:text-rose-500"
                            }`}
                            >
                                {/*item.label*/}
                                <NavbarItem key={item.label + index} title={item.label} classProps="my-2 text-lg" />
                          </Link>
                        ))}
                        <li>
                          <Link to="/auth/signup">
                            <Button
                              variant="outline"
                              className="px-6 py-2.5 rounded-[10px] border-[1.5px] border-zinc-400 bg-white hover:bg-rose-50"
                            >
                              <span className="font-semibold text-rose-500 text-base">
                                Inscrivez-vous
                              </span>
                            </Button>
                          </Link>
                        </li>
                    </ul>
                   ) 
                }    
            </div>
      </div>
    </header>
  );
};
