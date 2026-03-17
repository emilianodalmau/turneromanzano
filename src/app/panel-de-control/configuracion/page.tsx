'use client';

import { useUser, useFirestore, uploadFile, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import Image from 'next/image';
import { AppConfiguration } from '@/lib/types';
import { useState } from 'react';
import * as XLSX from 'xlsx';


const configFormSchema = z.object({
  logo: z.instanceof(File).optional(),
});

type ConfigFormValues = z.infer<typeof configFormSchema>;

function SchoolUploader() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [schoolFile, setSchoolFile] = useState<File | null>(null);
    const [isUploadingSchools, setIsUploadingSchools] = useState(false);

    const handleSchoolUpload = async () => {
        if (!schoolFile || !firestore) return;
        setIsUploadingSchools(true);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    if (!data) {
                        toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo." });
                        setIsUploadingSchools(false);
                        return;
                    }
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const schoolsList = XLSX.utils.sheet_to_json<{ escuelas: string }>(worksheet);

                    if (schoolsList.length === 0 || !schoolsList[0] || !('escuelas' in schoolsList[0])) {
                         toast({ variant: "destructive", title: "Formato Incorrecto", description: "El archivo Excel debe tener una columna llamada 'escuelas'." });
                         setIsUploadingSchools(false);
                         return;
                    }

                    const batchSize = 500;
                    const numBatches = Math.ceil(schoolsList.length / batchSize);

                    for (let i = 0; i < numBatches; i++) {
                        const batch = writeBatch(firestore);
                        const start = i * batchSize;
                        const end = start + batchSize;
                        const schoolsSlice = schoolsList.slice(start, end);

                        schoolsSlice.forEach(school => {
                            if (school.escuelas && school.escuelas.trim() !== '') {
                                const newSchoolRef = doc(collection(firestore, 'schools'));
                                batch.set(newSchoolRef, { name: school.escuelas.trim() });
                            }
                        });
                        await batch.commit();
                    }

                    toast({ title: 'Éxito', description: `${schoolsList.length} escuelas subidas correctamente.` });
                } catch (err) {
                    console.error("Error processing schools file:", err);
                    toast({ variant: "destructive", title: "Error", description: "Ocurrió un problema al procesar el archivo. Asegúrate que el formato sea el correcto." });
                } finally {
                    setIsUploadingSchools(false);
                    setSchoolFile(null);
                }
            };
            reader.onerror = () => {
                 toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo." });
                 setIsUploadingSchools(false);
            }
            reader.readAsBinaryString(schoolFile);

        } catch (error) {
            console.error("Error initiating school upload:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo iniciar la carga del archivo." });
            setIsUploadingSchools(false);
        }
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Lista de Escuelas</CardTitle>
                <CardDescription>
                    Sube un archivo Excel (.xlsx, .xls) con una columna llamada "escuelas" para actualizar la lista de instituciones en el formulario de turnos. La subida reemplazará la lista existente.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={e => setSchoolFile(e.target.files?.[0] || null)} 
                    disabled={isUploadingSchools}
                />
                <Button onClick={handleSchoolUpload} disabled={isUploadingSchools || !schoolFile}>
                    {isUploadingSchools ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Subiendo...
                        </>
                    ) : (
                         <>
                            <Upload className="mr-2 h-4 w-4" />
                           Subir Lista
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}

export default function ConfiguracionPage() {
  const { profile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const configRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'appConfiguration', 'main') : null),
    [firestore]
  );
  const { data: appConfig, isLoading: isConfigLoading } = useDoc<AppConfiguration>(configRef);


  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configFormSchema),
  });
  
  const { isSubmitting } = form.formState;

  if (isUserLoading || isConfigLoading) {
    return <p>Cargando configuración...</p>;
  }

  if (profile?.role !== 'super_admin') {
    return (
       <div>
         <h1 className="text-2xl font-semibold mb-4">Configuración</h1>
         <p>No tienes permisos para acceder a esta sección.</p>
       </div>
    );
  }

  const onSubmit = async (data: ConfigFormValues) => {
    if (!firestore) return;
    if (!data.logo) {
      toast({
        title: 'No hay cambios',
        description: 'No has seleccionado un nuevo logo para subir.',
      });
      return;
    }

    try {
      const filePath = `config/logo.png`;
      const downloadURL = await uploadFile(data.logo, filePath);
      
      const configDocRef = doc(firestore, 'appConfiguration', 'main');
      setDocumentNonBlocking(configDocRef, { logoUrl: downloadURL }, { merge: true });

      toast({
        title: 'Logo Actualizado',
        description: 'El logo de la aplicación ha sido cambiado exitosamente.',
      });
      form.reset();

    } catch (error) {
        console.error("Error updating logo:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo actualizar el logo. Inténtalo de nuevo."
        });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configuración General</h1>
      
      <Card>
        <CardHeader>
            <CardTitle>Logo de la Aplicación</CardTitle>
            <CardDescription>Sube un nuevo logo para la aplicación. Se mostrará en el encabezado principal.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <h3 className="text-sm font-medium">Logo Actual</h3>
                <div className="p-4 border rounded-md flex justify-center items-center bg-muted/50">
                    {appConfig?.logoUrl ? (
                         <Image src={appConfig.logoUrl} alt="Logo actual" width={200} height={75} style={{objectFit: 'contain'}} />
                    ) : (
                        <p className="text-muted-foreground text-sm">No hay un logo personalizado. Se está usando el logo por defecto.</p>
                    )}
                </div>

                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="logo"
                            render={({ field: { onChange, value, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Subir Nuevo Logo</FormLabel>
                                    <FormControl>
                                       <Input type="file" accept="image/png, image/jpeg, image/webp, image/svg+xml" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Guardar Logo
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            </div>
        </CardContent>
      </Card>

      <SchoolUploader />

    </div>
  );
}
