'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { User } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
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
import { Loader2 } from 'lucide-react';

function UserList({ users }: { users: User[] }) {
    
    const getRoleVariant = (role?: string) => {
        switch(role) {
            case 'super_admin': return 'default';
            case 'manzano_admin': return 'secondary';
            case 'license_admin': return 'outline';
            default: return 'secondary';
        }
    }

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
                                    <Badge variant={getRoleVariant(user.role)}>
                                        {user.role!.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
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

    // This query now correctly filters for documents where the 'role' field is one of the specified admin roles.
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


    return <UserList users={users || []} />;
}
