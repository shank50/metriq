import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const { data } = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Account created successfully!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--cream) 0%, var(--sand) 100%)',
            padding: '2rem'
        }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.5rem'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'linear-gradient(135deg, var(--terracotta) 0%, var(--sage) 100%)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-md)'
                        }}>
                            <BarChart3 size={28} color="white" strokeWidth={2.5} />
                        </div>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: 'var(--charcoal)',
                            margin: 0
                        }}>
                            Metriq
                        </h1>
                    </div>
                    <p style={{
                        color: 'var(--warm-gray)',
                        fontSize: '0.875rem',
                        margin: 0
                    }}>
                        Analytics Platform
                    </p>
                </div>

                {/* Register Card */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--charcoal)',
                        marginBottom: '0.5rem'
                    }}>
                        Create Account
                    </h2>
                    <p style={{
                        color: 'var(--warm-gray)',
                        fontSize: '0.875rem',
                        marginBottom: '1.5rem'
                    }}>
                        Get started with Metriq
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label">Name</label>
                            <input
                                type="text"
                                name="name"
                                className="input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                name="email"
                                className="input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="input"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="input"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', fontSize: '1rem' }}
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                </div>

                {/* Login Link */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--warm-gray)', fontSize: '0.875rem' }}>
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            style={{
                                color: 'var(--terracotta)',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
