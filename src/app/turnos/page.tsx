'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

// Schema de validación sin campos de fecha y hora
const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  lastName: z.string().min(1, 'El apellido es requerido.'),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres.'),
  schoolName: z.string().min(1, 'El nombre de la institución es requerido.'),
  visitorCount: z.coerce.number().min(1, 'Debe haber al menos 1 visitante.').max(70, 'El máximo es 70 visitantes.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function TurnosPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      lastName: '',
      email: '',
      phone: '',
      dni: '',
      schoolName: '',
      visitorCount: 1,
    },
  });

  async function onSubmit(data: FormValues) {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
        return;
    }

    try {
        const userId = `user_${data.dni}_${Date.now()}`;
        const userRef = doc(firestore, 'users', userId);

        // Se crea la solicitud de turno sin fecha ni hora específica
        const newAppointmentRequest = {
            userId: userId,
            date: '', // Se deja vacío
            startTime: '', // Se deja vacío
            endTime: '', // Se deja vacío
            responsibleName: `${data.name} ${data.lastName}`,
            schoolName: data.schoolName,
            visitorCount: data.visitorCount,
            status: 'pending' as 'pending',
            createdAt: new Date().toISOString(),
        };

        const appointmentsCollection = collection(firestore, 'appointments');
        const appointmentDocRef = await addDocumentNonBlocking(appointmentsCollection, newAppointmentRequest);
        
        const userProfile = {
            id: userId,
            name: data.name,
            lastName: data.lastName,
            dni: data.dni,
            phone: data.phone,
            email: data.email,
        };
        
        if (appointmentDocRef) {
          setDocumentNonBlocking(userRef, userProfile, { merge: true });
        }

        toast({
            title: 'Solicitud de Turno Enviada',
            description: 'Hemos recibido tu solicitud. Nos pondremos en contacto para confirmar la fecha y hora.',
        });
        form.reset();
    } catch (error) {
        console.error('Error al guardar la solicitud de turno:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo enviar la solicitud. Por favor, inténtalo de nuevo.',
        });
    }
}

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Solicitud de Turno para Visitas</CardTitle>
          <CardDescription>Completa tus datos y nos pondremos en contacto para coordinar la visita.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos de la Institución</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="schoolName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre de la escuela o institución</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Escuela N°1" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="visitorCount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cantidad de visitantes</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" max="70" placeholder="Ej: 25" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos del Responsable</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Juan" {...field} />
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
                                    <Input placeholder="Ej: Pérez" {...field} />
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
                                <FormLabel>DNI del responsable</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 30123456" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email de contacto</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="ejemplo@correo.com" {...field} />
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
                                <FormLabel>Teléfono de contacto</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 1122334455" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

              <Button type="submit" className="w-full">Enviar Solicitud</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
