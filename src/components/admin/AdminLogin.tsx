'use client';

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, initiateEmailSignIn, initiateEmailSignUp } from '@/firebase';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import Logo from '../Logo';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [isPending, startTransition] = useTransition();
  const [isRegistering, setIsRegistering] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuthAction = (values: LoginFormValues) => {
    startTransition(() => {
        if (isRegistering) {
            initiateEmailSignUp(auth, values.email, values.password);
            toast({
                title: 'Registro iniciado',
                description: 'Revisa tu bandeja de entrada para verificar tu correo si es necesario.',
            });
        } else {
            initiateEmailSignIn(auth, values.email, values.password);
        }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo isLink={false} />
            </div>
          <CardTitle>{isRegistering ? 'Registrar Administrador' : 'Panel de Administración'}</CardTitle>
          <CardDescription>
            {isRegistering ? 'Cree una nueva cuenta de administrador.' : 'Inicie sesión para gestionar los turnos.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(handleAuthAction)}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="admin@email.com" {...form.register('email')} />
                    {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input id="password" type="password" {...form.register('password')} />
                    {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isRegistering ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />)}
                    {isRegistering ? 'Registrar' : 'Ingresar'}
                </Button>
                <Button variant="link" type="button" onClick={() => {
                    setIsRegistering(!isRegistering);
                    form.reset();
                }}>
                    {isRegistering ? '¿Ya tiene una cuenta? Inicie sesión' : '¿No tiene cuenta? Regístrese'}
                </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
