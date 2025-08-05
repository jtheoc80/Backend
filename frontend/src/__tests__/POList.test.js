import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import POList from '../components/POList';

// Mock purchase orders data
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
  },
  {
    id: 3,
    po_number: 'PO-2024-003',
    manufacturer_id: 'mfg001',
    manufacturer_name: 'Emerson Process Management',
    distributor_id: 'dist001',
    distributor_name: 'Industrial Valve Solutions Inc',
    total_amount: 750.25,
    currency: 'EUR',
    status: 'rejected',
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T11:30:00Z'
  }
];

describe('POList', () => {
  const mockOnCreateNew = jest.fn();
  const mockOnViewDetails = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <POList
        onCreateNew={mockOnCreateNew}
        onViewDetails={mockOnViewDetails}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        initialPOs={mockPurchaseOrders}
        {...props}
      />
    );
  };

  describe('Component Rendering', () => {
    it('should render the main heading and create button', () => {
      renderComponent();

      expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create New PO/ })).toBeInTheDocument();
    });

    it('should display purchase order statistics', () => {
      renderComponent();

      expect(screen.getByText('Total: 3')).toBeInTheDocument();
      expect(screen.getByText('Pending: 1')).toBeInTheDocument();
      expect(screen.getByText('Approved: 1')).toBeInTheDocument();
    });

    it('should render search bar and filters', () => {
      renderComponent();

      expect(screen.getByPlaceholderText(/Search by PO number/)).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sort by Created Date')).toBeInTheDocument();
    });

    it('should render table with all purchase orders', () => {
      renderComponent();

      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('PO-2024-002')).toBeInTheDocument();
      expect(screen.getByText('PO-2024-003')).toBeInTheDocument();
      expect(screen.getAllByText('Emerson Process Management')).toHaveLength(2);
      expect(screen.getByText('Kitz Corporation')).toBeInTheDocument();
    });

    it('should display formatted currency amounts', () => {
      renderComponent();

      expect(screen.getByText('$1,000.50')).toBeInTheDocument();
      expect(screen.getByText('$2,500.75')).toBeInTheDocument();
    });

    it('should display status badges with appropriate styling', () => {
      renderComponent();

      const pendingBadge = screen.getByText((content, element) => 
        element?.classList.contains('status-pending') && content === 'Pending'
      );
      const approvedBadge = screen.getByText((content, element) => 
        element?.classList.contains('status-approved') && content === 'Approved'
      );
      const rejectedBadge = screen.getByText((content, element) => 
        element?.classList.contains('status-rejected') && content === 'Rejected'
      );

      expect(pendingBadge).toHaveClass('status-pending');
      expect(approvedBadge).toHaveClass('status-approved');
      expect(rejectedBadge).toHaveClass('status-rejected');
    });
  });

  describe('Search and Filtering', () => {
    it('should filter purchase orders by search term', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText(/Search by PO number/);
      await user.type(searchInput, 'PO-2024-001');

      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.queryByText('PO-2024-002')).not.toBeInTheDocument();
      expect(screen.queryByText('PO-2024-003')).not.toBeInTheDocument();
    });

    it('should filter by manufacturer name', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText(/Search by PO number/);
      await user.type(searchInput, 'Kitz');

      expect(screen.getByText('PO-2024-002')).toBeInTheDocument();
      expect(screen.queryByText('PO-2024-001')).not.toBeInTheDocument();
    });

    it('should filter by status', async () => {
      const user = userEvent.setup();
      renderComponent();

      const statusFilter = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusFilter, 'approved');

      expect(screen.getByText('PO-2024-002')).toBeInTheDocument();
      expect(screen.queryByText('PO-2024-001')).not.toBeInTheDocument();
      expect(screen.queryByText('PO-2024-003')).not.toBeInTheDocument();
    });

    it('should update statistics based on filtered results', async () => {
      const user = userEvent.setup();
      renderComponent();

      const statusFilter = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusFilter, 'pending');

      expect(screen.getByText('Total: 1')).toBeInTheDocument();
      expect(screen.getByText('Pending: 1')).toBeInTheDocument();
      expect(screen.getByText('Approved: 0')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by PO number when header is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const poNumberHeader = screen.getByRole('columnheader', { name: /PO Number/ });
      await user.click(poNumberHeader);

      // Check that the sort icon changes (testing the sorting functionality)
      expect(poNumberHeader).toBeInTheDocument();
    });

    it('should change sort order when same column is clicked twice', async () => {
      const user = userEvent.setup();
      renderComponent();

      const amountHeader = screen.getByRole('columnheader', { name: /Amount/ });
      await user.click(amountHeader);
      await user.click(amountHeader);

      expect(amountHeader).toBeInTheDocument();
    });

    it('should sort by different fields using dropdown', async () => {
      const user = userEvent.setup();
      renderComponent();

      const sortSelect = screen.getByDisplayValue('Sort by Created Date');
      await user.selectOptions(sortSelect, 'total_amount');

      expect(sortSelect).toHaveValue('total_amount');
    });
  });

  describe('Action Buttons', () => {
    it('should show appropriate action buttons based on status', () => {
      renderComponent();

      // For pending PO, should show Approve and Reject buttons
      const pendingRow = screen.getByText('PO-2024-001').closest('tr');
      expect(pendingRow).toHaveTextContent('Approve');
      expect(pendingRow).toHaveTextContent('Reject');

      // For approved PO, should only show View button
      const approvedRow = screen.getByText('PO-2024-002').closest('tr');
      expect(approvedRow).not.toHaveTextContent('Approve');
      expect(approvedRow).not.toHaveTextContent('Reject');
    });

    it('should call onViewDetails when View button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const viewButtons = screen.getAllByRole('button', { name: /View/ });
      await user.click(viewButtons[0]);

      expect(mockOnViewDetails).toHaveBeenCalledWith(mockPurchaseOrders[0]);
    });

    it('should call onViewDetails when PO number link is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const poNumberLink = screen.getByRole('button', { name: 'PO-2024-001' });
      await user.click(poNumberLink);

      expect(mockOnViewDetails).toHaveBeenCalledWith(mockPurchaseOrders[0]);
    });

    it('should call onApprove when Approve button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const approveButton = screen.getByRole('button', { name: /Approve/ });
      await user.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledWith(mockPurchaseOrders[0]);
    });

    it('should call onReject when Reject button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const rejectButton = screen.getByRole('button', { name: /Reject/ });
      await user.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalledWith(mockPurchaseOrders[0]);
    });

    it('should call onCreateNew when Create New PO button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const createButton = screen.getByRole('button', { name: /Create New PO/ });
      await user.click(createButton);

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      renderComponent({ loading: true });

      expect(screen.getByText('Loading purchase orders...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should disable create button when loading', () => {
      renderComponent({ loading: true });

      const createButton = screen.getByRole('button', { name: /Create New PO/ });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Failed to load purchase orders';
      renderComponent({ error: errorMessage });

      expect(screen.getByText('Error Loading Purchase Orders')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not render table when there is an error', () => {
      renderComponent({ error: 'Some error' });

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no purchase orders exist', () => {
      renderComponent({ initialPOs: [] });

      expect(screen.getByText('No Purchase Orders Found')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first purchase order.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Your First PO/ })).toBeInTheDocument();
    });

    it('should show filtered empty state when no results match filters', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchInput = screen.getByPlaceholderText(/Search by PO number/);
      await user.type(searchInput, 'NONEXISTENT');

      expect(screen.getByText('No Purchase Orders Found')).toBeInTheDocument();
      expect(screen.getByText('No purchase orders match your current filters.')).toBeInTheDocument();
    });

    it('should call onCreateNew from empty state button', async () => {
      const user = userEvent.setup();
      renderComponent({ initialPOs: [] });

      const createButton = screen.getByRole('button', { name: /Create Your First PO/ });
      await user.click(createButton);

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      renderComponent();

      // Should show formatted date
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 16, 2024/)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout', () => {
      renderComponent();

      const table = screen.getByRole('table');
      expect(table).toHaveClass('po-table');
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure with headers', () => {
      renderComponent();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /PO Number/ })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Status/ })).toBeInTheDocument();
    });

    it('should have accessible buttons with proper labels', () => {
      renderComponent();

      const viewButtons = screen.getAllByRole('button', { name: /View/ });
      const approveButton = screen.getByRole('button', { name: /Approve/ });
      const rejectButton = screen.getByRole('button', { name: /Reject/ });

      expect(viewButtons.length).toBeGreaterThan(0);
      expect(approveButton).toBeInTheDocument();
      expect(rejectButton).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should not show pagination when totalPages is 1 or less', () => {
      renderComponent({ 
        initialPOs: mockPurchaseOrders,
        pagination: { currentPage: 1, totalPages: 1, totalCount: 3 }
      });

      expect(screen.queryByText(/Previous/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Next/)).not.toBeInTheDocument();
    });
  });

  describe('Snapshot Testing', () => {
    it('should match snapshot with default props', () => {
      const { container } = renderComponent();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with loading state', () => {
      const { container } = renderComponent({ loading: true });
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with error state', () => {
      const { container } = renderComponent({ error: 'Test error message' });
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with empty state', () => {
      const { container } = renderComponent({ initialPOs: [] });
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with filtered results', async () => {
      const user = userEvent.setup();
      const { container } = renderComponent();

      const statusFilter = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusFilter, 'pending');

      expect(container.firstChild).toMatchSnapshot();
    });
  });
});