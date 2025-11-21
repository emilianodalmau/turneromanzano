
'use client';

import { Button } from '@/components/ui/button';
import { initializeFirebase } from '@/firebase';
import { uploadFile } from '@/firebase/client-storage';
import { getStorage, ref } from 'firebase/storage';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import Link from 'next/link';

export default function TestPage() {
  const { toast } = useToast();
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const firebaseServices = useMemo(() => {
    try {
      return initializeFirebase();
    } catch (error) {
      console.error("Firebase initialization failed on test page:", error);
      return null;
    }
  }, []);

  const storageBucketUrl = firebaseServices?.firebaseApp?.options?.storageBucket || null;

  const handleConnect = () => {
    if (!firebaseServices) {
       alert('La inicialización de Firebase falló. Revisa la consola para más detalles.');
       return;
    }

    try {
      console.log('Intentando conectar con la configuración:', firebaseServices.firebaseApp.options);
      const storage = getStorage(firebaseServices.firebaseApp);
      console.log('Servicio de Storage obtenido:', storage);
      const testFileRef = ref(storage, 'comprobantesPago/test.txt');
      console.log('Referencia de archivo de prueba creada:', testFileRef.fullPath);
      
      toast({
        title: "Prueba de conexión realizada",
        description: "Revisa la consola del navegador para ver si hubo errores de CORS o de conexión.",
      });

    } catch (error: any) {
      console.error('Error durante la conexión de prueba:', error);
      toast({
        variant: "destructive",
        title: "Falló la conexión de prueba",
        description: error.message,
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
      setUploadResult(null); // Reset result on new file selection
    }
  };

  const handleFileUpload = async () => {
    if (!fileToUpload) {
      toast({
        variant: "destructive",
        title: "No hay archivo seleccionado",
        description: "Por favor, elige un archivo para subir.",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadResult(null);

    try {
      const filePath = `test-uploads/${Date.now()}_${fileToUpload.name}`;
      const downloadURL = await uploadFile(fileToUpload, filePath);

      setUploadResult(downloadURL);
      toast({
        title: "¡Archivo subido con éxito!",
        description: "La URL de descarga se muestra a continuación.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadResult(`Error al subir: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error al subir el archivo",
        description: "Revisa la consola del navegador para ver los detalles del error de CORS.",
      });
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="container mx-auto p-8 space-y-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>Página de Prueba de Conexión a Storage</CardTitle>
            <CardDescription>Usa esta página para verificar la conexión con Firebase Storage y solucionar problemas de CORS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold">1. URL del Bucket Detectada</h3>
                <p className="text-muted-foreground mt-1">La aplicación está configurada para usar el siguiente bucket. Úsalo en el comando `gsutil`.</p>
                {storageBucketUrl ? (
                    <code className="block bg-muted text-foreground p-3 rounded-md mt-2 break-all">
                        {storageBucketUrl}
                    </code>
                ) : (
                     <p className="text-destructive mt-2">No se pudo detectar la URL del bucket. ¿Está la configuración de Firebase correcta?</p>
                )}
            </div>

            <div>
                <h3 className="font-semibold">2. Verifica la Conexión</h3>
                 <p className="text-muted-foreground mt-1">Haz clic en este botón para intentar una conexión básica. Revisa la consola de tu navegador para ver si aparecen errores.</p>
                 <Button onClick={handleConnect} variant="outline" className="mt-4" disabled={!storageBucketUrl}>
                    Verificar Conexión
                </Button>
            </div>
        </CardContent>
      </Card>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>3. Prueba de Carga de Archivos</CardTitle>
            <CardDescription>Selecciona un archivo y súbelo para realizar una prueba real de carga en el bucket.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="picture">Seleccionar archivo</Label>
                <Input id="picture" type="file" onChange={handleFileChange} />
             </div>
             <Button onClick={handleFileUpload} disabled={isUploading || !fileToUpload}>
                {isUploading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Archivo
                    </>
                )}
             </Button>

            {uploadResult && (
                <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Resultado de la Carga:</h4>
                    {uploadResult.startsWith('http') ? (
                        <div className="p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-md">
                            <p className="text-sm text-green-800 dark:text-green-200">¡Éxito! URL de descarga:</p>
                            <Link href={uploadResult} target="_blank" rel="noopener noreferrer" className="text-sm break-all text-blue-600 hover:underline">
                                {uploadResult}
                            </Link>
                        </div>
                    ) : (
                        <p className="text-sm text-destructive bg-red-50 p-3 rounded-md border border-destructive/50">{uploadResult}</p>
                    )}
                </div>
            )}
        </CardContent>
         <CardFooter>
            <Link href="/" passHref>
                <Button variant="link">Volver al inicio</Button>
            </Link>
        </CardFooter>
      </Card>

    </div>
  );
}
