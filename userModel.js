// Mock user model
class User {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.createdAt = data.createdAt || new Date();
    }
    
    static async findById(id) {
        // Simulate async database call
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Simulate error for testing
        if (id === 'notfound') {
            throw new Error('User not found');
        }
        
        return new User({ id, name: 'Mock User', email: 'user@example.com' });
    }
    
    static async create(userData) {
        // Simulate async database call
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Simulate validation error
        if (!userData.email || !userData.email.includes('@')) {
            const error = new Error('Invalid email format');
            error.name = 'ValidationError';
            throw error;
        }
        
        return new User({ ...userData, id: Date.now().toString() });
    }
    
    async save() {
        // Simulate async database save
        await new Promise(resolve => setTimeout(resolve, 50));
        return this;
    }
}

export default User;