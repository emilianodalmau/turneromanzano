'use client';

import { useUser, useAuth, initiateEmailSignIn, initiateEmailSignUp } from "@/firebase";
import { signOut } from "firebase/auth";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  if (isUserLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Punto de Partida de Firebase</h1>
      <p className="mb-6">Esta es una página de inicio limpia con la configuración de Firebase lista.</p>
      
      {user ? (
        <div>
          <p className="mb-2">Bienvenido, <span className="font-semibold">{user.email || 'Usuario'}</span>!</p>
          <button 
            onClick={() => signOut(auth)} 
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Cerrar Sesión
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p>No has iniciado sesión.</p>
          <div className="flex space-x-2">
            <button 
              onClick={() => initiateEmailSignIn(auth, 'test@example.com', '123456')} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Iniciar Sesión (test@example.com)
            </button>
            <button 
              onClick={() => initiateEmailSignUp(auth, 'test@example.com', '123456')} 
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Registrarse (test@example.com)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
