'use client';

import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';

const profileFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  lastName: z.string().min(1, 'El apellido es requerido.'),
  dni: z.string().min(7, 'El DNI es requerido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
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
      name: '',
      lastName: '',
      dni: '',
      phone: '',
      role: 'license_admin',
    },
  });
  
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        lastName: profile.lastName || '',
        dni: profile.dni || '',
        phone: profile.phone || '',
        role: profile.role || 'license_admin',
      });
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

    // A user cannot assign themselves the super_admin role.
    if (data.role === 'super_admin' && profile?.role !== 'super_admin') {
        toast({
            variant: "destructive",
            title: 'Acción no permitida',
            description: 'No puedes asignarte el rol de Super Administrador.',
        });
        // Reset form to current profile role to avoid inconsistent state
        form.reset({ role: profile?.role || 'license_admin' });
        return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const profileData = {
        ...data,
        id: user.uid,
        email: user.email,
    }
    
    setDocumentNonBlocking(userDocRef, profileData, { merge: true });

    toast({
      title: 'Perfil Actualizado',
      description: 'Tus datos han sido actualizados correctamente.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Perfil</CardTitle>
        <CardDescription>Aquí puedes ver y editar tus datos y administrar tus permisos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="font-medium">Email</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu nombre" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu apellido" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="dni"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>DNI</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu DNI" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                            <Input placeholder="Tu teléfono" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <Label>Rol de acceso</Label>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="manzano_admin" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Administrador Parque
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
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Guardar Cambios</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
