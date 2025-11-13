'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser, initiateEmailSignIn, initiateEmailSignUp } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { UserCredential } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = getFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/panel-de-control');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = () => {
    if (!email || !password) {
      alert('Por favor, ingresa tu correo y contraseña.');
      return;
    }
    initiateEmailSignIn(auth, email, password);
  };
  
  const handleSignUp = async () => {
    if (!email || !password) {
      alert('Por favor, ingresa un correo y contraseña para registrarte.');
      return;
    }

    try {
      // We are not using the non-blocking version here because we need the user credential
      // to create the user profile document.
      const userCredential: UserCredential = await initiateEmailSignUp(auth, email, password);
      const user = userCredential.user;

      if (user) {
        // Create a user profile document in Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, {
          id: user.uid,
          email: user.email,
          role: 'license_admin', // Assign a default role
          name: '',
          lastName: '',
          dni: '',
          phone: '',
        });
        // The onAuthStateChanged listener in the provider will handle the redirect.
      }
    } catch (error: any) {
        console.error("Sign up error:", error);
        alert(`Error al registrarse: ${error.message}`);
    }
  };


  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico a continuación para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleSignIn} className="w-full">
            Iniciar Sesión
          </Button>
          <Button onClick={handleSignUp} variant="outline" className="w-full">
            Registrarse
          </Button>
           <Link href="/" passHref className="w-full">
             <Button variant="link" className="w-full">Volver al Inicio</Button>
           </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
