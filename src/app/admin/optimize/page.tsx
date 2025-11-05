'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { runOptimization } from '@/lib/actions';
import { OptimizeAppointmentScheduleOutput } from '@/ai/flows/optimize-appointment-schedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function OptimizePage() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OptimizeAppointmentScheduleOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimization = () => {
    startTransition(async () => {
      setError(null);
      setResult(null);
      const response = await runOptimization();
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || 'Ocurrió un error desconocido.');
      }
    });
  };
  
  const parsedSchedule = result?.suggestedSchedule ? JSON.parse(result.suggestedSchedule) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">
          Optimización con IA
        </h1>
        <p className="text-muted-foreground">
          Utilice IA para analizar datos históricos y obtener recomendaciones para optimizar su cronograma de turnos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generar Recomendación de Cronograma</CardTitle>
          <CardDescription>
            La IA analizará todos los turnos pasados y la demanda predicha para sugerir un cronograma óptimo de asignación de recursos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleOptimization} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Optimizar Cronograma
          </Button>
        </CardContent>
      </Card>
      {isPending && (
         <div className="flex justify-center items-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Analizando datos y generando sugerencias...</p>
         </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error de Optimización</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {result && (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Explicación de la IA</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-wrap">{result.explanation}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Cronograma Sugerido</CardTitle>
                </CardHeader>
                <CardContent>
                    {parsedSchedule ? (
                       <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                           {JSON.stringify(parsedSchedule, null, 2)}
                       </pre>
                    ) : (
                        <p>No se pudo mostrar el cronograma sugerido.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
