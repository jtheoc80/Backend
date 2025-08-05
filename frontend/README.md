# ValveChain Frontend - Purchase Order Management

A React-based frontend application for managing purchase orders in the ValveChain ecosystem. This application provides intuitive interfaces for creating, viewing, and managing purchase orders between manufacturers and distributors.

## Features

- **Purchase Order Creation**: Comprehensive form for creating new purchase orders
- **Purchase Order List**: Searchable and filterable list of all purchase orders
- **Real-time Updates**: Live status updates and order tracking
- **Responsive Design**: Mobile-friendly interface for all devices
- **Status Management**: Approve, reject, and track order status changes
- **Comprehensive Testing**: Full test coverage with React Testing Library

## Components

### CreatePOForm

A comprehensive form component for creating new purchase orders with the following features:

- **Dynamic Item Management**: Add/remove multiple items per order
- **Real-time Calculations**: Automatic total amount calculation
- **Form Validation**: Client-side validation with error messages
- **Manufacturer/Distributor Selection**: Dropdown selection with validation
- **Currency Support**: Multiple currency options (USD, EUR, GBP)
- **Notes and Documentation**: Additional order information fields

#### Props

```javascript
{
  onSubmit: Function,        // Callback for form submission
  onCancel: Function,        // Callback for form cancellation
  manufacturers: Array,      // Array of manufacturer objects
  distributors: Array       // Array of distributor objects
}
```

#### Usage

```jsx
import CreatePOForm from './components/CreatePOForm';

<CreatePOForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  manufacturers={manufacturerList}
  distributors={distributorList}
/>
```

### POList

A comprehensive list component for displaying and managing purchase orders:

- **Search and Filter**: Real-time search by PO number, manufacturer, or distributor
- **Status Filtering**: Filter by order status (pending, approved, rejected, cancelled)
- **Sorting**: Sortable columns with ascending/descending options
- **Action Buttons**: Context-aware action buttons based on order status
- **Pagination**: Built-in pagination for large datasets
- **Status Badges**: Visual status indicators with color coding
- **Responsive Table**: Mobile-optimized table layout

#### Props

```javascript
{
  onCreateNew: Function,     // Callback for creating new PO
  onViewDetails: Function,   // Callback for viewing PO details
  onApprove: Function,       // Callback for approving PO
  onReject: Function,        // Callback for rejecting PO
  initialPOs: Array,         // Array of purchase order objects
  loading: Boolean,          // Loading state indicator
  error: String             // Error message to display
}
```

#### Usage

```jsx
import POList from './components/POList';

<POList
  onCreateNew={handleCreateNew}
  onViewDetails={handleViewDetails}
  onApprove={handleApprove}
  onReject={handleReject}
  initialPOs={purchaseOrders}
  loading={isLoading}
  error={errorMessage}
/>
```

## Purchase Order Workflow

The frontend implements the complete purchase order workflow:

### 1. Order Creation
- Select manufacturer and distributor from validated lists
- Add multiple items with quantities and pricing
- Automatic total calculation with real-time updates
- Form validation ensures data integrity
- Support for order notes and special instructions

### 2. Order Management
- View all orders in a searchable, sortable list
- Filter by status, manufacturer, or distributor
- Quick actions for pending orders (approve/reject)
- Detailed view for order information

### 3. Status Tracking
- Visual status badges (pending, approved, rejected, cancelled)
- Color-coded status indicators for quick identification
- Timestamp tracking for order lifecycle events
- Activity logging for audit trails

## Data Models

### Purchase Order Object

```javascript
{
  id: Number,
  po_number: String,
  manufacturer_id: String,
  manufacturer_name: String,
  distributor_id: String,
  distributor_name: String,
  total_amount: Number,
  currency: String,
  status: String,
  items: Array,
  notes: String,
  approved_by: Number,
  approved_at: String,
  created_at: String,
  updated_at: String
}
```

### Item Object

```javascript
{
  valve_id: String,
  quantity: Number,
  unit_price: Number,
  description: String
}
```

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`.

## Testing

The project includes comprehensive testing with React Testing Library and Jest:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

### Test Coverage

The test suite includes comprehensive coverage for both components:

#### CreatePOForm Tests (50+ test cases)
- ✅ Component rendering and structure
- ✅ Form input handling and validation
- ✅ Dynamic item management (add/remove items)
- ✅ Real-time total calculation
- ✅ Form submission and error handling
- ✅ Accessibility and keyboard navigation
- ✅ Snapshot testing for UI consistency
- ✅ Props handling and edge cases

#### POList Tests (40+ test cases)
- ✅ Component rendering with data
- ✅ Search and filtering functionality
- ✅ Sorting by different columns
- ✅ Action button behavior
- ✅ Loading and error states
- ✅ Empty state handling
- ✅ Pagination controls
- ✅ Responsive design testing
- ✅ Accessibility compliance
- ✅ Snapshot testing for different states

### Test Features

- **Snapshot Testing**: UI consistency across changes
- **Component Testing**: Isolated component behavior
- **Integration Testing**: Component interaction testing
- **Accessibility Testing**: Screen reader and keyboard support
- **Error Boundary Testing**: Error handling and recovery
- **Performance Testing**: Large dataset handling

## Styling

The application uses CSS modules with responsive design:

- **Mobile-First**: Responsive design that works on all devices
- **Accessible Colors**: High contrast colors for accessibility
- **Consistent Spacing**: Uniform spacing and typography
- **Loading States**: Visual feedback for async operations
- **Error States**: Clear error messaging and recovery options

### CSS Files

- `CreatePOForm.css`: Styles for the order creation form
- `POList.css`: Styles for the order list and table
- `App.css`: Global application styles

## Environment Configuration

The frontend can be configured for different environments:

### Development
```bash
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENVIRONMENT=development
```

### Production
```bash
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_ENVIRONMENT=production
```

## API Integration

The frontend integrates with the ValveChain backend API:

### Authentication
All API calls include JWT authentication headers:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Error Handling
Comprehensive error handling for:
- Network errors
- Authentication failures
- Validation errors
- Server errors
- Timeout handling

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Code Splitting**: Dynamic imports for optimal loading
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Optimized Rendering**: Efficient state updates and re-renders

## Accessibility

The application follows WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels and descriptions
- **High Contrast**: Accessible color schemes
- **Focus Management**: Proper focus handling
- **Form Labels**: Semantic form structure

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Write tests for your changes
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/         # React components
│   │   ├── CreatePOForm.js
│   │   ├── CreatePOForm.css
│   │   ├── POList.js
│   │   └── POList.css
│   ├── __tests__/         # Test files
│   │   ├── CreatePOForm.test.js
│   │   └── POList.test.js
│   ├── App.js             # Main application component
│   ├── App.css            # Global styles
│   ├── index.js           # Application entry point
│   └── setupTests.js      # Test configuration
├── package.json           # Project dependencies
└── README.md             # This file
```

## Deployment

### Build for Production

```bash
npm run build
```

This creates a `build` folder with production-optimized files.

### Deployment Options

- **Static Hosting**: Deploy to Netlify, Vercel, or AWS S3
- **Docker**: Use the provided Dockerfile for containerized deployment
- **CDN**: Serve static assets through a CDN for better performance

## License

This project is licensed under the MIT License.

## Support

For questions or support regarding the frontend application:
- Create an issue in the repository
- Contact the development team
- Review the test files for usage examples