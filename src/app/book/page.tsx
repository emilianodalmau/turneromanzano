'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { bookingFormSchema, BookingFormData } from '@/lib/types';
import { bookAppointmentAction, getAvailableSlots } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type TimeSlotsState = {
  loading: boolean;
  daySchedule: { enabled: boolean; slots: string[] } | null;
  availableSlots: string[];
  error: string | null;
};

export default function BookPage() {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | undefined>();
  const [timeSlots, setTimeSlots] = useState<TimeSlotsState>({ loading: false, daySchedule: null, availableSlots: [], error: null });
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { name: '', lastName: '', dni: '', phone: '', email: '' },
  });

  useEffect(() => {
    if (date) {
      setTimeSlots({ loading: true, daySchedule: null, availableSlots: [], error: null });
      const dateString = format(date, 'yyyy-MM-dd');
      getAvailableSlots(dateString)
        .then(({ daySchedule, availableSlots }) => {
          setTimeSlots({ loading: false, daySchedule, availableSlots, error: null });
        })
        .catch(() => {
          setTimeSlots({ loading: false, daySchedule: null, availableSlots: [], error: 'No se pudieron cargar los horarios.' });
        });
    }
  }, [date]);

  const onSubmit = (data: BookingFormData) => {
    if (!date || !time) return;

    startTransition(async () => {
      const result = await bookAppointmentAction(data, format(date, 'yyyy-MM-dd'), time);
      if (result.success) {
        router.push(`/confirmation?date=${format(date, 'yyyy-MM-dd')}&time=${time}`);
      } else {
        toast({
          title: 'Error en la Reserva',
          description: result.error || 'No se pudo crear el turno. Por favor, intente de nuevo.',
          variant: 'destructive',
        });
      }
    });
  };

  const today = startOfDay(new Date());

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Reservar un Turno</CardTitle>
          <CardDescription>Siga los pasos para completar su reserva.</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4 text-primary">1. Seleccione una fecha</h3>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            locale={es}
                            disabled={(d) => d < today}
                        />
                    </PopoverContent>
                </Popover>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-primary">2. Seleccione un horario</h3>
                {timeSlots.loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Cargando horarios...</div>}
                {timeSlots.error && <p className="text-destructive">{timeSlots.error}</p>}
                {date && !timeSlots.loading && !timeSlots.error && (
                    !timeSlots.daySchedule?.enabled ? <p>No hay turnos disponibles este día.</p> :
                    timeSlots.availableSlots.length === 0 ? <p>No quedan turnos para esta fecha.</p> :
                    <RadioGroup value={time} onValueChange={setTime} className="grid grid-cols-2 gap-2">
                        {timeSlots.availableSlots.map((slot) => (
                        <FormItem key={slot}>
                            <FormControl>
                            <RadioGroupItem value={slot} id={slot} className="sr-only" />
                            </FormControl>
                            <Label htmlFor={slot} className="flex items-center justify-center p-3 rounded-md border-2 border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                            {slot}
                            </Label>
                        </FormItem>
                        ))}
                    </RadioGroup>
                )}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div className="mb-6 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                Turno seleccionado para el <span className="font-semibold text-primary">{date && format(date, 'PPP', { locale: es })}</span> a las <span className="font-semibold text-primary">{time}</span>.
              </div>
              <h3 className="font-semibold mb-4 text-primary">3. Complete sus datos</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl><Input placeholder="Su nombre" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl><Input placeholder="Su apellido" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="dni" render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl><Input placeholder="Sin puntos" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl><Input placeholder="Ej: 1122334455" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input placeholder="sunombre@email.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </form>
              </Form>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
            {step > 1 && <Button variant="outline" onClick={() => { setStep(step - 1); }}>Atrás</Button>}
            {step === 1 && <div></div>}
            {step === 1 && <Button onClick={() => setStep(2)} disabled={!date || !time}>Siguiente</Button>}
            {step === 2 && <Button type="submit" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Reserva
            </Button>}
        </CardFooter>
      </Card>
    </div>
  );
}
