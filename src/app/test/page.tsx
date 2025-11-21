'use client';

import { Button } from '@/components/ui/button';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';

// Your web app's Firebase configuration provided for testing
const testFirebaseConfig = {
  apiKey: "AIzaSyDvrE_erSy65SZaonL4M9QvwpZ3S-eA7e8",
  authDomain: "studio-7184675653-a4cc6.firebaseapp.com",
  projectId: "studio-7184675653-a4cc6",
  storageBucket: "studio-7184675653-a4cc6.appspot.com",
  messagingSenderId: "496821863464",
  appId: "1:496821863464:web:038e5c71a4ada14d45e11d"
};

export default function TestPage() {

  const handleConnect = () => {
    try {
      console.log('Intentando conectar con la configuración:', testFirebaseConfig);

      // We need a unique app name to initialize a second app instance for testing
      const appName = 'test-app-' + Date.now();
      const testApp: FirebaseApp = initializeApp(testFirebaseConfig, appName);
      
      console.log('App de prueba inicializada:', testApp.name);
      
      // Get a reference to the storage service
      const storage = getStorage(testApp);
      console.log('Servicio de Storage obtenido:', storage);

      // Create a reference to a test file
      const testFileRef = ref(storage, 'comprobantesPago/test.txt');
      console.log('Referencia de archivo de prueba creada:', testFileRef.fullPath);
      
      alert('Conexión exitosa. Revisa la consola para más detalles.');

    } catch (error: any) {
      console.error('Error durante la conexión de prueba:', error);
      alert(`Falló la conexión: ${error.message}`);
    }
  };


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Página de Prueba</h1>
      <p className="mt-2 mb-4">Usa este botón para intentar conectar con Firebase Storage usando la configuración proporcionada y ver los resultados en la consola.</p>
      <Button onClick={handleConnect}>
        Conectar a Bucket
      </Button>
    </div>
  );
}
