import React, { useState, useEffect } from 'react';
import Valvetable from './components/Valvetable';
import { Valve } from './types/valve';

// Mock data for demonstration
const mockValves: Valve[] = [
  {
    id: '1',
    serialNumber: 'VLV-001-2023',
    manufacturer: 'Emerson',
    model: 'Fisher DVC6200',
    size: '2"',
    pressure: 150,
    temperature: 75,
    status: 'active',
    location: 'Plant A - Unit 1',
    installDate: '2023-01-15',
    lastMaintenance: '2023-09-15',
    nextMaintenance: '2024-03-15',
    blockchainAddress: '0x742d35Cc6634C0532925a3b8D1f9D82e8a2e2B5a'
  },
  {
    id: '2',
    serialNumber: 'VLV-002-2023',
    manufacturer: 'Flowserve',
    model: 'LogiX 3200MD',
    size: '4"',
    pressure: 300,
    temperature: 120,
    status: 'maintenance',
    location: 'Plant B - Unit 2',
    installDate: '2023-02-20',
    lastMaintenance: '2023-10-01',
    nextMaintenance: '2024-04-01',
    blockchainAddress: '0x853f43d8a49eebc21bc54b2e6aa7b7f7c9e2f3cd'
  },
  {
    id: '3',
    serialNumber: 'VLV-003-2023',
    manufacturer: 'Cameron',
    model: 'GROVE B5X',
    size: '6"',
    pressure: 600,
    temperature: 180,
    status: 'error',
    location: 'Plant C - Unit 3',
    installDate: '2023-03-10',
    lastMaintenance: '2023-08-10',
    nextMaintenance: '2024-02-10',
    blockchainAddress: '0x964ae3e8b6f41e5f5d4a1b9c7d8e9f0a1b2c3d4e'
  },
  {
    id: '4',
    serialNumber: 'VLV-004-2023',
    manufacturer: 'Metso',
    model: 'Neles ND9000',
    size: '3"',
    pressure: 250,
    temperature: 95,
    status: 'inactive',
    location: 'Plant A - Unit 4',
    installDate: '2023-04-05',
    lastMaintenance: '2023-11-05',
    nextMaintenance: '2024-05-05',
    blockchainAddress: '0xa75f64c7e8b39f6e5c2b1a4d7e9f0c3b6e8f1a2d'
  }
];

const App: React.FC = () => {
  const [valves, setValves] = useState<Valve[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const loadValves = async () => {
      try {
        setLoading(true);
        // In a real app, this would be an API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setValves(mockValves);
        setError(null);
      } catch (err) {
        setError('Failed to load valves');
      } finally {
        setLoading(false);
      }
    };

    loadValves();
  }, []);

  const handleValveSelect = (valve: Valve) => {
    console.log('Selected valve:', valve);
    // Handle valve selection
  };

  const handleValveEdit = (valve: Valve) => {
    console.log('Edit valve:', valve);
    // Handle valve editing
  };

  const handleValveDelete = (valveId: string) => {
    setConfirmDeleteId(valveId);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      setValves(prev => prev.filter(v => v.id !== confirmDeleteId));
      console.log('Deleted valve:', confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };
  return (
    <div className="app">
      <header className="app-header">
        <h1>ValveChain Management System</h1>
        <p>Blockchain-powered valve tracking and management</p>
      </header>
      
      <main className="app-main">
        <Valvetable
          valves={valves}
          onValveSelect={handleValveSelect}
          onValveEdit={handleValveEdit}
          onValveDelete={handleValveDelete}
          loading={loading}
          error={error || undefined}
        />
      </main>
    </div>
  );
};

export default App;