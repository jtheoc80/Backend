// Mock database for testing when PostgreSQL is not available
class MockDatabase {
    constructor() {
        this.logs = [];
        this.idCounter = 1;
    }

    async query(text, params = []) {
        // Handle different query types
        if (text.includes('SELECT NOW()')) {
            return { rows: [{ current_time: new Date() }] };
        }
        
        if (text.includes('CREATE TABLE')) {
            console.log('Mock: Creating table audit_logs');
            return { rows: [] };
        }
        
        if (text.includes('CREATE INDEX')) {
            console.log('Mock: Creating indexes');
            return { rows: [] };
        }
        
        if (text.includes('INSERT INTO audit_logs')) {
            // Mock insert
            const [userId, action, metadata, outcome] = params;
            const log = {
                id: this.idCounter++,
                user_id: userId,
                action: action,
                metadata: metadata,
                outcome: outcome,
                timestamp: new Date(),
                created_at: new Date()
            };
            this.logs.push(log);
            console.log('Mock: Inserted audit log', log);
            return { rows: [] };
        }
        
        if (text.includes('SELECT * FROM audit_logs')) {
            // Mock select with filtering
            let filteredLogs = [...this.logs];
            
            // Apply filters based on named parameters object
            const { user, action, startDate, endDate, limit, offset } = params || {};
            
            if (user) {
                filteredLogs = filteredLogs.filter(log => log.user_id === user);
            }
            if (action) {
                filteredLogs = filteredLogs.filter(log => log.action === action);
            }
            if (startDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= new Date(startDate));
            }
            if (endDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= new Date(endDate));
            }
            
            // Sort by timestamp DESC
            filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
            
            // Apply pagination
            const start = offset || 0;
            const end = start + (limit || 10);
            filteredLogs = filteredLogs.slice(start, end);
            
            return { rows: filteredLogs };
        }
        
        return { rows: [] };
    }

    getClient() {
        return {
            query: this.query.bind(this),
            release: () => {}
        };
    }

    get pool() {
        return {
            end: () => Promise.resolve()
        };
    }
}

module.exports = MockDatabase;