// Utility functions for valve management
import { Valve } from '../types/valve';

const API_BASE_URL = '/api';

export class ValveService {
  static async fetchValves(): Promise<Valve[]> {
    try {
      // For now, return mock data since backend doesn't have valve endpoints yet
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
        }
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockValves;
    } catch (error) {
      console.error('Error fetching valves:', error);
      throw new Error('Failed to fetch valves');
    }
  }

  static async createValve(valve: Omit<Valve, 'id'>): Promise<Valve> {
    try {
      // TODO: Implement actual API call when backend supports it
      const response = await fetch(`${API_BASE_URL}/register-valve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(valve),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create valve');
      }
      
      // For now, return the valve with a generated ID
      return {
        ...valve,
        id: Date.now().toString(),
      };
    } catch (error) {
      console.error('Error creating valve:', error);
      throw new Error('Failed to create valve');
    }
  }

  static async updateValve(valve: Valve): Promise<Valve> {
    try {
      // TODO: Implement actual API call when backend supports it
      console.log('Updating valve:', valve);
      return valve;
    } catch (error) {
      console.error('Error updating valve:', error);
      throw new Error('Failed to update valve');
    }
  }

  static async deleteValve(valveId: string): Promise<void> {
    try {
      // TODO: Implement actual API call when backend supports it
      console.log('Deleting valve:', valveId);
    } catch (error) {
      console.error('Error deleting valve:', error);
      throw new Error('Failed to delete valve');
    }
  }

  static async getValveHistory(valveId: string): Promise<any[]> {
    try {
      // TODO: Implement actual API call when backend supports it
      console.log('Getting valve history for:', valveId);
      return [];
    } catch (error) {
      console.error('Error fetching valve history:', error);
      throw new Error('Failed to fetch valve history');
    }
  }

  static async scheduleMaintenance(valveId: string, maintenanceDate: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valveId, maintenanceDate }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule maintenance');
      }
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      throw new Error('Failed to schedule maintenance');
    }
  }
}