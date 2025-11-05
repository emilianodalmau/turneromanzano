import { getAppointments } from "@/lib/actions";
import { AppointmentDataTable } from "./data-table";

export default async function AppointmentsPage() {
  const appointments = await getAppointments();

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
      <AppointmentDataTable initialData={appointments} />
    </div>
  );
}
