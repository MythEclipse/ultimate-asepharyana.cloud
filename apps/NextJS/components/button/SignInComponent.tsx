'use server';
import { signIn } from '@/lib/auth';
import React from 'react';
export default async function SignIn() {
  return (
    <form
      action={async () => {
        await signIn('google');
      }}
    >
      <button type='submit'>Signin with Google</button>
    </form>
  );
}
