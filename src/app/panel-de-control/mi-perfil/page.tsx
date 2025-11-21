'use client';

import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

const profileFormSchema = z.object({
  role: z.enum(['manzano_admin', 'license_admin', 'super_admin']),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function MyProfilePage() {
  const { user, profile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      role: profile?.role || 'license_admin',
    },
  });
  
  useEffect(() => {
    if (profile?.role) {
      form.reset({ role: profile.role });
    }
  }, [profile, form]);

  if (isUserLoading) {
    return <p>Cargando perfil...</p>;
  }

  if (!user) {
    return <p>No has iniciado sesión.</p>;
  }

  const onSubmit = (data: ProfileFormValues) => {
    if (!firestore || !user) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    setDocumentNonBlocking(userDocRef, { role: data.role }, { merge: true });

    toast({
      title: 'Perfil Actualizado',
      description: 'Tu rol ha sido actualizado correctamente.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Perfil</CardTitle>
        <CardDescription>Aquí puedes ver tus datos y administrar tus permisos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="font-medium">Email</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div>
          <p className="font-medium">Rol Actual</p>
          <p className="text-muted-foreground capitalize">{profile?.role?.replace('_', ' ') || 'Sin rol asignado'}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <Label>Selecciona tu nuevo rol</Label>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="manzano_admin" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Administrador Museo
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="license_admin" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Administrador Licencias
                        </FormLabel>
                      </FormItem>
                       {profile?.role === 'super_admin' && (
                         <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="super_admin" />
                            </FormControl>
                            <FormLabel className="font-normal">
                            Super Administrador
                            </FormLabel>
                        </FormItem>
                       )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Guardar Rol</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
