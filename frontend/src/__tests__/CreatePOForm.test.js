import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CreatePOForm from '../components/CreatePOForm';

// Mock manufacturers and distributors data
const mockManufacturers = [
  { id: 'mfg001', name: 'Emerson Process Management' },
  { id: 'mfg002', name: 'Kitz Corporation' }
];

const mockDistributors = [
  { id: 'dist001', name: 'Industrial Valve Solutions Inc' },
  { id: 'dist002', name: 'Global Valve Distribution' }
];

describe('CreatePOForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <CreatePOForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        manufacturers={mockManufacturers}
        distributors={mockDistributors}
        {...props}
      />
    );
  };

  describe('Component Rendering', () => {
    it('should render all form sections and fields', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: 'Create Purchase Order' })).toBeInTheDocument();
      expect(screen.getByLabelText(/PO Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Currency/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Manufacturer/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Distributor/)).toBeInTheDocument();
      expect(screen.getByText('Items')).toBeInTheDocument();
      expect(screen.getByText('Total Amount *')).toBeInTheDocument();
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Purchase Order/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    });

    it('should render manufacturers and distributors in dropdowns', () => {
      renderComponent();

      const manufacturerSelect = screen.getByLabelText(/Manufacturer/);
      const distributorSelect = screen.getByLabelText(/Distributor/);

      expect(manufacturerSelect).toHaveTextContent('Emerson Process Management');
      expect(manufacturerSelect).toHaveTextContent('Kitz Corporation');
      expect(distributorSelect).toHaveTextContent('Industrial Valve Solutions Inc');
      expect(distributorSelect).toHaveTextContent('Global Valve Distribution');
    });

    it('should render initial item row with all fields', () => {
      renderComponent();

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByLabelText(/Valve ID/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Quantity/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Unit Price/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('should display total amount as 0.00 initially', () => {
      renderComponent();

      expect(screen.getByText('0.00')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update input values when user types', async () => {
      const user = userEvent.setup();
      renderComponent();

      const poNumberInput = screen.getByLabelText(/PO Number/);
      await user.type(poNumberInput, 'PO-2024-001');

      expect(poNumberInput).toHaveValue('PO-2024-001');
    });

    it('should update dropdown selections', async () => {
      const user = userEvent.setup();
      renderComponent();

      const manufacturerSelect = screen.getByLabelText(/Manufacturer/);
      await user.selectOptions(manufacturerSelect, 'mfg001');

      expect(manufacturerSelect).toHaveValue('mfg001');
    });

    it('should calculate total amount when item details change', async () => {
      const user = userEvent.setup();
      renderComponent();

      const quantityInput = screen.getByLabelText(/Quantity/);
      const unitPriceInput = screen.getByLabelText(/Unit Price/);

      await user.clear(quantityInput);
      await user.type(quantityInput, '2');
      await user.clear(unitPriceInput);
      await user.type(unitPriceInput, '100.50');

      await waitFor(() => {
        expect(screen.getByText('201.00')).toBeInTheDocument();
      });
    });

    it('should add new item when Add Item button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const addItemButton = screen.getByRole('button', { name: /Add Item/ });
      await user.click(addItemButton);

      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getAllByLabelText(/Valve ID/)).toHaveLength(2);
    });

    it('should remove item when Remove button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Add a second item first
      await user.click(screen.getByRole('button', { name: /Add Item/ }));
      expect(screen.getByText('Item 2')).toBeInTheDocument();

      // Remove the second item
      const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
      await user.click(removeButtons[0]);

      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('should not show remove button when only one item exists', () => {
      renderComponent();

      expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      renderComponent();

      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('PO Number is required')).toBeInTheDocument();
        expect(screen.getByText('Manufacturer is required')).toBeInTheDocument();
        expect(screen.getByText('Distributor is required')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate item fields', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill required basic fields
      await user.type(screen.getByLabelText(/PO Number/), 'PO-2024-001');
      await user.selectOptions(screen.getByLabelText(/Manufacturer/), 'mfg001');
      await user.selectOptions(screen.getByLabelText(/Distributor/), 'dist001');

      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Valve ID is required')).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
        expect(screen.getByText('Unit price must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should validate total amount is greater than 0', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill all required fields but leave amounts as 0
      await user.type(screen.getByLabelText(/PO Number/), 'PO-2024-001');
      await user.selectOptions(screen.getByLabelText(/Manufacturer/), 'mfg001');
      await user.selectOptions(screen.getByLabelText(/Distributor/), 'dist001');
      await user.type(screen.getByLabelText(/Valve ID/), 'valve-001');
      await user.type(screen.getByLabelText(/Description/), 'Test valve');

      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Total amount must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user corrects input', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('PO Number is required')).toBeInTheDocument();
      });

      // Fix the error
      const poNumberInput = screen.getByLabelText(/PO Number/);
      await user.type(poNumberInput, 'PO-2024-001');

      await waitFor(() => {
        expect(screen.queryByText('PO Number is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const fillValidForm = async (user) => {
      await user.type(screen.getByLabelText(/PO Number/), 'PO-2024-001');
      await user.selectOptions(screen.getByLabelText(/Manufacturer/), 'mfg001');
      await user.selectOptions(screen.getByLabelText(/Distributor/), 'dist001');
      await user.type(screen.getByLabelText(/Valve ID/), 'valve-001');
      await user.clear(screen.getByLabelText(/Quantity/));
      await user.type(screen.getByLabelText(/Quantity/), '2');
      await user.type(screen.getByLabelText(/Unit Price/), '100.50');
      await user.type(screen.getByLabelText(/Description/), 'Ball Valve 1/2 inch');
      await user.type(screen.getByLabelText(/Notes/), 'Urgent order');
    };

    it('should submit form with correct data when all fields are valid', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue({});
      renderComponent();

      await fillValidForm(user);

      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          po_number: 'PO-2024-001',
          manufacturer_id: 'mfg001',
          distributor_id: 'dist001',
          total_amount: 201,
          currency: 'USD',
          items: [{
            valve_id: 'valve-001',
            quantity: 2,
            unit_price: 100.50,
            description: 'Ball Valve 1/2 inch'
          }],
          notes: 'Urgent order'
        });
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      mockOnSubmit.mockImplementation(() => new Promise(resolve => {
        resolveSubmit = resolve;
      }));
      renderComponent();

      await fillValidForm(user);

      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      resolveSubmit({});
    });

    it('should handle submission errors', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'));
      renderComponent();

      await fillValidForm(user);

      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create purchase order. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Component Callbacks', () => {
    it('should call onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props Handling', () => {
    it('should handle empty manufacturers and distributors arrays', () => {
      renderComponent({ manufacturers: [], distributors: [] });

      const manufacturerSelect = screen.getByLabelText(/Manufacturer/);
      const distributorSelect = screen.getByLabelText(/Distributor/);

      expect(manufacturerSelect).toHaveTextContent('Select a manufacturer');
      expect(distributorSelect).toHaveTextContent('Select a distributor');
    });

    it('should handle missing props gracefully', () => {
      render(
        <CreatePOForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('heading', { name: 'Create Purchase Order' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      renderComponent();

      expect(screen.getByLabelText(/PO Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Manufacturer/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Distributor/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Purchase Order/ })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderComponent();

      const firstInput = screen.getByLabelText(/PO Number/);
      firstInput.focus();
      expect(firstInput).toHaveFocus();
    });
  });

  describe('Snapshot Testing', () => {
    it('should match snapshot with default props', () => {
      const { container } = renderComponent();
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with multiple items', async () => {
      const user = userEvent.setup();
      const { container } = renderComponent();

      await user.click(screen.getByRole('button', { name: /Add Item/ }));
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with validation errors', async () => {
      const user = userEvent.setup();
      const { container } = renderComponent();

      const submitButton = screen.getByRole('button', { name: /Create Purchase Order/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('PO Number is required')).toBeInTheDocument();
      });

      expect(container.firstChild).toMatchSnapshot();
    });
  });
});