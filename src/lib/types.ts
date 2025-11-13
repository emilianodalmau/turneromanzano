'use client';

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const dayNames: Record<DayKey, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// --- ESTRUCTURA DE DATOS PARA DOCUMENTACIÓN DE LICENCIAS ---

export interface DocumentRequirement {
  id: string; // e.g., 'dni_frente_dorso'
  label: string; // 'DNI (Frente y Dorso)'
  optional: boolean;
  isLink?: boolean;
  href?: string;
  description?: string;
}

export interface ProcedureType {
  id: string; // e.g., 'original'
  name: string; // 'Original (Primera Vez)'
  description?: string;
  docs: (DocumentRequirement | { category: string; docs: DocumentRequirement[] })[];
}


export const procedureTypes: ProcedureType[] = [
  {
    id: 'original',
    name: 'Original (Primera Vez)',
    docs: [
        { id: 'dni', label: 'DNI (Frente y Dorso)', optional: false },
        { id: 'cuil', label: 'CUIL', optional: false },
        { id: 'cursos', label: 'Certificados de cursos (Nacional, Género, Estrellas Amarillas)', optional: false, isLink: true, href: 'https://www.argentina.gob.ar/servicio/mi-primera-licencia', description: 'Realizá los cursos obligatorios y obtené los certificados.' },
        { id: 'certificado_medico_opcional', label: 'Certificado médico (si padece diabetes o está bajo tratamiento)', optional: true },
        { id: 'tarjeta_verde', label: 'Tarjeta verde del vehículo de práctica', optional: false },
        { id: 'poliza_seguro', label: 'Póliza de seguro vigente del vehículo de práctica', optional: false },
        { id: 'licencia_acompanante', label: 'Licencia de conducir de la persona que lo acompaña', optional: false },
    ],
  },
  {
    id: 'renovacion_ab',
    name: 'Renovación (Clase A y B)',
    docs: [
        { id: 'dni', label: 'DNI (Frente y Dorso)', optional: false },
        { id: 'licencia_actual', label: 'Licencia de conducir actual (Frente y Dorso) o denuncia de extravío', optional: false },
    ],
  },
  {
    id: 'renovacion_con_ampliacion',
    name: 'Renovación con Ampliación (A, B, C, D, E, G)',
    docs: [
        { id: 'dni', label: 'DNI (Frente y Dorso)', optional: false },
        { id: 'licencia_actual', label: 'Licencia de conducir actual (Frente y Dorso) o denuncia de extravío', optional: false },
        { id: 'curso_nacional', label: 'Curso de Seguridad Vial (Nacional)', optional: false, isLink: true, href: 'https://www.argentina.gob.ar/servicio/curso-nacional-de-educacion-vial-digital' },
        { id: 'certificado_reincidencia', label: 'Certificado de Reincidencia (para clases D)', optional: true },
        {
            category: 'Examen Psicofísico (para Clases Profesionales)',
            docs: [
                { id: 'analisis_sangre', label: 'Análisis de sangre (Hemograma, Glucemia, Uremia)', optional: true },
                { id: 'informe_vision', label: 'Informe de examen de visión', optional: true },
                { id: 'informe_psicologico', label: 'Informe de examen psicológico', optional: true },
                { id: 'informe_audiometria', label: 'Informe de audiometría', optional: true },
                { id: 'electroencefalograma', label: 'Electroencefalograma con informe', optional: true },
                { id: 'examen_clinico_laboral', label: 'Examen clínico por médico laboral', optional: true },
                { id: 'apto_medico_tratante_opcional', label: 'Certificado de aptitud por médico tratante (Opcional)', optional: true },
            ]
        }
    ],
  },
    {
    id: 'renovacion_profesional',
    name: 'Renovación Profesional (C, D)',
    docs: [
        { id: 'dni', label: 'DNI (Frente y Dorso)', optional: false },
        { id: 'licencia_actual', label: 'Licencia de conducir actual (Frente y Dorso) o denuncia de extravío', optional: false },
        { id: 'certificado_reincidencia', label: 'Certificado de Reincidencia (para clases D)', optional: false, isLink: true, href: 'https://www.argentina.gob.ar/justicia/reincidencia' },
        {
            category: 'Examen Psicofísico',
            docs: [
                { id: 'analisis_sangre', label: 'Análisis de sangre (Hemograma, Glucemia, Uremia)', optional: false },
                { id: 'informe_vision', label: 'Informe de examen de visión', optional: false },
                { id: 'informe_psicologico', label: 'Informe de examen psicológico', optional: false },
                { id: 'informe_audiometria', label: 'Informe de audiometría', optional: false },
                { id: 'electroencefalograma', label: 'Electroencefalograma con informe', optional: false },
                { id: 'examen_clinico_laboral', label: 'Examen clínico por médico laboral', optional: false },
                { id: 'apto_medico_tratante_opcional', label: 'Certificado de aptitud por médico tratante (Opcional)', optional: true },
            ]
        }
    ],
  },
  {
    id: 'renovacion_mayores_66',
    name: 'Renovación Mayores de 66 años',
    docs: [
        { id: 'dni', label: 'DNI (Frente y Dorso)', optional: false },
        { id: 'licencia_actual', label: 'Licencia de conducir actual (Frente y Dorso) o denuncia de extravío', optional: false },
        { id: 'analisis_sangre_apto', label: 'Análisis de sangre con certificado de apto clínico', optional: false },
        { id: 'electrocardiograma_apto', label: 'Electrocardiograma con certificado de apto cardiológico', optional: false },
        { id: 'apto_medico_tratante_opcional', label: 'Certificado de aptitud por médico tratante (Opcional)', optional: true },
    ],
  },
  {
    id: 'inhabilitados_alcoholemia',
    name: 'Inhabilitados por Alcoholemia',
    docs: [
        { id: 'dni', label: 'DNI (Frente y Dorso)', optional: false },
        { id: 'nota_inhabilitacion', label: 'Nota de Inhabilitación', optional: false },
        { id: 'cursos_rehabilitacion', label: 'Certificados de cursos (Nacional, Género, Estrellas Amarillas)', optional: false, isLink: true, href: 'https://www.argentina.gob.ar/servicio/mi-primera-licencia', description: 'Deberás realizar nuevamente los cursos obligatorios.' },
        { id: 'licencia_acompanante_rehab', label: 'Licencia de conducir de la persona que lo acompaña', optional: false },
    ],
  },
];


// --- FIN ESTRUCTURA DE DATOS PARA LICENCIAS ---


export interface TimeSlot {
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface DayConfiguration {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface ScheduleConfiguration {
  days: {
    [key in DayKey]: DayConfiguration;
  };
}

// Omit 'id' from the base Appointment to prevent it from being overwritten during updates.
export interface Appointment extends Omit<MutableAppointment, 'id'> {
  readonly id: string;
}

// This represents the fields that can be created or updated.
export interface MutableAppointment {
  id: string;
  userId: string;
  date: string; // Stored as 'yyyy-MM-dd'
  startTime: string;
  endTime: string;
  responsibleName: string;
  schoolName: string;
  visitorCount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paid?: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  role?: 'manzano_admin' | 'license_admin' | 'super_admin';
}


export interface LicenseAppointment extends Omit<MutableLicenseAppointment, 'id'> {
  readonly id: string;
}

export interface MutableLicenseAppointment {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  procedureType: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  documents?: Record<string, string>; // URLs to uploaded files
}

export interface LicenseScheduleConfiguration {
    days: {
        [key in DayKey]: DayConfiguration;
    };
}
