const { db } = require('./database');

class Project {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.organization_id = data.organization_id;
        this.status = data.status || 'active';
        this.created_by = data.created_by;
        this.assigned_users = data.assigned_users ? JSON.parse(data.assigned_users) : [];
        this.due_date = data.due_date;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new project
    static async create(projectData) {
        const { name, description, organization_id, created_by, assigned_users = [], due_date } = projectData;
        
        const sql = `INSERT INTO projects (name, description, organization_id, created_by, assigned_users, due_date) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        
        const result = await db.run(sql, [
            name, 
            description, 
            organization_id, 
            created_by, 
            JSON.stringify(assigned_users),
            due_date
        ]);
        
        return await Project.findById(result.lastID);
    }

    // Find project by ID
    static async findById(id) {
        const sql = `SELECT * FROM projects WHERE id = ?`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Project(rows[0]);
    }

    // Find projects by organization
    static async findByOrganization(organizationId, status = null) {
        let sql = `SELECT * FROM projects WHERE organization_id = ?`;
        const params = [organizationId];
        
        if (status) {
            sql += ` AND status = ?`;
            params.push(status);
        }
        
        sql += ` ORDER BY created_at DESC`;
        
        const rows = await db.query(sql, params);
        return rows.map(row => new Project(row));
    }

    // Find projects assigned to a user using a join table
    static async findByAssignedUser(userId, organizationId = null) {
        let sql = `
            SELECT p.* FROM projects p
            INNER JOIN project_assignments pa ON p.id = pa.project_id
            WHERE pa.user_id = ?
        `;
        const params = [userId];
        
        if (organizationId) {
            sql += ` AND p.organization_id = ?`;
            params.push(organizationId);
        }
        
        sql += ` ORDER BY p.created_at DESC`;
        
        const rows = await db.query(sql, params);
        return rows.map(row => new Project(row));
    }

    // Update project
    async update(updateData) {
        const allowedFields = ['name', 'description', 'status', 'assigned_users', 'due_date'];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                if (key === 'assigned_users') {
                    updates.push(`${key} = ?`);
                    values.push(JSON.stringify(value));
                } else {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
        }

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(this.id);

        const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;
        await db.run(sql, values);

        // Refresh the project data
        const updatedProject = await Project.findById(this.id);
        Object.assign(this, updatedProject);
        return this;
    }

    // Assign user to project
    async assignUser(userId) {
        if (!this.assigned_users.includes(userId)) {
            this.assigned_users.push(userId);
            await this.update({ assigned_users: this.assigned_users });
        }
        return this;
    }

    // Remove user from project
    async removeUser(userId) {
        const index = this.assigned_users.indexOf(userId);
        if (index > -1) {
            this.assigned_users.splice(index, 1);
            await this.update({ assigned_users: this.assigned_users });
        }
        return this;
    }

    // Mark project as completed
    async complete() {
        return await this.update({ status: 'completed' });
    }

    // Check if user is assigned to project
    isUserAssigned(userId) {
        const parsedId = parseInt(userId, 10);
        if (isNaN(parsedId)) return false;
        return this.assigned_users.includes(parsedId);
    }

    // Check if user can manage project (is creator or organization admin)
    async canUserManage(userId, userRole, userOrgRole) {
        if (userRole === 'admin') return true; // System admin
        if (userOrgRole === 'admin') return true; // Organization admin
        if (this.created_by === parseInt(userId)) return true; // Project creator
        
        return false;
    }

    // Delete project
    async delete() {
        const sql = `DELETE FROM projects WHERE id = ?`;
        await db.run(sql, [this.id]);
        return true;
    }

    // JSON representation
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            organization_id: this.organization_id,
            status: this.status,
            created_by: this.created_by,
            assigned_users: this.assigned_users,
            due_date: this.due_date,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Project;