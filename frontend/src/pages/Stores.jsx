import { useState, useEffect } from 'react';
import { Store as StoreIcon, Plus, Trash2, Eye, X, AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function Stores() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        storeName: '',
        shopifyDomain: '',
        accessToken: ''
    });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const storeTimestamps = stores
        .map(store => new Date(store.createdAt).getTime())
        .filter(time => !isNaN(time));
    const newestStoreDate = storeTimestamps.length ? new Date(Math.max(...storeTimestamps)) : null;
    const oldestStoreDate = storeTimestamps.length ? new Date(Math.min(...storeTimestamps)) : null;
    const avgStoreAgeDays = storeTimestamps.length
        ? Math.round(
            storeTimestamps.reduce((sum, time) => sum + ((Date.now() - time) / (1000 * 60 * 60 * 24)), 0) / storeTimestamps.length
        )
        : null;

    const headerStats = [
        {
            label: 'Active Stores',
            value: stores.length,
            subtext: stores.length > 1 ? 'Portfolio coverage' : 'Single store mode'
        },
        {
            label: 'Newest Onboarded',
            value: newestStoreDate ? newestStoreDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
            subtext: newestStoreDate ? 'Last connection' : 'Awaiting connections'
        },
        {
            label: 'Oldest Partner',
            value: oldestStoreDate ? oldestStoreDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
            subtext: oldestStoreDate ? 'Original onboarding' : 'Legacy data pending'
        },
        {
            label: 'Avg Tenure',
            value: avgStoreAgeDays !== null ? `${avgStoreAgeDays} days` : '—',
            subtext: avgStoreAgeDays !== null ? 'Days since connection' : 'Awaiting tenure data'
        }
    ];

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/stores/list');
            setStores(data.stores);
        } catch (error) {
            toast.error('Failed to load stores');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStore = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);

        try {
            await api.post('/stores/add', formData);
            toast.success('Store added successfully!');
            setShowModal(false);
            setFormData({ storeName: '', shopifyDomain: '', accessToken: '' });
            fetchStores();
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to add store');
            toast.error(error.response?.data?.error || 'Failed to add store');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        if (!confirm(`Are you sure you want to delete "${storeName}"?`)) return;

        try {
            await api.delete(`/stores/${storeId}`);
            toast.success('Store deleted successfully');
            fetchStores();
        } catch (error) {
            toast.error('Failed to delete store');
        }
    };

    const goToDashboard = (storeId) => {
        localStorage.setItem('selectedStoreId', storeId);
        navigate('/dashboard');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="spin" style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid var(--light-gray)',
                            borderTopColor: 'var(--terracotta)',
                            borderRadius: '50%',
                            margin: '0 auto 1rem'
                        }}></div>
                        <p style={{ color: 'var(--warm-gray)' }}>Loading stores...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, background: 'var(--bg-primary)', overflow: 'auto' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(4, 9, 22, 0.96), rgba(6, 25, 44, 0.92))',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '2rem 2.5rem 1.5rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 24px 60px rgba(2, 6, 23, 0.65)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ flex: 1, minWidth: '260px', maxWidth: '540px' }}>
                            <p style={{
                                fontSize: '0.75rem',
                                color: 'rgba(226, 232, 240, 0.75)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.3em',
                                margin: 0
                            }}>
                                Store portfolio
                            </p>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: 700,
                                color: '#F5F7FA',
                                margin: '0.35rem 0 0.75rem'
                            }}>
                                Stores Command Center
                            </h1>
                            <p style={{
                                color: 'rgba(226, 232, 240, 0.8)',
                                fontSize: '0.95rem',
                                margin: 0
                            }}>
                                {stores.length > 0
                                    ? `Monitoring ${stores.length} ${stores.length === 1 ? 'store' : 'stores'} — newest onboarding ${newestStoreDate ? newestStoreDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}.`
                                    : 'Connect your first Shopify store to unlock a consolidated executive view.'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ minWidth: '180px', justifyContent: 'center' }}>
                                <Plus size={18} />
                                Add Store
                            </button>
                        </div>
                    </div>
                    <div style={{
                        marginTop: '1.5rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1rem'
                    }}>
                        {headerStats.map((stat, index) => (
                            <div key={index} style={{
                                padding: '1rem',
                                borderRadius: 'var(--radius-lg)',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(6px)'
                            }}>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2em',
                                    color: 'rgba(226, 232, 240, 0.65)'
                                }}>
                                    {stat.label}
                                </p>
                                <p style={{
                                    margin: '0.4rem 0 0.25rem',
                                    fontSize: '1.3rem',
                                    fontWeight: 700,
                                    color: '#F5F7FA'
                                }}>
                                    {stat.value}
                                </p>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.8rem',
                                    color: 'rgba(226, 232, 240, 0.65)'
                                }}>
                                    {stat.subtext}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '2rem' }} className="fade-in">
                    {stores.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'var(--bg-surface)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem'
                            }}>
                                <StoreIcon size={40} color="var(--warm-gray)" strokeWidth={1.5} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal)', marginBottom: '0.5rem' }}>
                                No stores connected
                            </h3>
                            <p style={{ color: 'var(--warm-gray)', marginBottom: '2rem' }}>
                                Add your first Shopify store to start tracking analytics
                            </p>
                            <button onClick={() => setShowModal(true)} className="btn btn-primary">
                                <Plus size={18} />
                                Add Your First Store
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Store Cards Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                                gap: '1.5rem',
                                marginBottom: '2rem'
                            }}>
                                {stores.map((store) => (
                                    <div key={store.id} className="store-card card" style={{
                                        position: 'relative',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {/* Delete Button - Hidden by default */}
                                        <button
                                            onClick={() => handleDeleteStore(store.id, store.storeName)}
                                            className="store-delete-btn"
                                            style={{
                                                position: 'absolute',
                                                top: '1rem',
                                                right: '1rem',
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: 'var(--radius-md)',
                                                border: 'none',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: '#EF4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0,
                                                transition: 'all 0.2s ease',
                                                zIndex: 5
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        {/* Store Header with Avatar and Badge */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: 'var(--radius-lg)',
                                                background: 'linear-gradient(135deg, rgba(15, 181, 168, 0.95) 0%, rgba(9, 134, 124, 0.95) 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                boxShadow: 'var(--shadow-sm)',
                                                flexShrink: 0
                                            }}>
                                                {store.storeName.charAt(0).toUpperCase()}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                    <h3 style={{
                                                        fontSize: '1.125rem',
                                                        fontWeight: '600',
                                                        color: 'var(--charcoal)',
                                                        margin: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {store.storeName}
                                                    </h3>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'rgba(139, 157, 131, 0.1)',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600',
                                                        color: 'var(--sage)',
                                                        flexShrink: 0
                                                    }}>
                                                        <CheckCircle size={12} />
                                                        Active
                                                    </div>
                                                </div>
                                                <p style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--warm-gray)',
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {store.shopifyDomain}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Store Stats */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '0.75rem',
                                            padding: '1rem',
                                            background: 'var(--bg-surface)',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: '1rem'
                                        }}>
                                            <div>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--warm-gray)', margin: '0 0 0.25rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
                                                    Connected
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                    <Calendar size={14} color="var(--sage)" />
                                                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)', margin: 0 }}>
                                                        {new Date(store.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--warm-gray)', margin: '0 0 0.25rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
                                                    Added
                                                </p>
                                                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--sage)', margin: 0 }}>
                                                    {new Date(store.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* View Dashboard Button */}
                                        <button
                                            onClick={() => goToDashboard(store.id)}
                                            className="btn btn-outline"
                                            style={{ width: '100%' }}
                                        >
                                            <Eye size={16} />
                                            View Dashboard
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Combined Analytics Card - Enhanced */}
                            <div className="card" style={{
                                background: 'linear-gradient(135deg, rgba(139, 157, 131, 0.05) 0%, rgba(196, 117, 111, 0.05) 100%)',
                                border: '2px solid var(--sage)',
                                borderStyle: 'dashed',
                                padding: '2rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: 'var(--radius-lg)',
                                                background: 'linear-gradient(135deg, var(--sage) 0%, var(--terracotta) 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: 'var(--shadow-sm)'
                                            }}>
                                                <StoreIcon size={24} color="white" />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--charcoal)', marginBottom: '0.25rem' }}>
                                                    Combined Analytics
                                                </h3>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--warm-gray)', margin: 0 }}>
                                                    View insights across all {stores.length} {stores.length === 1 ? 'store' : 'stores'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem('selectedStoreId');
                                            navigate('/dashboard');
                                        }}
                                        className="btn btn-primary"
                                        style={{ minWidth: '180px' }}
                                    >
                                        View All Stores
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Add Store Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: '1rem'
                }} onClick={() => setShowModal(false)}>
                    <div
                        className="card fade-in"
                        style={{ maxWidth: '500px', width: '100%', margin: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--charcoal)', margin: 0 }}>
                                Add New Store
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--warm-gray)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(196, 117, 111, 0.1)',
                                border: '1px solid rgba(196, 117, 111, 0.3)',
                                color: 'var(--terracotta)',
                                fontSize: '0.875rem',
                                marginBottom: '1rem',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'flex-start'
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleAddStore}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label">Store Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.storeName}
                                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                    placeholder="My Awesome Store"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label">Shopify Domain</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.shopifyDomain}
                                    onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                                    placeholder="your-store.myshopify.com"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="label">Admin API Access Token</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={formData.accessToken}
                                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                    placeholder="shpat_..."
                                    required
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--warm-gray)', marginTop: '0.5rem' }}>
                                    Get your access token from Shopify Admin → Apps → Develop apps
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-outline"
                                    style={{ flex: 1 }}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Adding...' : 'Add Store'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                /* Store card hover effect */
                .store-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                }

                /* Delete button - only visible on card hover */
                .store-card:hover .store-delete-btn {
                    opacity: 1;
                }

                .store-delete-btn:hover {
                    background: rgba(239, 68, 68, 0.2) !important;
                    transform: scale(1.1);
                }
            `}</style>
        </div>
    );
}
