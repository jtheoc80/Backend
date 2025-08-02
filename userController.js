const User = require('./userModel');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Rate limiting for login attempts
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

class UserController {
    // User registration with rate limiting applied at route level
    static async register(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }

            // TODO: Check if user already exists in database
            // const existingUser = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            // if (existingUser.length > 0) {
            //     return res.status(400).json({ error: 'User already exists' });
            // }

            const passwordHash = await User.hashPassword(password);
            
            // TODO: Save user to database
            // const userId = await db.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', 
            //                              [email, passwordHash]);

            // For demo purposes
            const user = new User(1, email, passwordHash);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: user.toSafeJSON()
            });

        } catch (error) {
            console.error('Registration error:', error.message);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    // User login with rate limiting applied at route level
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }

            // TODO: Get user from database
            // const userRow = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            // if (userRow.length === 0) {
            //     return res.status(401).json({ error: 'Invalid credentials' });
            // }

            // For demo purposes, create a mock user
            const mockPasswordHash = await User.hashPassword('password123');
            const user = new User(1, email, mockPasswordHash);

            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) {
                console.error('Invalid login attempt for email:', email.replace(/(.{2})(.*)(@.*)/, '$1***$3'));
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT token (ensure JWT_SECRET is set in environment)
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                user: user.toSafeJSON()
            });

        } catch (error) {
            console.error('Login error:', error.message);
            res.status(500).json({ error: 'Login failed' });
        }
    }
}

module.exports = { UserController, loginRateLimit };