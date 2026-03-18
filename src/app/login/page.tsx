'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser, initiateEmailSignIn, initiateEmailSignUp, setDocumentNonBlocking, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/panel-de-control');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async () => {
    if (!auth) return;
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, ingresa tu correo y contraseña.",
      });
      return;
    }
    try {
      await initiateEmailSignIn(auth, email, password);
      toast({
        title: "Inicio de sesión exitoso",
        description: "Serás redirigido a tu panel de control.",
      });
    } catch (error: any) {
      console.error("Sign in error:", error);
      if (error.code === 'auth/invalid-credential') {
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "Las credenciales son incorrectas. Por favor, verifica tu correo y contraseña.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.",
        });
      }
    }
  };
  
  const handleSignUp = async () => {
    if (!auth || !firestore) return;
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, ingresa un correo y contraseña para registrarte.",
      });
      return;
    }

    try {
      const userCredential = await initiateEmailSignUp(auth, email, password);
      const user = userCredential.user;
      
      const userDocRef = doc(firestore, 'users', user.uid);
      const profileData = {
          id: user.uid,
          email: user.email,
          role: 'license_admin', // Default role
          name: '',
          lastName: '',
          dni: '',
          phone: '',
      }
      setDocumentNonBlocking(userDocRef, profileData, { merge: true });

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
