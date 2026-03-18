'use client';

import { useUser } from '@/firebase';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as XLSX from 'xlsx';

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
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Modelo de Importación de Escuelas</CardTitle>
          <CardDescription>
            Haz clic en el botón para descargar un archivo Excel de ejemplo. 
            Utiliza este modelo para cargar la lista de escuelas en la sección de Configuración. 
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
    </div>
  );
}
