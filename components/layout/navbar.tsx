"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  Menu,
  Search,
  ShoppingCart,
  User,
  Repeat,
  X,
} from "lucide-react";

const categories = [
  {
    name: "iPhone",
    href: "/products/iphone",
  },
  {
    name: "MacBook",
    href: "/products/macbook",
  },
  {
    name: "iPad",
    href: "/products/ipad",
  },
  {
    name: "Android",
    href: "/products/android",
  },
  {
    name: "Gaming",
    href: "/products/gaming",
  },
  {
    name: "Windows",
    href: "/products/windows",
  },
  {
    name: "AirPods",
    href: "/products/airpods",
  },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#ececec] bg-white/95 backdrop-blur-xl">

        {/* ============================= */}
        {/* DESKTOP NAV */}
        {/* ============================= */}
        <div className="hidden lg:block">

          {/* TOP ROW */}
          <div className="border-b border-[#f1f1f1]">

            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

              {/* LEFT */}
              <div className="flex items-center gap-8">

                {/* LOGO */}
                <Link href="/" className="shrink-0">

                  <Image
                    src="/images/branding/rebox-logo.png"
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
                      placeholder="Search phones, laptops, tablets..."
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
          <div className="h-16 border-b border-[#f1f1f1] bg-white">

            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">

              {/* CATEGORY LINKS */}
              <div className="flex items-center gap-10">

                {categories.map((category) => (
                  <Link
                    key={category.name}
                    href={category.href}
                    className="text-[16px] font-medium text-[#111111] transition-all hover:text-violet-600"
                  >
                    {category.name}
                  </Link>
                ))}

              </div>

              {/* TRADE IN */}
              <button className="flex h-12 items-center gap-2 rounded-full border border-[#ececec] bg-white px-5 text-[14px] font-semibold text-[#111111] transition-all hover:bg-[#fafafa]">

                <Repeat className="h-4 w-4" />

                Trade-in

              </button>

            </div>

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

          {/* SEARCH + TRADE IN */}
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
                  className="w-full bg-transparent text-[15px] font-medium text-[#111111] outline-none placeholder:text-gray-400"
                />

              </div>

            </div>

            {/* TRADE IN */}
            <button className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-[#ececec] bg-white px-4 text-[14px] font-semibold text-[#111111]">

              <Repeat className="h-4 w-4" />

              Trade-in

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

              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-[#f3f3f3] py-5 text-[20px] font-medium tracking-[-0.02em] text-[#111111]"
                >
                  {category.name}
                </Link>
              ))}

            </div>

          </div>

        </div>

      )}
    </>
  );
}