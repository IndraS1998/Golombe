"use client";

import Logo from "@/components/Logo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import config from "@/config/config.json";
//import menu from "@/config/menu.json";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";
import { IoSearch } from "react-icons/io5";
import { useToken } from '@/context/TokenContext';
import { useRouter } from "next/navigation";

//  child navigation link interface
export interface IChildNavigationLink {
  name: string;
  url: string;
}

// navigation link interface
export interface INavigationLink {
  name: string;
  url: string;
  hasChildren?: boolean;
  children?: IChildNavigationLink[];
}

const consultation = {
  name : 'Consultation',
  url : '/consultation'
}

const Header = () => {
  // distructuring the main menu from menu object
  const main = [consultation];
  const { navigation_button, settings } = config;
  // get current path
  const pathname = usePathname();
  const { setToken,token } = useToken();
  const r = useRouter();

  // scroll to top on route change
  useEffect(() => {
    window.scroll(0, 0);
    const t = localStorage.getItem("token")
    if(t){
      setToken(true);
    }
  }, [pathname,setToken]);
  

  return (
    <header className={`header z-30 ${settings.sticky_header && "sticky top-0"}`}>
      <nav className="navbar container">
        {/* logo */}
        <div className="order-0">
          <Logo />
        </div>
        {/* navbar toggler */}
        <input id="nav-toggle" type="checkbox" className="hidden" />
        <label htmlFor="nav-toggle" className="order-3 cursor-pointer flex items-center lg:hidden text-text-dark dark:text-white lg:order-1"
        >
          <svg
            id="show-button"
            className="h-6 fill-current block"
            viewBox="0 0 20 20"
          >
            <title>Menu Open</title>
            <path d="M0 3h20v2H0V3z m0 6h20v2H0V9z m0 6h20v2H0V0z"></path>
          </svg>
          <svg
            id="hide-button"
            className="h-6 fill-current hidden"
            viewBox="0 0 20 20"
          >
            <title>Menu Close</title>
            <polygon
              points="11 9 22 9 22 11 11 11 11 22 9 22 9 11 -2 11 -2 9 9 9 9 -2 11 -2"
              transform="rotate(45 10 10)"
            ></polygon>
          </svg>
        </label>
        {/* /navbar toggler */}

        <ul
          id="nav-menu"
          className="navbar-nav order-3 hidden w-full pb-6 lg:order-1 lg:flex lg:w-auto lg:space-x-2 lg:pb-0 xl:space-x-8"
        >
          {token && main.map((menu, i) => (
            <React.Fragment key={`menu-${i}`}>
              <li className="nav-item">
                  <Link
                    href={menu.url}
                    className={`nav-link block ${
                      (pathname === `${menu.url}/` || pathname === menu.url) &&
                      "active"
                    }`}
                  >
                    {menu.name}
                  </Link>
                </li>
            </React.Fragment>
          ))}
          {navigation_button.enable && (
            <li className="mt-4 inline-block lg:hidden">
              <button className="btn btn-outline-primary btn-sm hidden lg:inline-block" onClick={()=>{
                if (token){
                  setToken(false);
                  localStorage.removeItem('token');
                  r.replace("/");
                }else{
                  r.replace(navigation_button.link);
                }
              }}>
                {token?"Deconnexion":navigation_button.label}
              </button>
            </li>
          )}
        </ul>
        <div className="order-1 ml-auto flex items-center md:order-2 lg:ml-0">
          {settings.search && (
            <button
              className="border-border text-text-dark hover:text-primary dark:border-darkmode-border mr-5 inline-block border-r pr-5 text-xl dark:text-white dark:hover:text-darkmode-primary"
              aria-label="search"
              data-search-trigger
            >
              <IoSearch />
            </button>
          )}
          <ThemeSwitcher className="mr-5" />
          {navigation_button.enable && (
            <button className="btn btn-outline-primary btn-sm hidden lg:inline-block cursor-pointer" onClick={()=>{
                if (token){
                  setToken(false);
                  localStorage.removeItem('token');
                  r.replace("/")
                }else{
                  r.replace(navigation_button.link)
                }
              }}>
              {token?"Deconnexion":navigation_button.label}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
