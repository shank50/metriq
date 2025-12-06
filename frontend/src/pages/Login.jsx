import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Login failed');
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

                {/* Login Card */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--charcoal)',
                        marginBottom: '0.5rem'
                    }}>
                        Welcome Back
                    </h2>
                    <p style={{
                        color: 'var(--warm-gray)',
                        fontSize: '0.875rem',
                        marginBottom: '1.5rem'
                    }}>
                        Sign in to your account
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label">Password</label>
                            <input
                                type="password"
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Register Link */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--warm-gray)', fontSize: '0.875rem' }}>
                        Don't have an account?{' '}
                        <Link
                            to="/register"
                            style={{
                                color: 'var(--terracotta)',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
