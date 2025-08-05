import React, { useState } from 'react';
import CreatePOForm from './components/CreatePOForm';
import POList from './components/POList';
import './App.css';

// Mock data for demonstration
const mockManufacturers = [
  { id: 'mfg001', name: 'Emerson Process Management' },
  { id: 'mfg002', name: 'Kitz Corporation' }
];

const mockDistributors = [
  { id: 'dist001', name: 'Industrial Valve Solutions Inc' },
  { id: 'dist002', name: 'Global Valve Distribution' }
];

const mockPurchaseOrders = [
  {
    id: 1,
    po_number: 'PO-2024-001',
    manufacturer_id: 'mfg001',
    manufacturer_name: 'Emerson Process Management',
    distributor_id: 'dist001',
    distributor_name: 'Industrial Valve Solutions Inc',
    total_amount: 1000.50,
    currency: 'USD',
    status: 'pending',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    po_number: 'PO-2024-002',
    manufacturer_id: 'mfg002',
    manufacturer_name: 'Kitz Corporation',
    distributor_id: 'dist002',
    distributor_name: 'Global Valve Distribution',
    total_amount: 2500.75,
    currency: 'USD',
    status: 'approved',
    created_at: '2024-01-16T14:45:00Z',
    updated_at: '2024-01-16T16:20:00Z'
  }
];

function App() {
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'create'
  const [purchaseOrders, setPurchaseOrders] = useState(mockPurchaseOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateNew = () => {
    setCurrentView('create');
  };

  const handleCancel = () => {
    setCurrentView('list');
  };

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPO = {
        id: Date.now(),
        ...formData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        manufacturer_name: mockManufacturers.find(m => m.id === formData.manufacturer_id)?.name,
        distributor_name: mockDistributors.find(d => d.id === formData.distributor_id)?.name
      };

      setPurchaseOrders(prev => [newPO, ...prev]);
      setCurrentView('list');
      setError(null);
    } catch (error) {
      setError('Failed to create purchase order');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (po) => {
    alert(`Viewing details for ${po.po_number}`);
  };

  const handleApprove = async (po) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPurchaseOrders(prev => 
        prev.map(p => 
          p.id === po.id 
            ? { ...p, status: 'approved', updated_at: new Date().toISOString() }
            : p
        )
      );
    } catch (error) {
      setError('Failed to approve purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (po) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPurchaseOrders(prev => 
        prev.map(p => 
          p.id === po.id 
            ? { ...p, status: 'rejected', updated_at: new Date().toISOString() }
            : p
        )
      );
    } catch (error) {
      setError('Failed to reject purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>ValveChain Purchase Order Management</h1>
        <nav>
          <button 
            onClick={() => setCurrentView('list')}
            className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
          >
            Purchase Orders
          </button>
        </nav>
      </header>

      <main className="app-main">
        {error && (
          <div className="app-error">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {currentView === 'create' ? (
          <CreatePOForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            manufacturers={mockManufacturers}
            distributors={mockDistributors}
          />
        ) : (
          <POList
            onCreateNew={handleCreateNew}
            onViewDetails={handleViewDetails}
            onApprove={handleApprove}
            onReject={handleReject}
            initialPOs={purchaseOrders}
            loading={loading}
            error={error}
          />
        )}
      </main>
    </div>
  );
}

export default App;