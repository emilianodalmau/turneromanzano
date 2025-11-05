import { getAppointments } from "@/lib/actions";
import { AppointmentDataTable } from "./data-table";

export default async function AppointmentsPage() {
  // Initial data is fetched here, but the data-table will re-fetch on client-side
  const initialAppointments = await getAppointments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">
          Gestión de Turnos
        </h1>
        <p className="text-muted-foreground">
          Vea, cree, edite y elimine los turnos de los visitantes.
        </p>
      </div>
      <AppointmentDataTable initialData={initialAppointments} />
    </div>
  );
}
