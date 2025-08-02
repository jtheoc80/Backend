// User controller with async error handling
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const getUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ 
            success: false, 
            error: { message: 'User ID is required', status: 400 } 
        });
    }
    
    // Simulate potential database error
    if (id === 'error') {
        throw new Error('User database is temporarily unavailable');
    }
    
    // Mock user fetch with async operation
    await new Promise(resolve => setTimeout(resolve, 50));
    const user = { id, name: 'Mock User', email: 'user@example.com' };
    
    res.json({ success: true, data: user });
});

const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id) {
        return res.status(400).json({ 
            success: false, 
            error: { message: 'User ID is required', status: 400 } 
        });
    }
    
    // Simulate potential validation error
    if (updateData.email && !updateData.email.includes('@')) {
        const error = new Error('Invalid email format');
        error.name = 'ValidationError';
        throw error;
    }
    
    // Mock user update with async operation
    await new Promise(resolve => setTimeout(resolve, 50));
    const user = { id, ...updateData };
    
    res.json({ success: true, data: user });
});

export { getUser, updateUser };