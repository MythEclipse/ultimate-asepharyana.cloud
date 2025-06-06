'use client';

import { FC, ReactNode } from 'react';
import Link from 'next/link';
import React from 'react';
interface ButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
  type?: 'button' | 'submit' | 'reset'; // Restricting type to valid HTML button types
}

const AnimatedButton: FC<ButtonProps> = ({
  children,
  disabled,
  onClick,
  type = 'button',
  className,
  href,
}) => {
  // Default value for type
  const buttonContent = (
    <div
      className={`flex flex-col items-center justify-center text-center 
        px-6 py-3 text-sm  // Kecil untuk md ke bawah
        md:px-6 md:py-3 md:text-base // Ukuran default mulai dari md ke atas
        text-blue-500 bg-transparent border border-blue-500 rounded-full shadow-lg shadow-blue-500/50 
        hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white 
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 
        transition-colors duration-200 ease-in-out ${className}`}
    >
      {children}
    </div>
  );

  if (href) {
    return <Link href={href}>{buttonContent}</Link>;
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    window.scrollTo(0, 0); // Scroll to the top of the page
  };

  return (
    <button
      className={`flex flex-col items-center justify-center text-center 
        px-6 py-3 text-sm // Kecil untuk md ke bawah
        md:px-6 md:py-3 md:text-base // Ukuran default mulai dari md ke atas
        text-blue-500 bg-transparent border border-blue-500 rounded-full shadow-lg shadow-blue-500/50 
        hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white 
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 
        transition-colors duration-200 ease-in-out ${className}`}
      disabled={disabled}
      type={type} // Ensure the type is either "button", "submit", or "reset"
      onClick={handleClick}
    >
      {children}
    </button>
  );
};

export default AnimatedButton;
