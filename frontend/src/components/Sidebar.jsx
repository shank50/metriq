import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, LayoutDashboard, Store, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/stores', icon: Store, label: 'Stores' }
    ];

    return (
        <aside style={{
            width: '268px',
            background: 'linear-gradient(180deg, rgba(10, 18, 33, 0.95), rgba(5, 12, 26, 0.98))',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255, 255, 255, 0.04)',
            boxShadow: 'var(--shadow-sm)',
            height: '100vh',
            position: 'sticky',
            top: 0,
            zIndex: 20
        }}>
            {/* Logo */}
            <div style={{ padding: '1.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(140deg, var(--terracotta), var(--terracotta-light))',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 25px rgba(15, 181, 168, 0.35)'
                    }}>
                        <BarChart3 size={22} color="#04121f" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: 'var(--charcoal)',
                            margin: 0,
                            lineHeight: 1.2
                        }}>
                            Metriq
                        </h1>
                        <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--warm-gray)',
                            margin: 0
                        }}>
                            Analytics
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.85rem 1rem',
                                borderRadius: '0.85rem',
                                border: 'none',
                                background: isActive
                                    ? 'linear-gradient(120deg, rgba(15, 181, 168, 0.15), rgba(245, 165, 36, 0.12))'
                                    : 'transparent',
                                color: isActive ? 'var(--charcoal)' : 'var(--warm-gray)',
                                fontSize: '0.9rem',
                                fontWeight: isActive ? '600' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'left'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <Icon size={20} strokeWidth={2} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Logout */}
            <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--warm-gray)',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.color = '#ff6b6b';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--warm-gray)';
                    }}
                >
                    <LogOut size={20} strokeWidth={2} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
