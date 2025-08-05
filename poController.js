const PurchaseOrder = require('./poModel');
const logActivity = require('./logActivity');

const poController = {
    // Create a new purchase order
    createPO: async (req, res) => {
        try {
            const {
                po_number,
                manufacturer_id,
                distributor_id,
                total_amount,
                currency,
                items,
                notes
            } = req.body;

            // Validation
            if (!po_number || !manufacturer_id || !distributor_id || !total_amount || !items) {
                return res.status(400).json({
                    error: 'Missing required fields: po_number, manufacturer_id, distributor_id, total_amount, items'
                });
            }

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    error: 'Items must be a non-empty array'
                });
            }

            if (total_amount <= 0) {
                return res.status(400).json({
                    error: 'Total amount must be greater than 0'
                });
            }

            // Check if PO number already exists
            const existingPO = await PurchaseOrder.findByPONumber(po_number);
            if (existingPO) {
                return res.status(409).json({
                    error: 'Purchase order number already exists'
                });
            }

            // Create purchase order
            const purchaseOrder = await PurchaseOrder.create({
                po_number,
                manufacturer_id,
                distributor_id,
                total_amount,
                currency,
                items,
                notes
            });

            // Log activity
            await logActivity(
                req.user?.id,
                'CREATE_PO',
                { po_id: purchaseOrder.id, po_number },
                'success'
            );

            res.status(201).json({
                message: 'Purchase order created successfully',
                purchaseOrder
            });

        } catch (error) {
            console.error('Create PO error:', error);
            
            // Log failed activity
            await logActivity(
                req.user?.id,
                'CREATE_PO',
                { po_number: req.body.po_number, error: error.message },
                'failure'
            );

            res.status(500).json({
                error: 'Failed to create purchase order',
                details: error.message
            });
        }
    },

    // Get purchase order by ID
    getPOById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    error: 'Invalid purchase order ID'
                });
            }

            const purchaseOrder = await PurchaseOrder.findById(parseInt(id));

            if (!purchaseOrder) {
                return res.status(404).json({
                    error: 'Purchase order not found'
                });
            }

            res.json({
                purchaseOrder
            });

        } catch (error) {
            console.error('Get PO by ID error:', error);
            res.status(500).json({
                error: 'Failed to retrieve purchase order',
                details: error.message
            });
        }
    },

    // Get purchase order by PO number
    getPOByNumber: async (req, res) => {
        try {
            const { po_number } = req.params;

            if (!po_number) {
                return res.status(400).json({
                    error: 'Purchase order number is required'
                });
            }

            const purchaseOrder = await PurchaseOrder.findByPONumber(po_number);

            if (!purchaseOrder) {
                return res.status(404).json({
                    error: 'Purchase order not found'
                });
            }

            res.json({
                purchaseOrder
            });

        } catch (error) {
            console.error('Get PO by number error:', error);
            res.status(500).json({
                error: 'Failed to retrieve purchase order',
                details: error.message
            });
        }
    },

    // List purchase orders with pagination and filtering
    listPOs: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                manufacturer_id,
                distributor_id,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = req.query;

            // Validation
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    error: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100'
                });
            }

            const validSortFields = ['created_at', 'updated_at', 'total_amount', 'po_number', 'status'];
            if (!validSortFields.includes(sortBy)) {
                return res.status(400).json({
                    error: 'Invalid sort field. Must be one of: ' + validSortFields.join(', ')
                });
            }

            const validSortOrders = ['ASC', 'DESC'];
            if (!validSortOrders.includes(sortOrder.toUpperCase())) {
                return res.status(400).json({
                    error: 'Invalid sort order. Must be ASC or DESC'
                });
            }

            const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({
                    error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
                });
            }

            const options = {
                page: pageNum,
                limit: limitNum,
                status,
                manufacturer_id,
                distributor_id,
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            };

            const [purchaseOrders, totalCount] = await Promise.all([
                PurchaseOrder.findAll(options),
                PurchaseOrder.getCount(options)
            ]);

            const totalPages = Math.ceil(totalCount / limitNum);

            res.json({
                purchaseOrders,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCount,
                    limit: limitNum,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            });

        } catch (error) {
            console.error('List POs error:', error);
            res.status(500).json({
                error: 'Failed to retrieve purchase orders',
                details: error.message
            });
        }
    },

    // Approve purchase order
    approvePO: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    error: 'Invalid purchase order ID'
                });
            }

            if (!userId) {
                return res.status(401).json({
                    error: 'User authentication required'
                });
            }

            const purchaseOrder = await PurchaseOrder.approve(parseInt(id), userId);

            if (!purchaseOrder) {
                return res.status(404).json({
                    error: 'Purchase order not found or already processed'
                });
            }

            // Log activity
            await logActivity(
                userId,
                'APPROVE_PO',
                { po_id: purchaseOrder.id, po_number: purchaseOrder.po_number },
                'success'
            );

            res.json({
                message: 'Purchase order approved successfully',
                purchaseOrder
            });

        } catch (error) {
            console.error('Approve PO error:', error);
            
            // Log failed activity
            await logActivity(
                req.user?.id,
                'APPROVE_PO',
                { po_id: req.params.id, error: error.message },
                'failure'
            );

            res.status(500).json({
                error: 'Failed to approve purchase order',
                details: error.message
            });
        }
    },

    // Reject purchase order
    rejectPO: async (req, res) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const userId = req.user?.id;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    error: 'Invalid purchase order ID'
                });
            }

            if (!userId) {
                return res.status(401).json({
                    error: 'User authentication required'
                });
            }

            const purchaseOrder = await PurchaseOrder.reject(parseInt(id), userId, notes);

            if (!purchaseOrder) {
                return res.status(404).json({
                    error: 'Purchase order not found or already processed'
                });
            }

            // Log activity
            await logActivity(
                userId,
                'REJECT_PO',
                { po_id: purchaseOrder.id, po_number: purchaseOrder.po_number, notes },
                'success'
            );

            res.json({
                message: 'Purchase order rejected successfully',
                purchaseOrder
            });

        } catch (error) {
            console.error('Reject PO error:', error);
            
            // Log failed activity
            await logActivity(
                req.user?.id,
                'REJECT_PO',
                { po_id: req.params.id, error: error.message },
                'failure'
            );

            res.status(500).json({
                error: 'Failed to reject purchase order',
                details: error.message
            });
        }
    },

    // Update purchase order (only if pending)
    updatePO: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    error: 'Invalid purchase order ID'
                });
            }

            // Validate update data
            const allowedFields = ['total_amount', 'currency', 'items', 'notes'];
            const hasValidFields = Object.keys(updateData).some(key => allowedFields.includes(key));

            if (!hasValidFields) {
                return res.status(400).json({
                    error: 'No valid fields to update. Allowed fields: ' + allowedFields.join(', ')
                });
            }

            if (updateData.total_amount && updateData.total_amount <= 0) {
                return res.status(400).json({
                    error: 'Total amount must be greater than 0'
                });
            }

            if (updateData.items && (!Array.isArray(updateData.items) || updateData.items.length === 0)) {
                return res.status(400).json({
                    error: 'Items must be a non-empty array'
                });
            }

            const purchaseOrder = await PurchaseOrder.update(parseInt(id), updateData);

            if (!purchaseOrder) {
                return res.status(404).json({
                    error: 'Purchase order not found or not in editable state'
                });
            }

            // Log activity
            await logActivity(
                req.user?.id,
                'UPDATE_PO',
                { po_id: purchaseOrder.id, po_number: purchaseOrder.po_number, updated_fields: Object.keys(updateData) },
                'success'
            );

            res.json({
                message: 'Purchase order updated successfully',
                purchaseOrder
            });

        } catch (error) {
            console.error('Update PO error:', error);
            
            // Log failed activity
            await logActivity(
                req.user?.id,
                'UPDATE_PO',
                { po_id: req.params.id, error: error.message },
                'failure'
            );

            res.status(500).json({
                error: 'Failed to update purchase order',
                details: error.message
            });
        }
    }
};

module.exports = poController;