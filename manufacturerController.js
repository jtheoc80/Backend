const Manufacturer = require('./manufacturerModel');
const Valve = require('./valveModel');
// const logActivity = require('./logActivity');

// Validate manufacturer credentials
const validateManufacturer = async (req, res) => {
    try {
        const { manufacturerId, walletAddress } = req.body;

        if (!manufacturerId) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer ID is required',
                errors: ['Invalid manufacturer ID']
            });
        }

        const manufacturer = await Manufacturer.findById(manufacturerId);
        
        if (!manufacturer) {
            // await logActivity(null, 'manufacturer_auth_failed', { manufacturerId, reason: 'not_found' }, 'failure');
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found',
                errors: ['Invalid manufacturer ID']
            });
        }

        if (walletAddress && manufacturer.wallet_address !== walletAddress) {
            // await logActivity(null, 'manufacturer_auth_failed', { manufacturerId, walletAddress, reason: 'wallet_mismatch' }, 'failure');
            return res.status(403).json({
                success: false,
                message: 'Wallet address does not match registered manufacturer',
                errors: ['Unauthorized wallet address']
            });
        }

        // await logActivity(null, 'manufacturer_auth_success', { manufacturerId, walletAddress }, 'success');

        res.json({
            success: true,
            data: manufacturer.toAuthResponse(),
            message: 'Manufacturer authenticated successfully'
        });

    } catch (error) {
        console.error('Manufacturer validation error:', error);
        // await logActivity(null, 'manufacturer_auth_error', { error: error.message }, 'failure');
        res.status(500).json({
            success: false,
            message: 'Internal server error during manufacturer validation',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get all manufacturers
const getAllManufacturers = async (req, res) => {
    try {
        const manufacturers = await Manufacturer.findAll();
        
        res.json({
            success: true,
            data: manufacturers.map(m => m.toJSON()),
            message: 'Manufacturers retrieved successfully'
        });

    } catch (error) {
        console.error('Get manufacturers error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving manufacturers',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get manufacturer by ID
const getManufacturerById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const manufacturer = await Manufacturer.findById(id);
        
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found',
                errors: ['Invalid manufacturer ID']
            });
        }

        res.json({
            success: true,
            data: manufacturer.toJSON(),
            message: 'Manufacturer retrieved successfully'
        });

    } catch (error) {
        console.error('Get manufacturer error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving manufacturer',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get valves for a manufacturer
const getManufacturerValves = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Verify manufacturer exists
        const manufacturer = await Manufacturer.findById(id);
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found',
                errors: ['Invalid manufacturer ID']
            });
        }

        const valves = await Valve.findByManufacturer(id, page, limit);
        
        res.json({
            success: true,
            data: valves.map(v => v.toJSON()),
            message: `Retrieved ${valves.length} valves for manufacturer`
        });

    } catch (error) {
        console.error('Get manufacturer valves error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving manufacturer valves',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Tokenize a new valve
const tokenizeValve = async (req, res) => {
    try {
        const { valveDetails, manufacturerId } = req.body;

        if (!valveDetails || !manufacturerId) {
            return res.status(400).json({
                success: false,
                message: 'Valve details and manufacturer ID are required',
                errors: ['Missing required fields']
            });
        }

        // Validate manufacturer
        const manufacturer = await Manufacturer.findById(manufacturerId);
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found',
                errors: ['Invalid manufacturer ID']
            });
        }

        // Check permissions
        if (!manufacturer.canTokenizeValves()) {
            // await logActivity(null, 'valve_tokenize_denied', { manufacturerId, reason: 'no_permission' }, 'failure');
            return res.status(403).json({
                success: false,
                message: 'Manufacturer does not have permission to tokenize valves',
                errors: ['Insufficient permissions']
            });
        }

        // Validate valve details
        const validationErrors = Valve.validateValveData(valveDetails);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Valve details validation failed',
                errors: validationErrors
            });
        }

        // Check for duplicate serial number
        const existingValve = await Valve.findBySerialNumber(valveDetails.serialNumber);
        if (existingValve) {
            return res.status(409).json({
                success: false,
                message: 'A valve with this serial number has already been tokenized',
                errors: ['Duplicate serial number']
            });
        }

        // Generate tokenization data
        const tokenId = Valve.generateTokenId();
        const valveId = Valve.generateValveId(manufacturer.name, tokenId);
        const transactionHash = Valve.generateTransactionHash();

        // Create valve record
        const valveData = {
            token_id: tokenId,
            valve_id: valveId,
            serial_number: valveDetails.serialNumber,
            type: valveDetails.type,
            manufacturer_id: manufacturerId,
            model: valveDetails.model,
            diameter: valveDetails.specifications.diameter,
            pressure: valveDetails.specifications.pressure,
            temperature: valveDetails.specifications.temperature,
            material: valveDetails.specifications.material,
            connection_type: valveDetails.specifications.connectionType,
            flow_coefficient: valveDetails.specifications.flowCoefficient,
            manufacture_date: valveDetails.manufactureDate,
            warranty_months: valveDetails.warrantyMonths || 12,
            certifications: valveDetails.certifications,
            transaction_hash: transactionHash
        };

        const valve = await Valve.create(valveData);

        // await logActivity(null, 'valve_tokenized', { 
        //     tokenId, 
        //     valveId, 
        //     manufacturerId, 
        //     serialNumber: valveDetails.serialNumber 
        // }, 'success');

        res.json({
            success: true,
            tokenId,
            transactionHash,
            valveId,
            message: 'Valve successfully tokenized'
        });

    } catch (error) {
        console.error('Valve tokenization error:', error);
        // await logActivity(null, 'valve_tokenize_error', { error: error.message }, 'failure');
        res.status(500).json({
            success: false,
            message: 'Internal server error during valve tokenization',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get all valves
const getAllValves = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const valves = await Valve.findAll(page, limit);
        
        res.json({
            success: true,
            data: valves.map(v => v.toJSON()),
            message: `Retrieved ${valves.length} valves`
        });

    } catch (error) {
        console.error('Get valves error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving valves',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get valve by token ID
const getValveByTokenId = async (req, res) => {
    try {
        const { tokenId } = req.params;
        
        const valve = await Valve.findByTokenId(tokenId);
        
        if (!valve) {
            return res.status(404).json({
                success: false,
                message: 'Valve not found',
                errors: ['Invalid token ID']
            });
        }

        res.json({
            success: true,
            data: valve.toJSON(),
            message: 'Valve retrieved successfully'
        });

    } catch (error) {
        console.error('Get valve error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving valve',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

module.exports = {
    validateManufacturer,
    getAllManufacturers,
    getManufacturerById,
    getManufacturerValves,
    tokenizeValve,
    getAllValves,
    getValveByTokenId
};