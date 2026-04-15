'use client';

import { useState, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, Trash2, CheckCircle2, AlertCircle, FileSpreadsheet, List } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function TemporalPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textInput, setTextInput] = useState('');
  const [parsedSchools, setParsedSchools] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingSchools, setExistingSchools] = useState<{ id: string; name: string }[]>([]);
  const [showExisting, setShowExisting] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: number } | null>(null);

  // Parse text input (one school per line)
  const handleParseText = () => {
    const lines = textInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Remove duplicates
    const unique = [...new Set(lines)];
    setParsedSchools(unique);
    setUploadResult(null);

    toast({
      title: `${unique.length} escuelas detectadas`,
      description: `Se encontraron ${unique.length} nombres únicos.`,
    });
  };

  // Parse CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      // Try to detect if it's CSV or plain text
      const lines = content
        .split('\n')
        .map(line => {
          // If CSV, take the first column (or the whole line if no comma)
          const parts = line.split(',');
          return parts[0].replace(/"/g, '').trim();
        })
        .filter(line => line.length > 0 && line.toLowerCase() !== 'nombre' && line.toLowerCase() !== 'name' && line.toLowerCase() !== 'escuela');

      const unique = [...new Set(lines)];
      setParsedSchools(unique);
      setTextInput(unique.join('\n'));
      setUploadResult(null);

      toast({
        title: `${unique.length} escuelas importadas del archivo`,
        description: `Archivo: ${file.name}`,
      });
    };
    reader.readAsText(file, 'UTF-8');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload all parsed schools to Firestore
  const handleUpload = async () => {
    if (!firestore || parsedSchools.length === 0) return;

    setIsUploading(true);
    setUploadResult(null);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Use batched writes for efficiency (max 500 per batch)
      const batchSize = 450;
      for (let i = 0; i < parsedSchools.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const chunk = parsedSchools.slice(i, i + batchSize);

        for (const schoolName of chunk) {
          // Create a sanitized ID from the school name
          const schoolId = schoolName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove diacritics
            .replace(/[^a-z0-9\s-]/g, '')    // remove special chars
            .replace(/\s+/g, '-')            // spaces to hyphens
            .replace(/-+/g, '-')             // collapse multiple hyphens
            .substring(0, 60);               // limit length

          const schoolRef = doc(firestore, 'schools', schoolId);
          batch.set(schoolRef, { name: schoolName });
        }

        try {
          await batch.commit();
          successCount += chunk.length;
        } catch (err) {
          console.error('Batch write error:', err);
          errorCount += chunk.length;
        }
      }

      setUploadResult({ success: successCount, errors: errorCount });

      if (errorCount === 0) {
        toast({
          title: '¡Carga exitosa!',
          description: `Se cargaron ${successCount} escuelas a Firestore.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Carga parcial',
          description: `${successCount} exitosas, ${errorCount} con error.`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Error en la carga',
        description: 'No se pudieron cargar las escuelas. Verificá los permisos de Firestore.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Load existing schools from Firestore
  const handleLoadExisting = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const schoolsCollection = collection(firestore, 'schools');
      const snapshot = await getDocs(schoolsCollection);
      const schools = snapshot.docs.map(doc => ({
        id: doc.id,
        name: (doc.data() as { name: string }).name,
      }));
      schools.sort((a, b) => a.name.localeCompare(b.name));
      setExistingSchools(schools);
      setShowExisting(true);
      toast({
        title: `${schools.length} escuelas encontradas`,
        description: schools.length === 0
          ? 'La colección está vacía. Cargá escuelas usando esta página.'
          : 'Mostrando todas las escuelas cargadas.',
      });
    } catch (error) {
      console.error('Error loading schools:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar',
        description: 'No se pudieron leer las escuelas. Verificá los permisos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete all existing schools
  const handleDeleteAll = async () => {
    if (!firestore || existingSchools.length === 0) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que querés eliminar las ${existingSchools.length} escuelas? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const batchSize = 450;
      for (let i = 0; i < existingSchools.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const chunk = existingSchools.slice(i, i + batchSize);
        for (const school of chunk) {
          const schoolRef = doc(firestore, 'schools', school.id);
          batch.delete(schoolRef);
        }
        await batch.commit();
      }

      setExistingSchools([]);
      toast({
        title: 'Escuelas eliminadas',
        description: 'Se eliminaron todas las escuelas de Firestore.',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: 'No se pudieron eliminar las escuelas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a single school from the parsed list
  const handleRemoveFromList = (index: number) => {
    const updated = [...parsedSchools];
    updated.splice(index, 1);
    setParsedSchools(updated);
    setTextInput(updated.join('\n'));
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Carga de Escuelas</h1>
          <p className="text-muted-foreground mt-1">
            Página temporal para importar escuelas a la base de datos
          </p>
        </div>
        <Link href="/turnos">
          <Button variant="outline">Ir a Turnos</Button>
        </Link>
      </div>

      {/* Sección: Ver escuelas existentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Escuelas Existentes en Firestore
          </CardTitle>
          <CardDescription>
            Verificá qué escuelas ya están cargadas en la base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleLoadExisting} disabled={isLoading} variant="secondary">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...</>
              ) : (
                'Ver Escuelas Cargadas'
              )}
            </Button>
            {existingSchools.length > 0 && (
              <Button onClick={handleDeleteAll} disabled={isLoading} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Todas ({existingSchools.length})
              </Button>
            )}
          </div>
          {showExisting && (
            existingSchools.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Colección vacía</AlertTitle>
                <AlertDescription>
                  No hay escuelas cargadas en Firestore. Usá la sección de abajo para importarlas.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-md border p-3 space-y-1">
                {existingSchools.map((school, i) => (
                  <div key={school.id} className="flex items-center justify-between py-1 px-2 hover:bg-muted rounded text-sm">
                    <span>{i + 1}. {school.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">{school.id}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Sección: Importar escuelas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Escuelas
          </CardTitle>
          <CardDescription>
            Pegá los nombres de las escuelas (uno por línea) o importá un archivo CSV/TXT.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Opción 1: Archivo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Opción 1: Importar desde archivo (CSV o TXT)</label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="max-w-sm"
              />
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              El archivo debe tener un nombre de escuela por línea, o ser un CSV donde la primera columna sea el nombre.
            </p>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-sm text-muted-foreground">o</span>
          </div>

          {/* Opción 2: Texto */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Opción 2: Pegar nombres manualmente</label>
            <Textarea
              placeholder={`Escuela N° 1-001 "José de San Martín"\nEscuela N° 1-002 "Domingo F. Sarmiento"\nEscuela N° 1-003 "Manuel Belgrano"\n...`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Un nombre de escuela por línea. Se eliminarán duplicados automáticamente.
              </p>
              <Button onClick={handleParseText} disabled={textInput.trim().length === 0} variant="secondary" size="sm">
                Procesar Lista
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección: Vista previa y carga */}
      {parsedSchools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Vista Previa — {parsedSchools.length} escuelas listas para cargar
            </CardTitle>
            <CardDescription>
              Revisá la lista y eliminá las que no correspondan antes de cargar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto rounded-md border p-3 space-y-1">
              {parsedSchools.map((name, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted rounded text-sm group">
                  <span>{i + 1}. {name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive"
                    onClick={() => handleRemoveFromList(i)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setParsedSchools([]);
                setTextInput('');
                setUploadResult(null);
              }}
            >
              Limpiar Lista
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo a Firestore...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Cargar {parsedSchools.length} Escuelas</>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Resultado */}
      {uploadResult && (
        <Alert variant={uploadResult.errors > 0 ? 'destructive' : 'default'}>
          {uploadResult.errors > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertTitle>Resultado de la carga</AlertTitle>
          <AlertDescription>
            ✅ {uploadResult.success} escuelas cargadas exitosamente.
            {uploadResult.errors > 0 && ` ❌ ${uploadResult.errors} con error.`}
            {' '}Podés verificar yendo a{' '}
            <Link href="/turnos" className="font-semibold underline">la página de turnos</Link>.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
