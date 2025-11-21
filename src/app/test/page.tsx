'use client';

import { Button } from '@/components/ui/button';
import { initializeFirebase } from '@/firebase';
import { getStorage, ref } from 'firebase/storage';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  // Use useMemo to ensure initialization only runs once per component mount.
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

      // Get a reference to the storage service using the initialized app
      const storage = getStorage(firebaseServices.firebaseApp);
      console.log('Servicio de Storage obtenido:', storage);

      // Create a reference to a test file
      const testFileRef = ref(storage, 'comprobantesPago/test.txt');
      console.log('Referencia de archivo de prueba creada:', testFileRef.fullPath);
      
      alert('Intento de conexión realizado. Revisa la consola para ver si hubo errores de CORS.');

    } catch (error: any) {
      console.error('Error durante la conexión de prueba:', error);
      alert(`Falló la conexión: ${error.message}`);
    }
  };


  return (
    <div className="container mx-auto p-8">
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
                        gs://{storageBucketUrl}
                    </code>
                ) : (
                     <p className="text-destructive mt-2">No se pudo detectar la URL del bucket. ¿Está la configuración de Firebase correcta?</p>
                )}
            </div>

            <div>
                <h3 className="font-semibold">2. Ejecuta el Comando CORS</h3>
                <p className="text-muted-foreground mt-1">Copia y pega el siguiente comando en tu terminal para aplicar la configuración de CORS al bucket correcto:</p>
                <code className="block bg-muted text-foreground p-3 rounded-md mt-2 break-words">
                    gsutil cors set cors.json gs://{storageBucketUrl || '[URL-DEL-BUCKET]'}
                </code>
            </div>

            <div>
                 <h3 className="font-semibold">3. Verifica la Conexión</h3>
                 <p className="text-muted-foreground mt-1">Después de ejecutar el comando `gsutil`, haz clic en este botón para intentar conectar. Revisa la consola de tu navegador para ver si aparecen errores de CORS.</p>
                 <Button onClick={handleConnect} className="mt-4" disabled={!storageBucketUrl}>
                    Verificar Conexión a Bucket
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
