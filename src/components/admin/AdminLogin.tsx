
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, initiateAnonymousSignIn } from '@/firebase';
import { Loader2, LogIn } from 'lucide-react';
import Logo from '../Logo';

export default function AdminLogin() {
  const [isPending, startTransition] = useTransition();
  const auth = useAuth();

  const handleLogin = () => {
    startTransition(() => {
      initiateAnonymousSignIn(auth);
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo isLink={false} />
            </div>
          <CardTitle>Panel de Administración</CardTitle>
          <CardDescription>Inicie sesión para gestionar los turnos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} disabled={isPending} className="w-full">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Ingresar como Administrador
          </Button>
           <p className="mt-4 text-center text-xs text-muted-foreground">
            (Acceso simplificado con inicio de sesión anónimo para esta demostración)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
