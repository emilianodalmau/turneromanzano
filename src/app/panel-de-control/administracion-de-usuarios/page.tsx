'use client';

import { useState } from 'react';
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
import { Loader2, Trash2, UserPlus, Pencil, X, Save } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// --- FORMULARIO PARA CREAR / EDITAR USUARIO ---

interface UserFormData {
  name: string;
  lastName: string;
  email: string;
  dni: string;
  phone: string;
  role: 'manzano_admin' | 'license_admin';
  password?: string;
}

const emptyFormData: UserFormData = {
  name: '',
  lastName: '',
  email: '',
  dni: '',
  phone: '',
  role: 'manzano_admin',
  password: '',
};

function UserFormDialog({
  mode,
  initialData,
  open,
  onOpenChange,
  onSave,
}: {
  mode: 'create' | 'edit';
  initialData?: UserFormData & { id?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: UserFormData, userId?: string) => Promise<void>;
}) {
  const [formData, setFormData] = useState<UserFormData>(initialData || emptyFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.name.trim()) { setError('El nombre es requerido.'); return; }
    if (!formData.lastName.trim()) { setError('El apellido es requerido.'); return; }
    if (!formData.email.trim()) { setError('El email es requerido.'); return; }
    if (!formData.dni.trim()) { setError('El DNI es requerido.'); return; }
    if (!formData.phone.trim()) { setError('El teléfono es requerido.'); return; }
    if (mode === 'create' && (!formData.password || formData.password.length < 6)) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(formData, initialData?.id);
      onOpenChange(false);
      // Reset form after successful create
      if (mode === 'create') {
        setFormData(emptyFormData);
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFormData(initialData || emptyFormData);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Agregar Nuevo Usuario' : 'Editar Usuario'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completá los datos para crear un nuevo usuario administrador.'
              : 'Modificá los datos del usuario.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Pérez"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="usuario@municipalidad.gob.ar"
              disabled={mode === 'edit'}
            />
            {mode === 'edit' && (
              <p className="text-xs text-muted-foreground">El email no se puede modificar.</p>
            )}
          </div>
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => handleChange('dni', e.target.value)}
                placeholder="30123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="2622-123456"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manzano_admin">Admin Museo</SelectItem>
                <SelectItem value="license_admin">Admin Licencias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- LISTA DE USUARIOS ---

function UserList({ users, currentUser }: { users: User[], currentUser: User | null }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<(UserFormData & { id: string }) | null>(null);

    const getRoleName = (role?: string) => {
        switch(role) {
            case 'super_admin': return 'Super Admin';
            case 'manzano_admin': return 'Admin Museo';
            case 'license_admin': return 'Admin Licencias';
            default: return 'Sin rol';
        }
    };

    const getRoleVariant = (role?: string) => {
        switch(role) {
            case 'super_admin': return 'default' as const;
            case 'manzano_admin': return 'secondary' as const;
            case 'license_admin': return 'outline' as const;
            default: return 'secondary' as const;
        }
    };

    const handleCreateUser = async (data: UserFormData) => {
        if (!firestore) throw new Error('No se pudo conectar a la base de datos.');

        // Create a secondary Firebase app to create the user without signing out the current admin
        const secondaryAppName = `secondary-${Date.now()}`;
        let secondaryApp;
        try {
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            // Create the authentication user
            const credential = await createUserWithEmailAndPassword(
                secondaryAuth,
                data.email,
                data.password!
            );

            // Create the user profile document in Firestore
            const userDocRef = doc(firestore, 'users', credential.user.uid);
            setDocumentNonBlocking(userDocRef, {
                id: credential.user.uid,
                name: data.name,
                lastName: data.lastName,
                email: data.email,
                dni: data.dni,
                phone: data.phone,
                role: data.role,
            }, { merge: true });

            // Sign out of the secondary app to clean up
            await secondaryAuth.signOut();

            toast({
                title: "Usuario Creado",
                description: `${data.name} ${data.lastName} fue creado como ${getRoleName(data.role)}.`,
            });
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                throw new Error('Ya existe un usuario con ese email.');
            }
            if (err.code === 'auth/invalid-email') {
                throw new Error('El email ingresado no es válido.');
            }
            if (err.code === 'auth/weak-password') {
                throw new Error('La contraseña es demasiado débil.');
            }
            throw new Error(err.message || 'Error al crear el usuario.');
        } finally {
            // Always clean up the secondary app
            if (secondaryApp) {
                try { await deleteApp(secondaryApp); } catch {}
            }
        }
    };

    const handleEditUser = async (data: UserFormData, userId?: string) => {
        if (!firestore || !userId) throw new Error('No se pudo conectar a la base de datos.');

        const userDocRef = doc(firestore, 'users', userId);
        setDocumentNonBlocking(userDocRef, {
            name: data.name,
            lastName: data.lastName,
            dni: data.dni,
            phone: data.phone,
            role: data.role,
        }, { merge: true });

        toast({
            title: "Usuario Actualizado",
            description: `Los datos de ${data.name} ${data.lastName} fueron actualizados.`,
        });
    };

    const handleStartEdit = (user: User) => {
        setEditingUser({
            id: user.id,
            name: user.name || '',
            lastName: user.lastName || '',
            email: user.email,
            dni: user.dni || '',
            phone: user.phone || '',
            role: (user.role === 'manzano_admin' || user.role === 'license_admin') ? user.role : 'manzano_admin',
        });
        setEditDialogOpen(true);
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

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle>Usuarios Administradores</CardTitle>
                        <CardDescription>
                            Gestión de usuarios con roles de administrador en la plataforma.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Agregar Usuario
                    </Button>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No hay usuarios administradores registrados en el sistema.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>DNI</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.name || '-'} {user.lastName || ''}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.dni || '-'}</TableCell>
                                        <TableCell>{user.phone || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleVariant(user.role)}>
                                                {getRoleName(user.role)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.role !== 'super_admin' ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleStartEdit(user)}
                                                        title="Editar usuario"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="Eliminar usuario">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta acción eliminará el perfil de <strong>{user.name} {user.lastName}</strong> del sistema.
                                                                    El usuario no podrá acceder al panel de control.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(user.id, `${user.name} ${user.lastName}`)}
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                >
                                                                    Eliminar
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">Protegido</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog para crear usuario */}
            <UserFormDialog
                mode="create"
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSave={handleCreateUser}
            />

            {/* Dialog para editar usuario */}
            {editingUser && (
                <UserFormDialog
                    mode="edit"
                    initialData={editingUser}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    onSave={handleEditUser}
                />
            )}
        </>
    );
}

// --- PÁGINA PRINCIPAL ---

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
