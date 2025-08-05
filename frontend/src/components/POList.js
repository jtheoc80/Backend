import React, { useState, useEffect } from 'react';
import './POList.css';

const POList = ({ 
  onCreateNew, 
  onViewDetails, 
  onApprove, 
  onReject,
  initialPOs = [],
  loading = false,
  error = null 
}) => {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPOs);
  const [filters, setFilters] = useState({
    status: '',
    manufacturer_id: '',
    distributor_id: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setPurchaseOrders(initialPOs);
  }, [initialPOs]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleSort = (field) => {
    const newSortOrder = filters.sortBy === field && filters.sortOrder === 'DESC' ? 'ASC' : 'DESC';
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: newSortOrder
    }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-badge status-pending',
      approved: 'status-badge status-approved',
      rejected: 'status-badge status-rejected',
      cancelled: 'status-badge status-cancelled'
    };
    
    return (
      <span className={statusClasses[status] || 'status-badge'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchTerm || 
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.manufacturer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.distributor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filters.status || po.status === filters.status;
    const matchesManufacturer = !filters.manufacturer_id || po.manufacturer_id === filters.manufacturer_id;
    const matchesDistributor = !filters.distributor_id || po.distributor_id === filters.distributor_id;
    
    return matchesSearch && matchesStatus && matchesManufacturer && matchesDistributor;
  });

  const sortedPOs = [...filteredPOs].sort((a, b) => {
    const field = filters.sortBy;
    const order = filters.sortOrder === 'ASC' ? 1 : -1;
    
    if (field === 'total_amount') {
      return (parseFloat(a[field]) - parseFloat(b[field])) * order;
    }
    
    if (field === 'created_at' || field === 'updated_at') {
      return (new Date(a[field]) - new Date(b[field])) * order;
    }
    
    return (a[field]?.toString().localeCompare(b[field]?.toString()) || 0) * order;
  });

  const getSortIcon = (field) => {
    if (filters.sortBy !== field) return '↕️';
    return filters.sortOrder === 'ASC' ? '↑' : '↓';
  };

  if (error) {
    return (
      <div className="po-list-error">
        <div className="error-message">
          <h3>Error Loading Purchase Orders</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="po-list">
      <div className="list-header">
        <div className="header-left">
          <h2>Purchase Orders</h2>
          <div className="po-stats">
            <span className="stat">
              Total: {filteredPOs.length}
            </span>
            <span className="stat">
              Pending: {filteredPOs.filter(po => po.status === 'pending').length}
            </span>
            <span className="stat">
              Approved: {filteredPOs.filter(po => po.status === 'approved').length}
            </span>
          </div>
        </div>
        <button 
          onClick={onCreateNew}
          className="btn btn-primary"
          disabled={loading}
        >
          Create New PO
        </button>
      </div>

      <div className="list-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by PO number, manufacturer, or distributor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="created_at">Sort by Created Date</option>
            <option value="updated_at">Sort by Updated Date</option>
            <option value="po_number">Sort by PO Number</option>
            <option value="total_amount">Sort by Amount</option>
            <option value="status">Sort by Status</option>
          </select>

          <button
            onClick={() => handleSort(filters.sortBy)}
            className="sort-button"
            title={`Sort ${filters.sortOrder === 'ASC' ? 'Descending' : 'Ascending'}`}
          >
            {getSortIcon(filters.sortBy)}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" data-testid="loading-spinner"></div>
          <p>Loading purchase orders...</p>
        </div>
      ) : sortedPOs.length === 0 ? (
        <div className="empty-state">
          <h3>No Purchase Orders Found</h3>
          <p>
            {searchTerm || filters.status ? 
              'No purchase orders match your current filters.' : 
              'Get started by creating your first purchase order.'
            }
          </p>
          {!searchTerm && !filters.status && (
            <button onClick={onCreateNew} className="btn btn-primary">
              Create Your First PO
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="po-table-container">
            <table className="po-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('po_number')} className="sortable">
                    PO Number {getSortIcon('po_number')}
                  </th>
                  <th>Manufacturer</th>
                  <th>Distributor</th>
                  <th onClick={() => handleSort('total_amount')} className="sortable">
                    Amount {getSortIcon('total_amount')}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    Status {getSortIcon('status')}
                  </th>
                  <th onClick={() => handleSort('created_at')} className="sortable">
                    Created {getSortIcon('created_at')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPOs.map((po) => (
                  <tr key={po.id} className="po-row">
                    <td className="po-number">
                      <button
                        onClick={() => onViewDetails(po)}
                        className="link-button"
                      >
                        {po.po_number}
                      </button>
                    </td>
                    <td>{po.manufacturer_name || po.manufacturer_id}</td>
                    <td>{po.distributor_name || po.distributor_id}</td>
                    <td className="amount">
                      {formatCurrency(po.total_amount, po.currency)}
                    </td>
                    <td>
                      {getStatusBadge(po.status)}
                    </td>
                    <td className="date">
                      {formatDate(po.created_at)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => onViewDetails(po)}
                          className="btn btn-sm btn-secondary"
                          title="View Details"
                        >
                          View
                        </button>
                        {po.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onApprove(po)}
                              className="btn btn-sm btn-success"
                              title="Approve PO"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onReject(po)}
                              className="btn btn-sm btn-danger"
                              title="Reject PO"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="btn btn-sm btn-secondary"
              >
                Previous
              </button>
              
              <div className="page-info">
                Page {pagination.currentPage} of {pagination.totalPages}
                ({pagination.totalCount} total)
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn btn-sm btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default POList;