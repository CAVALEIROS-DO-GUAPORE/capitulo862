export interface MaintenanceSettings {
  maintenanceEnabled: boolean;
  description: string | null;
  returnDate: string | null;
  returnTime: string | null;
  updatedAt: string | null;
}

type SiteSettingsRow = {
  maintenance_enabled?: boolean;
  maintenance_description?: string | null;
  maintenance_return_date?: string | null;
  maintenance_return_time?: string | null;
  updated_at?: string | null;
};

export function mapMaintenanceSettings(data: SiteSettingsRow | null | undefined): MaintenanceSettings {
  const returnTime = data?.maintenance_return_time
    ? String(data.maintenance_return_time).slice(0, 5)
    : null;

  return {
    maintenanceEnabled: data?.maintenance_enabled === true,
    description: data?.maintenance_description ?? null,
    returnDate: data?.maintenance_return_date ?? null,
    returnTime,
    updatedAt: data?.updated_at ?? null,
  };
}

export function formatReturnDateTime(date: string | null, time: string | null): string | null {
  if (!date) return null;

  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;

  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!time) return formattedDate;

  const [hours, minutes] = time.split(':');
  return `${formattedDate} às ${hours}:${minutes}`;
}
