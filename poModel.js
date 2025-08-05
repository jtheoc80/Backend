const { db } = require('./database');

class PurchaseOrder {
    constructor(data) {
        this.id = data.id;
        this.po_number = data.po_number;
        this.manufacturer_id = data.manufacturer_id;
        this.distributor_id = data.distributor_id;
        this.total_amount = data.total_amount;
        this.currency = data.currency || 'USD';
        this.status = data.status || 'pending';
        this.items = data.items;
        this.notes = data.notes;
        this.approved_by = data.approved_by;
        this.approved_at = data.approved_at;
        this.blockchain_transaction_hash = data.blockchain_transaction_hash;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new purchase order
    static async create(poData) {
        const {
            po_number,
            manufacturer_id,
            distributor_id,
            total_amount,
            currency = 'USD',
            items,
            notes
        } = poData;

        const sql = `INSERT INTO purchase_orders 
                     (po_number, manufacturer_id, distributor_id, total_amount, currency, items, notes, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`;
        
        const result = await db.run(sql, [
            po_number,
            manufacturer_id,
            distributor_id,
            total_amount,
            currency,
            JSON.stringify(items),
            notes
        ]);
        
        return await PurchaseOrder.findById(result.lastID);
    }

    // Find purchase order by ID
    static async findById(id) {
        const sql = `SELECT po.*, 
                            m.name as manufacturer_name,
                            d.name as distributor_name,
                            u.username as approved_by_username
                     FROM purchase_orders po
                     LEFT JOIN manufacturers m ON po.manufacturer_id = m.id
                     LEFT JOIN distributors d ON po.distributor_id = d.id
                     LEFT JOIN users u ON po.approved_by = u.id
                     WHERE po.id = ?`;
        
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }

        const po = new PurchaseOrder(rows[0]);
        if (po.items) {
            po.items = JSON.parse(po.items);
        }
        return po;
    }

    // Find purchase order by PO number
    static async findByPONumber(po_number) {
        const sql = `SELECT po.*, 
                            m.name as manufacturer_name,
                            d.name as distributor_name,
                            u.username as approved_by_username
                     FROM purchase_orders po
                     LEFT JOIN manufacturers m ON po.manufacturer_id = m.id
                     LEFT JOIN distributors d ON po.distributor_id = d.id
                     LEFT JOIN users u ON po.approved_by = u.id
                     WHERE po.po_number = ?`;
        
        const rows = await db.query(sql, [po_number]);
        
        if (rows.length === 0) {
            return null;
        }

        const po = new PurchaseOrder(rows[0]);
        if (po.items) {
            po.items = JSON.parse(po.items);
        }
        return po;
    }

    // Get all purchase orders with pagination and filtering
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            manufacturer_id,
            distributor_id,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        let sql = `SELECT po.*, 
                          m.name as manufacturer_name,
                          d.name as distributor_name,
                          u.username as approved_by_username
                   FROM purchase_orders po
                   LEFT JOIN manufacturers m ON po.manufacturer_id = m.id
                   LEFT JOIN distributors d ON po.distributor_id = d.id
                   LEFT JOIN users u ON po.approved_by = u.id`;

        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('po.status = ?');
            params.push(status);
        }

        if (manufacturer_id) {
            conditions.push('po.manufacturer_id = ?');
            params.push(manufacturer_id);
        }

        if (distributor_id) {
            conditions.push('po.distributor_id = ?');
            params.push(distributor_id);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ` ORDER BY po.${sortBy} ${sortOrder}`;
        sql += ` LIMIT ? OFFSET ?`;

        params.push(limit);
        params.push((page - 1) * limit);

        const rows = await db.query(sql, params);
        
        return rows.map(row => {
            const po = new PurchaseOrder(row);
            if (po.items) {
                po.items = JSON.parse(po.items);
            }
            return po;
        });
    }

    // Get count of purchase orders for pagination
    static async getCount(options = {}) {
        const { status, manufacturer_id, distributor_id } = options;

        let sql = `SELECT COUNT(*) as count FROM purchase_orders po`;
        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('po.status = ?');
            params.push(status);
        }

        if (manufacturer_id) {
            conditions.push('po.manufacturer_id = ?');
            params.push(manufacturer_id);
        }

        if (distributor_id) {
            conditions.push('po.distributor_id = ?');
            params.push(distributor_id);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        const rows = await db.query(sql, params);
        return rows[0].count;
    }

    // Approve a purchase order
    static async approve(id, approvedBy) {
        const sql = `UPDATE purchase_orders 
                     SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND status = 'pending'`;
        
        const result = await db.run(sql, [approvedBy, id]);
        
        if (result.changes === 0) {
            return null; // PO not found or already approved
        }

        return await PurchaseOrder.findById(id);
    }

    // Reject a purchase order
    static async reject(id, rejectedBy, notes = null) {
        const sql = `UPDATE purchase_orders 
                     SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND status = 'pending'`;
        
        const result = await db.run(sql, [rejectedBy, notes, id]);
        
        if (result.changes === 0) {
            return null; // PO not found or already processed
        }

        return await PurchaseOrder.findById(id);
    }

    // Update purchase order
    static async update(id, updateData) {
        const allowedFields = ['total_amount', 'currency', 'items', 'notes'];
        const fields = [];
        const params = [];

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                if (key === 'items') {
                    params.push(JSON.stringify(updateData[key]));
                } else {
                    params.push(updateData[key]);
                }
            }
        });

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const sql = `UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = ? AND status = 'pending'`;
        
        const result = await db.run(sql, params);
        
        if (result.changes === 0) {
            return null; // PO not found or not in editable state
        }

        return await PurchaseOrder.findById(id);
    }

    // Delete purchase order (only if pending)
    static async delete(id) {
        const sql = `DELETE FROM purchase_orders WHERE id = ? AND status = 'pending'`;
        const result = await db.run(sql, [id]);
        return result.changes > 0;
    }

    // Update blockchain transaction hash
    static async updateBlockchainHash(id, transactionHash) {
        const sql = `UPDATE purchase_orders 
                     SET blockchain_transaction_hash = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`;
        
        const result = await db.run(sql, [transactionHash, id]);
        return result.changes > 0;
    }

    // Serialize for JSON response
    toJSON() {
        const obj = { ...this };
        if (typeof obj.items === 'string') {
            obj.items = JSON.parse(obj.items);
        }
        return obj;
    }
}

module.exports = PurchaseOrder;