"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import {
  Menu,
  Search,
  ShoppingCart,
  User,
  ShieldCheck,
  X,
  ChevronDown,
} from "lucide-react";

const marketplaceCategories = [
  {
    name: "Great Deals",
    href: "/products/great-deals",
  },
  {
    name: "Smartphones",
    href: "/products/smartphones",
  },
  {
    name: "Laptops",
    href: "/products/laptops",
  },
  {
    name: "Tablets",
    href: "/products/tablets",
  },
  {
    name: "Gaming",
    href: "/products/gaming",
  },
  {
    name: "Smartwatches",
    href: "/products/smartwatches",
  },
  {
    name: "Audio",
    href: "/products/audio",
  },
  {
    name: "Accessories",
    href: "/products/accessories",
  },
];

const navLinks = [
  {
    name: "Trade In",
    href: "/trade-in",
  },
  {
    name: "About",
    href: "/about",
  },
  {
    name: "Support",
    href: "/support",
  },
];



export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    "marketplace" | "tradein" | "about" | "support" | null
  >(null);
  const [mobileMarketplaceOpen, setMobileMarketplaceOpen] = useState(false);

  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  const openMenu = (
    menu: "marketplace" | "tradein" | "about" | "support"
  ) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(menu);
  };

  const closeMenu = () => {
    closeTimer.current = setTimeout(() => {
      setActiveMenu(null);
    }, 120);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#ececec] bg-white/95 backdrop-blur-xl">

        {/* ============================= */}
        {/* DESKTOP NAV */}
        {/* ============================= */}
        <div className="hidden lg:block">

          {/* TOP ROW */}
          <div className="">

            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

              {/* LEFT */}
              <div className="flex items-center gap-8">

                {/* LOGO */}
                <Link href="/" className="shrink-0">

                  <Image
                    src="https://dahlqmbcazlotvybyykx.supabase.co/storage/v1/object/public/branding/rebox-logo.png"
                    alt="Rebox"
                    width={150}
                    height={42}
                    priority
                    className="h-auto w-auto object-contain"
                  />

                </Link>

              </div>

              {/* SEARCH */}
              <div className="flex flex-1 justify-center px-10">

                <div className="group relative flex h-14 w-full max-w-3xl items-center rounded-full p-[1px]">

                  
                  {/* BORDER */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-500 opacity-0 transition-all duration-300 group-focus-within:opacity-100" />

                  {/* INPUT */}
                  <div className="relative flex h-full w-full items-center rounded-full border border-[#e7e7e8] bg-[#f8f8fb] px-6 transition-all duration-300 group-focus-within:border-transparent group-focus-within:bg-white">

                    <Search className="mr-3 h-5 w-5 text-gray-400" />

                    <input
                      type="text"
                      placeholder="Search devices, brands or IMEI..."
                      className="w-full bg-transparent text-[15px] font-medium text-[#111111] outline-none placeholder:text-gray-400"
                    />

                  </div>

                </div>

              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-3">

                {/* CART */}
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ececec] bg-white transition-all hover:bg-[#fafafa]">

                  <ShoppingCart className="h-5 w-5 text-[#111111]" />

                </button>

                {/* USER */}
                <button className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ececec] bg-white transition-all hover:bg-[#fafafa]">

                  <User className="h-5 w-5 text-[#111111]" />

                </button>

              </div>

            </div>

          </div>

          {/* SECOND ROW */}
        <div className="relative h-16 border-b border-[#f1f1f1] bg-white">

          <div
            className="mx-auto flex h-full max-w-7xl items-center justify-between px-6"
            onMouseLeave={closeMenu}
          >

            <div className="flex h-full items-center gap-10">

              {/* Marketplace */}
              <div
                onMouseEnter={() => openMenu("marketplace")}
                className="group relative flex h-full items-center"
              >
                <Link
                  href="/products"
                  className="flex h-full items-center text-[15px] font-medium text-[#111111] transition-colors hover:text-violet-600"
                >
                  Marketplace

                  <ChevronDown
                    className={`ml-1 h-4 w-4 transition-all duration-300 ${
                      activeMenu === "marketplace" ? "rotate-180" : ""
                    }`}
                  />

                  <span
                    className={`absolute bottom-0 left-0 h-[2px] bg-violet-600 transition-all duration-300 ${
                      activeMenu === "marketplace"
                        ? "w-full"
                        : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              </div>

              {/* Trade In */}
              <button
                onMouseEnter={() => openMenu("tradein")}
                className="group relative flex h-full items-center text-[15px] font-medium text-[#111111] transition-colors hover:text-violet-600"
              >
                Trade In

                <ChevronDown
                  className={`ml-1 h-4 w-4 transition-all duration-300 ${
                    activeMenu === "tradein" ? "rotate-180" : ""
                  }`}
                />

                <span
                  className={`absolute bottom-0 left-0 h-[2px] bg-violet-600 transition-all duration-300 ${
                    activeMenu === "tradein"
                      ? "w-full"
                      : "w-0 group-hover:w-full"
                  }`}
                />
              </button>

            {/* About */}
            <button
              onMouseEnter={() => openMenu("about")}
              className="group relative flex h-full items-center text-[15px] font-medium text-[#111111] transition-colors hover:text-violet-600"
            >
              About

              <ChevronDown
                className={`ml-1 h-4 w-4 transition-all duration-300 ${
                  activeMenu === "about" ? "rotate-180" : ""
                }`}
              />

              <span
                className={`absolute bottom-0 left-0 h-[2px] bg-violet-600 transition-all duration-300 ${
                  activeMenu === "about"
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                }`}
              />
            </button>

            {/* Support */}
            <button
              onMouseEnter={() => openMenu("support")}
              className="group relative flex h-full items-center text-[15px] font-medium text-[#111111] transition-colors hover:text-violet-600"
            >
              Support

              <ChevronDown
                className={`ml-1 h-4 w-4 transition-all duration-300 ${
                  activeMenu === "support" ? "rotate-180" : ""
                }`}
              />

              <span
                className={`absolute bottom-0 left-0 h-[2px] bg-violet-600 transition-all duration-300 ${
                  activeMenu === "support"
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                }`}
              />
            </button>

            </div>

            {/* Verify Button */}
            <button
              className="flex h-12 items-center gap-2 rounded-full border border-[#ececec] bg-white px-5 text-[14px] font-semibold text-[#111111] transition-all duration-300 hover:bg-[#fafafa]"
            >
              <ShieldCheck className="h-4 w-4" />
              Rebox Verify
            </button>
          </div>

          {/* Mega Menu */}
          {activeMenu && (
            <div
              onMouseEnter={() => {
                if (closeTimer.current) {
                  clearTimeout(closeTimer.current);
                }
              }}
              onMouseLeave={closeMenu}
              className="absolute left-0 top-full w-full border-t border-[#ececec] bg-white shadow-lg"
            >
              <div className="mx-auto max-w-7xl px-6 py-10">

                {activeMenu === "marketplace" && (
                  <div className="grid grid-cols-4 gap-6">

                    {marketplaceCategories.map((category) => (
                      <Link
                        key={category.name}
                        href={category.href}
                        className="rounded-xl p-4 transition hover:bg-[#f8f8fb]"
                      >
                        {category.name}
                      </Link>
                    ))}

                  </div>
                )}

                {activeMenu === "tradein" && (
                  <h2>Trade In Menu</h2>
                )}

                {activeMenu === "about" && (
                  <h2>About Menu</h2>
                )}

                {activeMenu === "support" && (
                  <h2>Support Menu</h2>
                )}

              </div>
            </div>
          )}

        </div>

        </div>

        {/* ============================= */}
        {/* MOBILE NAV */}
        {/* ============================= */}
        <div className="lg:hidden">

          {/* TOP ROW */}
          <div className="flex items-center justify-between px-4 py-4">

            {/* LEFT */}
            <div className="flex items-center gap-3">

              {/* HAMBURGER */}
              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ececec] bg-white"
              >
                <Menu className="h-5 w-5 text-[#111111]" />
              </button>

              {/* LOGO */}
              <Link href="/" className="shrink-0">

                <Image
                  src="/images/branding/rebox-logo.png"
                  alt="Rebox"
                  width={125}
                  height={36}
                  priority
                  className="h-auto w-auto object-contain"
                />

              </Link>

            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-2">

              {/* CART */}
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ececec] bg-white">

                <ShoppingCart className="h-5 w-5 text-[#111111]" />

              </button>

              {/* USER */}
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ececec] bg-white">

                <User className="h-5 w-5 text-[#111111]" />

              </button>

            </div>

          </div>

          {/* SEARCH + Rebox Verify */}
          <div className="flex items-center gap-3 px-4 pb-4">

            {/* SEARCH */}
            <div className="group relative flex h-12 flex-1 items-center rounded-full p-[1px]">

              {/* BORDER */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-500 opacity-0 transition-all duration-300 group-focus-within:opacity-100" />

              {/* INPUT */}
              <div className="relative flex h-full w-full items-center rounded-full border border-[#e7e7e8] bg-[#f8f8fb] px-5 transition-all duration-300 group-focus-within:border-transparent group-focus-within:bg-white">

                <Search className="mr-3 h-5 w-5 text-gray-400" />

                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-transparent text-[14px] font-medium text-[#111111] outline-none placeholder:text-gray-400"
                />

              </div>

            </div>

            {/* Rebox Verify */}
            <button className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-[#ececec] bg-white px-4 text-[14px] font-semibold text-[#111111]">

              <ShieldCheck className="h-4 w-4" />

              Rebox Verify

            </button>

          </div>

        </div>

      </header>

      {/* ============================= */}
      {/* MOBILE MENU */}
      {/* ============================= */}
      {menuOpen && (

        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm lg:hidden">

          {/* PANEL */}
          <div className="absolute inset-0 h-full w-full overflow-y-auto bg-white">

            {/* TOP */}
            <div className="flex items-center justify-between border-b border-[#f1f1f1] px-5 py-5">

              {/* LOGO */}
              <Link href="/" className="shrink-0">

                <Image
                  src="/images/branding/rebox-logo.png"
                  alt="Rebox"
                  width={125}
                  height={36}
                  priority
                  className="h-auto w-auto object-contain"
                />

              </Link>

              {/* CLOSE */}
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ececec]"
              >
                <X className="h-5 w-5 text-[#111111]" />
              </button>

            </div>

            {/* LINKS */}
            <div className="flex flex-col px-5 pb-10 pt-2">

            <button
              onClick={() =>
                setMobileMarketplaceOpen(!mobileMarketplaceOpen)
              }
              className="flex items-center justify-between border-b border-[#f3f3f3] py-5 text-left text-[18px] font-medium tracking-[-0.02em] text-[#111111]"
            >
              <span>Marketplace</span>
              <span>{mobileMarketplaceOpen ? "−" : "+"}</span>
            </button>

            {mobileMarketplaceOpen && (
              <div className="pb-2">

                {marketplaceCategories.map((category) => (
                  <Link
                    key={category.name}
                    href={category.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-4 pl-5 text-[16px] text-[#666]"
                  >
                    {category.name}
                  </Link>
                ))}

              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-[#f3f3f3] py-5 text-[18px] font-medium tracking-[-0.02em] text-[#111111]"
              >
                {link.name}
              </Link>
            ))}

            </div>

          </div>

        </div>

      )}
    </>
  );
}