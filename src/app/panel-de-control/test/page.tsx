'use client';

import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Loader2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, writeBatch } from 'firebase/firestore';

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
                let schoolsList: { escuelas: string }[] = [];
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
                    schoolsList = XLSX.utils.sheet_to_json<{ escuelas: string }>(worksheet);

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
                } catch (err: any) {
                    if (err.name === 'FirebaseError' && err.code === 'permission-denied') {
                        const permissionError = new FirestorePermissionError({
                            path: 'schools',
                            operation: 'create',
                            requestResourceData: { note: `Batch creating ${schoolsList.length} schools from Excel file.` }
                        });
                        errorEmitter.emit('permission-error', permissionError);
                    } else {
                        toast({ 
                            variant: "destructive", 
                            title: "Error al Procesar Archivo", 
                            description: "Ocurrió un problema al leer o guardar los datos. Asegúrate de que el formato del archivo es correcto." 
                        });
                    }
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
            toast({ variant: "destructive", title: "Error", description: "No se pudo iniciar la carga del archivo." });
            setIsUploadingSchools(false);
        }
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Importar Lista de Escuelas</CardTitle>
                <CardDescription>
                    Sube un archivo Excel (.xlsx, .xls) con la lista de escuelas para poblar el selector en el formulario de turnos.
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
                           Subir Lista de Escuelas
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}

export default function TestPage() {
  const { profile, isUserLoading } = useUser();

  const handleDownloadModel = () => {
    // 1. Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws_data = [
      ["escuelas"],
      ["Escuela Ejemplo N°1"],
      ["Colegio Secundario Ejemplo"],
      ["Instituto de Formación Docente Ejemplo"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Set column width for better readability
    ws['!cols'] = [{ wch: 50 }];

    XLSX.utils.book_append_sheet(wb, ws, "Lista de Escuelas");

    // 2. Generate buffer and create a Blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    
    // 3. Create a download link and trigger click to download the file
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacion_escuelas.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (profile?.role !== 'manzano_admin' && profile?.role !== 'super_admin') {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Acceso Denegado</h1>
        <p>No tienes los permisos necesarios para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelo de Importación de Escuelas</CardTitle>
          <CardDescription>
            Haz clic en el botón para descargar un archivo Excel de ejemplo. 
            Utiliza este modelo para cargar la lista de escuelas.
            La única columna requerida debe llamarse &quot;escuelas&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadModel}>
            <Download className="mr-2 h-4 w-4" />
            Descargar Modelo Excel
          </Button>
        </CardContent>
      </Card>

      <SchoolUploader />
    </div>
  );
}
