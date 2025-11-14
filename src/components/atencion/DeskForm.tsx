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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Area, Desk } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const formSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  areaId: z.string({ required_error: 'Debe seleccionar un área.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface DeskFormProps {
  areas: Area[];
  desk?: Desk | null;
  onFormSubmit?: () => void;
}

export function DeskForm({ areas, desk, onFormSubmit }: DeskFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isEditing = !!desk;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      areaId: '',
    },
  });

  useEffect(() => {
    if (isEditing && desk) {
      form.reset({
        name: desk.name,
        areaId: desk.areaId,
      });
    } else {
      form.reset({ name: '', areaId: '' });
    }
  }, [desk, isEditing, form]);

  const { isSubmitting } = form.formState;

  async function onSubmit(data: FormValues) {
    if (!firestore) return;

    try {
      if (isEditing && desk) {
        // Update existing desk
        const deskRef = doc(firestore, 'desks', desk.id);
        const updatedDeskData = {
          name: data.name,
          areaId: data.areaId,
        };
        setDocumentNonBlocking(deskRef, updatedDeskData, { merge: true });
        toast({
          title: 'Escritorio Actualizado',
          description: `El escritorio "${data.name}" ha sido actualizado.`,
        });
      } else {
        // Create new desk
        const desksCollection = collection(firestore, 'desks');
        const newDesk: Omit<Desk, 'id'> = {
          name: data.name,
          areaId: data.areaId,
          status: 'inactive', // Default status
        };
        await addDocumentNonBlocking(desksCollection, newDesk);
        toast({
          title: 'Escritorio Creado',
          description: `El escritorio "${data.name}" ha sido creado exitosamente.`,
        });
      }

      form.reset();
      onFormSubmit?.();
    } catch (error) {
      console.error('Error guardando el escritorio:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar el escritorio. Por favor, inténtalo de nuevo.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Escritorio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Ventanilla 01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="areaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Área de Atención</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un área" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Guardando...' : 'Creando...'}
            </>
          ) : (
            isEditing ? 'Guardar Cambios' : 'Crear Escritorio'
          )}
        </Button>
      </form>
    </Form>
  );
}
