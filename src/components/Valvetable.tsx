import React, { useState, useMemo, useCallback } from 'react';
import { Valve, ValveTableProps, SortConfig, FilterConfig, TableColumn } from '../types/valve';
import './Valvetable.css';

const Valvetable: React.FC<ValveTableProps> = ({
  valves,
  onValveSelect,
  onValveEdit,
  onValveDelete,
  loading = false,
  error
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'asc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [searchTerm, setSearchTerm] = useState('');

  const columns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'serialNumber', label: 'Serial Number', sortable: true, filterable: true },
    { key: 'manufacturer', label: 'Manufacturer', sortable: true, filterable: true },
    { key: 'model', label: 'Model', sortable: true, filterable: true },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'pressure', label: 'Pressure (PSI)', sortable: true },
    { key: 'temperature', label: 'Temperature (°F)', sortable: true },
    { key: 'status', label: 'Status', sortable: true, filterable: true },
    { key: 'location', label: 'Location', sortable: true, filterable: true },
    { key: 'installDate', label: 'Install Date', sortable: true }
  ];

  const handleSort = useCallback((key: keyof Valve) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleFilter = useCallback((key: string, value: string) => {
    setFilterConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const filteredAndSortedValves = useMemo(() => {
    let filtered = valves.filter(valve => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = ['serialNumber', 'manufacturer', 'model', 'location'];
        const matchesSearch = searchableFields.some(field => 
          valve[field as keyof Valve]?.toString().toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Apply column filters
      return Object.entries(filterConfig).every(([key, value]) => {
        if (!value) return true;
        const valveValue = valve[key as keyof Valve];
        return valveValue?.toString().toLowerCase().includes(value.toString().toLowerCase());
      });
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [valves, sortConfig, filterConfig, searchTerm]);

  const getStatusBadge = (status: Valve['status']) => {
    const statusClasses = {
      active: 'status-badge status-active',
      inactive: 'status-badge status-inactive',
      maintenance: 'status-badge status-maintenance',
      error: 'status-badge status-error'
    };
    return <span className={statusClasses[status]}>{status.toUpperCase()}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="valve-table-loading">Loading valves...</div>;
  }

  if (error) {
    return <div className="valve-table-error">Error: {error}</div>;
  }

  return (
    <div className="valve-table-container">
      <div className="valve-table-header">
        <h2>Valve Management</h2>
        <div className="valve-table-controls">
          <input
            type="text"
            placeholder="Search valves..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="valve-table-wrapper">
        <table className="valve-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column.key} className="valve-table-header-cell">
                  <div className="header-cell-content">
                    <span
                      onClick={() => column.sortable && handleSort(column.key)}
                      className={column.sortable ? 'sortable' : ''}
                    >
                      {column.label}
                      {column.sortable && sortConfig.key === column.key && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </span>
                    {column.filterable && (
                      <input
                        type="text"
                        placeholder="Filter..."
                        onChange={(e) => handleFilter(column.key, e.target.value)}
                        className="column-filter"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </th>
              ))}
              <th className="valve-table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedValves.map(valve => (
              <tr 
                key={valve.id} 
                className="valve-table-row"
                onClick={() => onValveSelect?.(valve)}
              >
                <td>{valve.id}</td>
                <td>{valve.serialNumber}</td>
                <td>{valve.manufacturer}</td>
                <td>{valve.model}</td>
                <td>{valve.size}</td>
                <td>{valve.pressure}</td>
                <td>{valve.temperature}</td>
                <td>{getStatusBadge(valve.status)}</td>
                <td>{valve.location}</td>
                <td>{formatDate(valve.installDate)}</td>
                <td className="action-buttons">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onValveEdit?.(valve);
                    }}
                    className="btn btn-edit"
                    title="Edit valve"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onValveDelete?.(valve.id);
                    }}
                    className="btn btn-delete"
                    title="Delete valve"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedValves.length === 0 && (
          <div className="no-results">
            No valves found matching your criteria.
          </div>
        )}
      </div>
      
      <div className="valve-table-footer">
        <span className="results-count">
          Showing {filteredAndSortedValves.length} of {valves.length} valves
        </span>
      </div>
    </div>
  );
};

export default Valvetable;