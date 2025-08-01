'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Step 1: Send data to the registration API
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setError(registerData.message || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Step 2: If registration is successful, try to sign in automatically
      const signInResponse = await signIn('credentials', {
        email,
        password,
        redirect: false, // Do not redirect automatically, we handle it manually
      });

      if (signInResponse?.error) {
        // If auto-login fails, inform the user to log in manually
        setError('Registration successful, but auto-login failed. Please log in from the login page.');
        // Redirect to the login page after a moment
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else if (signInResponse?.ok) {
        // If auto-login is successful, redirect to the homepage
        router.push('/');
        router.refresh(); // Refresh the page to update session status
      }

    } catch {
      setError('An error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4" role="form" aria-label="Register form">
      {error && (
        <p
          className="text-red-500 text-center bg-red-100 p-2 rounded-md"
          id="register-error"
          tabIndex={-1}
          ref={errorRef}
          aria-live="polite"
        >
          {error}
        </p>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-describedby={error ? 'register-error' : undefined}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-describedby={error ? 'register-error' : undefined}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          aria-describedby={error ? 'register-error' : undefined}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400'
        aria-label="Register"
      >
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
      <div className="text-center mt-4">
        <Link href="/login" className="text-blue-600 hover:underline">
          Already have an account? Login here.
        </Link>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className='min-h-screen flex flex-col justify-center items-center'>
      <div className='p-10 rounded-lg shadow-lg'>
        <h1 className='mb-6 text-3xl font-bold text-center text-green-600'>
          Register
        </h1>
        <RegisterForm />
      </div>
    </div>
  );
}
