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
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = getFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/panel-de-control');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = () => {
    if (!auth) return;
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, ingresa tu correo y contraseña.",
      });
      return;
    }
    initiateEmailSignIn(auth, email, password);
  };
  
  const handleSignUp = async () => {
    if (!auth) return;
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, ingresa un correo y contraseña para registrarte.",
      });
      return;
    }

    try {
      // The `initiateEmailSignUp` function handles the creation of the user in Firebase Auth.
      // We don't need to create a Firestore document here.
      // The user profile document will be created/updated when the user visits their profile page.
      await initiateEmailSignUp(auth, email, password);
      // The onAuthStateChanged listener in the provider will handle the redirect after sign-up and sign-in.
      toast({
        title: "Registro exitoso",
        description: "Serás redirigido a tu panel de control.",
      });
      
    } catch (error: any) {
        console.error("Sign up error:", error);
        if (error.code === 'auth/email-already-in-use') {
             toast({
                variant: "destructive",
                title: 'Error de Registro',
                description: 'El correo electrónico ya está en uso. Por favor, intenta iniciar sesión o utiliza otro correo.',
            });
        } else {
             toast({
                variant: "destructive",
                title: 'Error de Registro',
                description: error.message,
            });
        }
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
