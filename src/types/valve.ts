// Types for the valve chain application
export interface Valve {
  id: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  size: string;
  pressure: number;
  temperature: number;
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  location: string;
  installDate: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  blockchainAddress?: string;
}

export interface ValveTableProps {
  valves: Valve[];
  onValveSelect?: (valve: Valve) => void;
  onValveEdit?: (valve: Valve) => void;
  onValveDelete?: (valveId: string) => void;
  loading?: boolean;
  error?: string;
}

export interface TableColumn {
  key: keyof Valve;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
}

export interface SortConfig {
  key: keyof Valve;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: string | number | boolean;
}