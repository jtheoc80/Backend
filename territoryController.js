const Territory = require('./territoryModel');

// Get all territories
const getAllTerritories = async (req, res) => {
    try {
        const territories = await Territory.findAll();
        
        res.json({
            success: true,
            data: territories.map(t => t.toJSON()),
            message: `Retrieved ${territories.length} territories`
        });

    } catch (error) {
        console.error('Get territories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving territories',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get territories by type
const getTerritoriesByType = async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!['global', 'region', 'territory'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid territory type',
                errors: ['Territory type must be global, region, or territory']
            });
        }

        const territories = await Territory.findByType(type);
        
        res.json({
            success: true,
            data: territories.map(t => t.toJSON()),
            message: `Retrieved ${territories.length} ${type} territories`
        });

    } catch (error) {
        console.error('Get territories by type error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving territories',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

// Get territory by ID with hierarchy
const getTerritoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const territory = await Territory.findById(id);
        
        if (!territory) {
            return res.status(404).json({
                success: false,
                message: 'Territory not found',
                errors: ['Invalid territory ID']
            });
        }

        const territoryWithHierarchy = await territory.toJSONWithHierarchy();

        res.json({
            success: true,
            data: territoryWithHierarchy,
            message: 'Territory retrieved successfully'
        });

    } catch (error) {
        console.error('Get territory error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving territory',
            errors: ['An unexpected error occurred. Please try again.']
        });
    }
};

module.exports = {
    getAllTerritories,
    getTerritoriesByType,
    getTerritoryById
};