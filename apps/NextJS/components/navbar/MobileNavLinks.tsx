'use client';

import React from 'react';
import Link from 'next/link';


interface MobileNavLinksProps {
  isNavOpen: boolean;
  setIsNavOpen: (isOpen: boolean) => void;
  pathname: string;
  loginUrl: string;
  
}

export default function MobileNavLinks({
  isNavOpen,
  setIsNavOpen,
  pathname,
}: MobileNavLinksProps) {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/docs', label: 'Docs' },
    { href: '/project', label: 'Project' },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity ${
          isNavOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsNavOpen(false)}
      />
      <div
        className={`fixed top-0 left-0 w-full bg-white dark:bg-black transition-transform ${
          isNavOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <ul className='flex flex-col p-4'>
          {links.map((link, index) => (
            <li key={index} className='text-center'>
              <Link prefetch={true} href={link.href}>
                <span
                  className={`block px-4 py-2 ${
                    pathname === link.href
                      ? 'text-blue-600 font-semibold'
                      : 'text-gray-900 dark:text-gray-300'
                  }`}
                  onClick={() => setIsNavOpen(false)}
                >
                  {link.label}
                </span>
              </Link>
              <div className='border-b-2 border-blue-600 mt-2' />
            </li>
          ))}
          {/* <li className='mt-4 text-center'>
            <UserMenu session={session} loginUrl={loginUrl} />
          </li> */}
        </ul>
      </div>
    </>
  );
}
