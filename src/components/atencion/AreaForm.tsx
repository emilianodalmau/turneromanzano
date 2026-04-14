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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Area } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AreaFormProps {
  onFormSubmit?: () => void;
}

export function AreaForm({ onFormSubmit }: AreaFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: FormValues) {
    if (!firestore) return;

    try {
      const areasCollection = collection(firestore, 'areas');
      const newArea = {
        name: data.name,
        description: data.description || '',
      };
      
      await addDocumentNonBlocking(areasCollection, newArea);
      
      toast({
        title: 'Área Creada',
        description: `El área "${data.name}" ha sido creada exitosamente.`,
      });

      form.reset();
      onFormSubmit?.();
    } catch (error) {
      console.error('Error creando el área:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el área. Por favor, inténtalo de nuevo.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Nombre del Área</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Licencias de Conducir" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe brevemente el propósito de esta área."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            'Crear Área'
          )}
        </Button>
      </form>
    </Form>
  );
}
