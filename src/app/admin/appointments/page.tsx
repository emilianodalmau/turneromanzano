import { AppointmentDataTable } from "./data-table";

export default async function AppointmentsPage() {
  // Data fetching is now handled client-side by the data-table component
  // using a real-time listener from Firestore.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">
          Gestión de Turnos
        </h1>
        <p className="text-muted-foreground">
          Vea, cree, edite y elimine los turnos de los visitantes en tiempo real.
        </p>
      </div>
      <AppointmentDataTable />
    </div>
  );
}
