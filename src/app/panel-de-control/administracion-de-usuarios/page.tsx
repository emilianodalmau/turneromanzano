'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, setDocumentNonBlocking, useUser } from '@/firebase';
import { User } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


function UserList({ users, currentUser }: { users: User[], currentUser: User | null }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const getRoleVariant = (role?: string) => {
        switch(role) {
            case 'super_admin': return 'default';
            case 'manzano_admin': return 'secondary';
            case 'license_admin': return 'outline';
            default: return 'secondary';
        }
    }

    const handleRoleChange = (userId: string, newRole: string) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        setDocumentNonBlocking(userDocRef, { role: newRole }, { merge: true });
        toast({
            title: "Rol Actualizado",
            description: `El rol del usuario ha sido cambiado a ${newRole.replace('_', ' ')}.`,
        });
    };
    
    const handleDelete = (userId: string, userName: string) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userId);
        deleteDocumentNonBlocking(userDocRef);
        toast({
            title: "Usuario Eliminado",
            description: `El usuario ${userName} ha sido eliminado del sistema.`,
            variant: "destructive"
        });
    };

    if (users.length === 0) {
        return <p>No hay usuarios administradores registrados en el sistema.</p>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Usuarios Administradores</CardTitle>
                <CardDescription>
                    Lista de usuarios con roles de administrador en la plataforma.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>DNI</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Rol</TableHead>
                            {currentUser?.role === 'super_admin' && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name || '-'} {user.lastName || ''}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.dni || '-'}</TableCell>
                                <TableCell>{user.phone || '-'}</TableCell>
                                <TableCell>
                                    {currentUser?.role === 'super_admin' && user.role !== 'super_admin' ? (
                                        <Select
                                            value={user.role}
                                            onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manzano_admin">Admin Museo</SelectItem>
                                                <SelectItem value="license_admin">Admin Licencias</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={getRoleVariant(user.role)}>
                                            {user.role ? user.role.replace('_', ' ') : 'Sin rol'}
                                        </Badge>
                                    )}
                                </TableCell>
                                 {currentUser?.role === 'super_admin' && (
                                     <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={user.role === 'super_admin'}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. Se eliminará el perfil del usuario,
                                                        pero no su cuenta de autenticación. El usuario podrá volver a iniciar sesión
                                                        pero no tendrá permisos.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(user.id, user.name)}
                                                        className="bg-destructive hover:bg-destructive/90"
                                                    >
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                 )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function AdministracionUsuariosPage() {
    const { profile, isUserLoading } = useUser();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'users'), where('role', 'in', ['manzano_admin', 'license_admin', 'super_admin'])) : null),
        [firestore]
    );

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

    if (isUserLoading || isLoadingUsers) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando usuarios...</p>
            </div>
        )
    }

    if (profile?.role !== 'super_admin') {
        return (
            <div>
                <h1 className="text-2xl font-semibold mb-4">Acceso Denegado</h1>
                <p>No tienes los permisos necesarios para acceder a esta sección.</p>
            </div>
        );
    }


    return <UserList users={users || []} currentUser={profile} />;
}
