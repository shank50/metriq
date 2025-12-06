const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const buildToken = (user) =>
	jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
		expiresIn: '7d'
	});

exports.register = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password are required' });
		}

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return res.status(400).json({ error: 'Email already registered' });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({
			data: {
				name: name || email.split('@')[0],
				email,
				password: hashedPassword
			}
		});

		const token = buildToken(user);
		res.status(201).json({
			message: 'Registration successful',
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email
			}
		});
	} catch (error) {
		console.error('Register error:', error);
		res.status(500).json({ error: 'Failed to register user' });
	}
};

exports.login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password are required' });
		}

		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const token = buildToken(user);
		res.json({
			message: 'Login successful',
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ error: 'Failed to login' });
	}
};
