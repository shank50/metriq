import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Package, Users, ShoppingCart, IndianRupee, AlertTriangle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('all');
    const [dashboardData, setDashboardData] = useState(null);
    const [chartType, setChartType] = useState('area');
    const [dateRange, setDateRange] = useState('30d');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customDates, setCustomDates] = useState({
        start: '',
        end: ''
    });
    const [hoveredSegment, setHoveredSegment] = useState(null);

    useEffect(() => {
        const storedStoreId = localStorage.getItem('selectedStoreId');
        if (storedStoreId) {
            setSelectedStore(storedStoreId);
        }
    }, []);

    useEffect(() => {
        if (selectedStore === 'all') {
            localStorage.removeItem('selectedStoreId');
        } else {
            localStorage.setItem('selectedStoreId', selectedStore);
        }
    }, [selectedStore]);

    useEffect(() => {
        fetchStores();
        fetchDashboardData();
    }, [selectedStore]);

    const fetchStores = async () => {
        try {
            const response = await api.get('/stores/list');
            const fetchedStores = response.data.stores || [];
            setStores(fetchedStores);
            if (selectedStore !== 'all' && !fetchedStores.some(store => store.id === selectedStore)) {
                setSelectedStore('all');
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
            setStores([]);
        }
    };

    const buildQueryString = (extraParams = {}) => {
        const params = new URLSearchParams();
        if (selectedStore !== 'all') {
            params.set('storeId', selectedStore);
        }
        Object.entries(extraParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.set(key, value);
            }
        });
        const query = params.toString();
        return query ? `?${query}` : '';
    };

    const fetchDashboardData = async (useSubtleLoading = false) => {
        if (useSubtleLoading) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const [statsRes, salesRes, customersRes, ordersRes, abandonedRes, productsRes, inventoryRes] = await Promise.all([
                api.get(`/dashboard/stats${buildQueryString()}`),
                api.get(`/dashboard/sales${buildQueryString({ range: dateRange })}`),
                api.get(`/dashboard/customers/top${buildQueryString()}`),
                api.get(`/dashboard/orders/recent${buildQueryString()}`),
                api.get(`/dashboard/abandoned/stats${buildQueryString()}`).catch(() => ({ data: { count: 0, totalLostRevenue: 0, abandonmentRate: 0 } })),
                api.get(`/dashboard/products/top${buildQueryString()}`).catch(() => ({ data: [] })),
                api.get(`/inventory/status${buildQueryString()}`).catch(() => ({ data: { outOfStock: [], lowStock: [] } }))
            ]);

            const totalRevenue = statsRes.data.totalSales || 0;
            const totalOrders = statsRes.data.totalOrders || 0;
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            const revenueData = (salesRes.data || []).map(item => ({
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                revenue: Number(item.sales)
            }));

            const topCustomers = (customersRes.data || []).map(customer => {
                const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                return {
                    name: fullName || customer.email || 'Unknown',
                    email: customer.email || '',
                    totalSpent: Number(customer.totalSpent) || 0
                };
            });

            const recentOrders = (ordersRes.data || []).slice(0, 5).map(order => {
                const customerName = order.customer
                    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email || 'Unknown'
                    : 'Unknown';
                const orderIdentifier = order.orderNumber ?? order.id;
                return {
                    orderId: orderIdentifier ? String(orderIdentifier).slice(-6) : '—',
                    customerName,
                    amount: Number(order.totalPrice) || 0
                };
            });

            const conversionRate = totalOrders > 0 && abandonedRes.data.count > 0
                ? ((totalOrders / (totalOrders + abandonedRes.data.count)) * 100)
                : 0;

            const outOfStockProducts = inventoryRes.data.outOfStock || [];
            const lowStockProducts = inventoryRes.data.lowStock || [];

            setDashboardData({
                totalRevenue,
                totalOrders,
                avgOrderValue,
                totalCustomers: statsRes.data.totalCustomers || 0,
                abandonedCarts: abandonedRes.data.count || 0,
                lostRevenue: abandonedRes.data.totalLostRevenue || 0,
                conversionRate,
                abandonmentRate: abandonedRes.data.abandonmentRate || 0,
                revenueData,
                topCustomers,
                recentOrders,
                topProducts: productsRes.data || [],
                outOfStockProducts,
                lowStockProducts,
                lowStockCount: (lowStockProducts.length + outOfStockProducts.length)
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
            toast.error('Failed to load dashboard data');
        } finally {
            if (useSubtleLoading) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    const handleSync = async () => {
        try {
            toast.loading('Syncing data...');
            if (selectedStore === 'all') {
                await api.post('/ingestion/sync-all');
            } else {
                await api.post('/ingestion/sync', { storeId: selectedStore });
            }
            toast.dismiss();
            toast.success('Data synced successfully!');
            fetchDashboardData();
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to sync data');
        }
    };

    const handleDateRangeChange = async (value) => {
        if (value === 'custom') {
            setShowCustomPicker(true);
            return;
        }
        const prevRange = dateRange;
        setDateRange(value);
        setShowCustomPicker(false);

        // Only fetch if actually changed
        if (value !== prevRange) {
            await fetchDashboardData(true); // Use subtle loading
        }
    };

    const applyCustomDates = () => {
        if (customDates.start && customDates.end) {
            const start = new Date(customDates.start);
            const end = new Date(customDates.end);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDateRange(`${diffDays}d`);
            toast.success(`Custom range applied: ${diffDays} days`);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p style={{ color: 'var(--warm-gray)' }}>Loading Dashboard...</p>
                    </div>
                </main>
            </div>
        );
    }

    const kpis = [
        {
            label: 'Total Revenue',
            value: dashboardData?.totalRevenue || 0,
            format: 'currency',
            subtext: `From ${dashboardData?.totalOrders || 0} orders`,
            icon: IndianRupee,
            color: '#0FB5A8',
            bgColor: 'rgba(15, 181, 168, 0.15)'
        },
        {
            label: 'Avg Order Value',
            value: dashboardData?.avgOrderValue || 0,
            format: 'currency',
            subtext: 'Per transaction',
            icon: TrendingUp,
            color: '#38BDF8',
            bgColor: 'rgba(56, 189, 248, 0.15)'
        },
        {
            label: 'Total Orders',
            value: dashboardData?.totalOrders || 0,
            format: 'number',
            subtext: 'Completed',
            icon: ShoppingCart,
            color: '#F5A524',
            bgColor: 'rgba(245, 165, 36, 0.18)'
        },
        {
            label: 'Total Customers',
            value: dashboardData?.totalCustomers || 0,
            format: 'number',
            subtext: 'Unique buyers',
            icon: Users,
            color: '#60A5FA',
            bgColor: 'rgba(96, 165, 250, 0.15)'
        },
        {
            label: 'Conversion Rate',
            value: dashboardData?.conversionRate || 0,
            format: 'percentage',
            subtext: 'Orders/Total visits',
            icon: TrendingUp,
            color: '#0FB5A8',
            bgColor: 'rgba(15, 181, 168, 0.12)'
        },
        {
            label: 'Abandoned Carts',
            value: dashboardData?.abandonedCarts || 0,
            format: 'number',
            subtext: `${(dashboardData?.abandonmentRate || 0).toFixed(1)}% rate`,
            icon: AlertTriangle,
            color: '#F87171',
            bgColor: 'rgba(248, 113, 113, 0.18)'
        },
        {
            label: 'Lost Revenue',
            value: dashboardData?.lostRevenue || 0,
            format: 'currency',
            subtext: 'From abandonments',
            icon: TrendingDown,
            color: '#FB7185',
            bgColor: 'rgba(251, 113, 133, 0.15)'
        },
        {
            label: 'Low / Out of Stock',
            value: dashboardData?.lowStockCount || 0,
            format: 'number',
            subtext: 'Need restocking',
            icon: Package,
            color: '#FACC15',
            bgColor: 'rgba(250, 204, 21, 0.18)'
        }
    ];

    const formatValue = (value, format) => {
        if (format === 'currency') {
            return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        }
        if (format === 'percentage') {
            return `${value.toFixed(1)}%`;
        }
        return value.toLocaleString('en-IN');
    };

    const COLORS = ['#0FB5A8', '#F5A524', '#38BDF8', '#F97316', '#60A5FA'];

    const dateRangeOptions = [
        { label: 'Last Day', value: '1d' },
        { label: '7 Days', value: '7d' },
        { label: '30 Days', value: '30d' },
        { label: '90 Days', value: '90d' },
        { label: 'Custom', value: 'custom' }
    ];

    const tooltipStyles = {
        background: 'rgba(4, 12, 24, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--charcoal)'
    };

    const tooltipLabelStyle = {
        color: 'var(--warm-gray)',
        fontWeight: 600,
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    };

    const tooltipItemStyle = {
        textTransform: 'capitalize',
        color: 'var(--charcoal)',
        fontWeight: 600,
        fontSize: '0.9rem'
    };

    const totalCheckouts = (dashboardData?.totalOrders || 0) + (dashboardData?.abandonedCarts || 0);

    const customerShareData = (() => {
        const customers = dashboardData?.topCustomers || [];
        if (!customers.length) return [];

        const prepared = customers.map((customer, index) => ({
            name: customer.name || `Customer ${index + 1}`,
            value: Number(customer.totalSpent) || 0
        }));

        const topTotal = prepared.reduce((sum, item) => sum + item.value, 0);
        const remaining = Math.max((dashboardData?.totalRevenue || 0) - topTotal, 0);
        if (remaining > 0) {
            prepared.push({ name: 'Other Customers', value: remaining });
        }
        return prepared.filter(item => item.value > 0);
    })();

    const checkoutConversion = totalCheckouts > 0
        ? ((dashboardData?.totalOrders || 0) / totalCheckouts) * 100
        : 0;

    const dropoffPercent = Math.max(0, 100 - checkoutConversion);
    const completedLabelPosition = Math.min(Math.max(checkoutConversion / 2, 18), 80);
    const dropoffLabelPosition = Math.min(Math.max(100 - (dropoffPercent / 2), completedLabelPosition + 8), 96);

    const topCustomerShare = dashboardData?.totalRevenue > 0 && (dashboardData?.topCustomers?.length || 0) > 0
        ? Math.min(100, ((dashboardData.topCustomers.reduce((sum, customer) => sum + (Number(customer.totalSpent) || 0), 0) / dashboardData.totalRevenue) * 100))
        : null;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, background: 'var(--bg-primary)', overflow: 'auto' }}>
                <div style={{
                    background: 'rgba(5, 12, 26, 0.82)',
                    backdropFilter: 'blur(18px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '1.75rem 2.5rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 20px 35px rgba(3, 6, 23, 0.6)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--charcoal)', margin: 0 }}>
                                Dashboard
                            </h1>
                            <p style={{ color: 'var(--warm-gray)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                Overview of your store performance
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <select
                                value={selectedStore}
                                onChange={(e) => setSelectedStore(e.target.value)}
                                className="input"
                                style={{
                                    minWidth: '220px',
                                    color: '#E4ECF5',
                                    fontWeight: '600',
                                    background: 'rgba(4, 9, 22, 0.7)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
                                    padding: '0.65rem 1.2rem',
                                    borderRadius: '0.75rem'
                                }}
                            >
                                <option value="all">All Stores</option>
                                {stores.map(store => (
                                    <option key={store.id} value={store.id}>
                                        {store.storeName || store.name}
                                    </option>
                                ))}
                            </select>
                            <button className="btn btn-primary" onClick={handleSync} style={{ whiteSpace: 'nowrap' }}>
                                Sync
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '2.5rem' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1.25rem',
                        marginBottom: '2rem'
                    }}>
                        {kpis.map((kpi, index) => {
                            const Icon = kpi.icon;
                            return (
                                <div key={index} className="card" style={{
                                    background: 'linear-gradient(140deg, rgba(20, 32, 52, 0.95), rgba(8, 14, 26, 0.95))',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderLeft: `4px solid ${kpi.color}`,
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-6px)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                    }}>
                                    {/* Icon Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: kpi.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Icon size={24} color={kpi.color} strokeWidth={2.5} />
                                    </div>

                                    {/* Content */}
                                    <div style={{ paddingRight: '3.5rem' }}>
                                        <p style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            color: 'var(--warm-gray)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            margin: '0 0 0.75rem 0'
                                        }}>
                                            {kpi.label}
                                        </p>
                                        <p style={{
                                            fontSize: '2rem',
                                            fontWeight: '700',
                                            color: kpi.color,
                                            margin: '0 0 0.5rem 0',
                                            lineHeight: '1'
                                        }}>
                                            {formatValue(kpi.value, kpi.format)}
                                        </p>
                                        {kpi.subtext && (
                                            <p style={{
                                                fontSize: '0.8rem',
                                                color: 'var(--warm-gray)',
                                                margin: 0,
                                                fontWeight: '500'
                                            }}>
                                                {kpi.subtext}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal)', margin: 0 }}>
                                        Revenue Analytics
                                    </h2>
                                    <p style={{ color: 'var(--warm-gray)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                                        Sales performance over time
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                                        {dateRangeOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleDateRangeChange(option.value)}
                                                style={{
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: 'none',
                                                    background: dateRange === option.value ? 'var(--sage)' : 'transparent',
                                                    color: dateRange === option.value ? 'white' : 'var(--warm-gray)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                                        {['area', 'line', 'bar'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setChartType(type)}
                                                style={{
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: 'none',
                                                    background: chartType === type ? 'var(--terracotta)' : 'transparent',
                                                    color: chartType === type ? 'white' : 'var(--warm-gray)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {showCustomPicker && (
                                <div style={{
                                    marginBottom: '1rem',
                                    padding: '1rem',
                                    background: 'var(--bg-surface)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    gap: '0.75rem',
                                    alignItems: 'end',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label className="label" style={{ marginBottom: '0.25rem' }}>Start Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={customDates.start}
                                            onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                                            style={{ padding: '0.5rem' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label className="label" style={{ marginBottom: '0.25rem' }}>End Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={customDates.end}
                                            onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                                            style={{ padding: '0.5rem' }}
                                        />
                                    </div>
                                    <button
                                        onClick={applyCustomDates}
                                        className="btn btn-primary"
                                        style={{ padding: '0.5rem 1.5rem' }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            )}

                            <div style={{ position: 'relative' }}>
                                {refreshing && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10,
                                        borderRadius: 'var(--radius-md)'
                                    }}>
                                        <div className="spinner"></div>
                                    </div>
                                )}
                                <ResponsiveContainer width="100%" height={300}>
                                    {chartType === 'area' && (
                                        <AreaChart data={dashboardData?.revenueData || []}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--terracotta)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--terracotta)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                                            <XAxis dataKey="date" stroke="var(--warm-gray)" style={{ fontSize: '0.75rem' }} />
                                            <YAxis stroke="var(--warm-gray)" style={{ fontSize: '0.75rem' }} />
                                            <Tooltip
                                                contentStyle={tooltipStyles}
                                                labelStyle={tooltipLabelStyle}
                                                itemStyle={tooltipItemStyle}
                                                formatter={(value) => [formatValue(value, 'currency'), 'Revenue']}
                                                labelFormatter={(label) => label}
                                            />
                                            <Area type="monotone" dataKey="revenue" stroke="var(--terracotta)" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                                        </AreaChart>
                                    )}
                                    {chartType === 'line' && (
                                        <LineChart data={dashboardData?.revenueData || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                                            <XAxis dataKey="date" stroke="var(--warm-gray)" style={{ fontSize: '0.75rem' }} />
                                            <YAxis stroke="var(--warm-gray)" style={{ fontSize: '0.75rem' }} />
                                            <Tooltip
                                                contentStyle={tooltipStyles}
                                                labelStyle={tooltipLabelStyle}
                                                itemStyle={tooltipItemStyle}
                                                formatter={(value) => [formatValue(value, 'currency'), 'Revenue']}
                                                labelFormatter={(label) => label}
                                            />
                                            <Line type="monotone" dataKey="revenue" stroke="var(--terracotta)" strokeWidth={3} dot={{ fill: 'var(--terracotta)', r: 4 }} />
                                        </LineChart>
                                    )}
                                    {chartType === 'bar' && (
                                        <BarChart data={dashboardData?.revenueData || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--light-gray)" />
                                            <XAxis dataKey="date" stroke="var(--warm-gray)" style={{ fontSize: '0.75rem' }} />
                                            <YAxis stroke="var(--warm-gray)" style={{ fontSize: '0.75rem' }} />
                                            <Tooltip
                                                contentStyle={tooltipStyles}
                                                labelStyle={tooltipLabelStyle}
                                                itemStyle={tooltipItemStyle}
                                                formatter={(value) => [formatValue(value, 'currency'), 'Revenue']}
                                                labelFormatter={(label) => label}
                                            />
                                            <Bar dataKey="revenue" fill="var(--terracotta)" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal)', marginBottom: '1.5rem' }}>
                                Top Products
                            </h3>
                            {(dashboardData?.topProducts || []).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {dashboardData.topProducts.map((product, index) => (
                                        <div key={index}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--charcoal)', fontWeight: '500' }}>
                                                    {product.name}
                                                </span>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--terracotta)', fontWeight: '600' }}>
                                                    {formatValue(product.sales, 'currency')}
                                                </span>
                                            </div>
                                            <div style={{ background: 'var(--bg-surface)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{
                                                    background: COLORS[index % COLORS.length],
                                                    height: '100%',
                                                    width: `${(product.sales / dashboardData.topProducts[0].sales) * 100}%`,
                                                    transition: 'width 0.5s ease'
                                                }}></div>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--warm-gray)', marginTop: '0.25rem' }}>
                                                {product.quantity} units sold
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--warm-gray)', padding: '2rem' }}>
                                    No product data available
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--charcoal)', margin: 0 }}>
                                    Inventory Insights
                                </h3>
                                <p style={{ color: 'var(--warm-gray)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                                    Products needing attention
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '1rem',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    <Package size={18} color="#EF4444" />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#EF4444' }}>
                                        Out of Stock ({(dashboardData?.outOfStockProducts || []).length})
                                    </span>
                                </div>
                                {(dashboardData?.outOfStockProducts || []).length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                                        {dashboardData.outOfStockProducts.map((product, index) => (
                                            <div key={index} style={{
                                                padding: '0.75rem',
                                                background: 'var(--bg-surface)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)' }}>
                                                        {product.name}
                                                    </p>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        color: '#EF4444',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: 'var(--radius-sm)'
                                                    }}>
                                                        0 STOCK
                                                    </span>
                                                </div>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--warm-gray)' }}>
                                                    {product.type} - {product.variants?.length || 0} variant(s)
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', color: 'var(--warm-gray)', padding: '2rem', fontSize: '0.875rem' }}>
                                        No out-of-stock products
                                    </p>
                                )}
                            </div>

                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(217, 119, 6, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '1rem',
                                    border: '1px solid rgba(217, 119, 6, 0.2)'
                                }}>
                                    <AlertTriangle size={18} color="#D97706" />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#D97706' }}>
                                        Slow-Moving Items
                                    </span>
                                </div>
                                {(dashboardData?.topProducts || []).length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {(dashboardData?.topProducts || []).slice(-3).reverse().map((product, index) => (
                                            <div key={index} style={{
                                                padding: '0.75rem',
                                                background: 'var(--bg-surface)',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: 'var(--charcoal)' }}>
                                                        {product.name}
                                                    </p>
                                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--warm-gray)' }}>
                                                        Only {product.quantity} units sold
                                                    </p>
                                                </div>
                                                <div style={{
                                                    padding: '0.25rem 0.75rem',
                                                    background: 'rgba(217, 119, 6, 0.1)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#D97706'
                                                }}>
                                                    Consider Sale
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', color: 'var(--warm-gray)', padding: '2rem', fontSize: '0.875rem' }}>
                                        No slow-moving products detected
                                    </p>
                                )}
                            </div>

                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '1rem',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    <TrendingDown size={18} color="#EF4444" />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#EF4444' }}>
                                        Low-Performing Products
                                    </span>
                                </div>
                                {(dashboardData?.topProducts || []).length > 2 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {(dashboardData?.topProducts || []).slice(-3).reverse().map((product, index) => {
                                            const avgSalesPerDay = product.quantity / 30;
                                            const salesRate = avgSalesPerDay < 0.5 ? 'Very Low' : avgSalesPerDay < 1 ? 'Low' : 'Moderate';

                                            return (
                                                <div key={index} style={{
                                                    padding: '1rem',
                                                    background: 'var(--bg-surface)',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--light-gray)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)' }}>
                                                            {product.name}
                                                        </p>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: '600',
                                                            color: '#EF4444',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: 'var(--radius-sm)'
                                                        }}>
                                                            {salesRate} Sales
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>
                                                                Total Sales
                                                            </p>
                                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)' }}>
                                                                {formatValue(product.sales, 'currency')}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>
                                                                Units Sold
                                                            </p>
                                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)' }}>
                                                                {product.quantity} units
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>
                                                                Avg per Day
                                                            </p>
                                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)' }}>
                                                                {avgSalesPerDay.toFixed(2)} units/day
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>
                                                                Revenue Share
                                                            </p>
                                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)' }}>
                                                                {((product.sales / dashboardData.topProducts[0].sales) * 100).toFixed(1)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', color: 'var(--warm-gray)', padding: '2rem', fontSize: '0.875rem' }}>
                                        Insufficient data for analysis
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--charcoal)', marginBottom: '1rem' }}>
                                Recent Orders
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--light-gray)' }}>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>Order</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>Customer</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dashboardData?.recentOrders || []).map((order, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--charcoal)', fontWeight: '500' }}>
                                                    #{order.orderId}
                                                </td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--warm-gray)' }}>
                                                    {order.customerName}
                                                </td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--charcoal)', fontWeight: '600', textAlign: 'right' }}>
                                                    {formatValue(order.amount, 'currency')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--charcoal)', marginBottom: '1rem' }}>
                                Top Customers
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {(dashboardData?.topCustomers || []).map((customer, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.75rem',
                                        background: 'var(--bg-surface)',
                                        borderRadius: 'var(--radius-md)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--terracotta), var(--sage))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: '600',
                                            fontSize: '1rem'
                                        }}>
                                            {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'var(--charcoal)' }}>
                                                {customer.name}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--warm-gray)' }}>
                                                {customer.email}
                                            </p>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'var(--terracotta)' }}>
                                            {formatValue(customer.totalSpent, 'currency')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--charcoal)', margin: 0 }}>
                                        Customer Revenue Concentration
                                    </h3>
                                    <p style={{ color: 'var(--warm-gray)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                                        Understand dependency on high-value customers
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--warm-gray)' }}>Top 5 Contribution</p>
                                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--terracotta)' }}>
                                        {topCustomerShare !== null ? `${topCustomerShare.toFixed(1)}%` : '—'}
                                    </p>
                                </div>
                            </div>
                            {customerShareData.length > 0 ? (
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 250px', minWidth: '250px', height: '260px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={customerShareData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                >
                                                    {customerShareData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => formatValue(value, 'currency')}
                                                    contentStyle={{
                                                        background: 'white',
                                                        border: '1px solid var(--light-gray)',
                                                        borderRadius: 'var(--radius-md)'
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ flex: '1 1 200px', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {customerShareData.map((entry, index) => (
                                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-surface)', paddingBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></span>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--charcoal)', fontWeight: '600' }}>{entry.name}</p>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: 'var(--terracotta)' }}>
                                                    {formatValue(entry.value, 'currency')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--warm-gray)', padding: '2rem' }}>
                                    Insufficient customer data
                                </p>
                            )}
                        </div>

                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--charcoal)', margin: 0 }}>
                                        Checkout Conversion Funnel
                                    </h3>
                                    <p style={{ color: 'var(--warm-gray)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                                        Completed vs lost checkout sessions
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--warm-gray)' }}>Completed</p>
                                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#34CFC2' }}>
                                        {totalCheckouts > 0 ? `${checkoutConversion.toFixed(1)}%` : '—'}
                                    </p>
                                </div>
                            </div>
                            {totalCheckouts > 0 ? (
                                <>
                                    <div
                                        style={{ position: 'relative', margin: '1rem 0 2rem', padding: '0.5rem 0' }}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                    >
                                        <div style={{
                                            width: '100%',
                                            height: '78px',
                                            borderRadius: '999px',
                                            overflow: 'hidden',
                        display: 'flex',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            background: 'linear-gradient(120deg, rgba(5, 12, 26, 0.95), rgba(15, 24, 45, 0.95))',
                                            boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.45)'
                                        }}>
                                            <div
                                                onMouseEnter={() => setHoveredSegment('completed')}
                                                style={{
                                                width: `${Math.max(checkoutConversion, 0)}%`,
                                                background: 'linear-gradient(120deg, #0FB5A8, #34CFC2)',
                                                display: 'flex'
                                            }}></div>
                                            <div
                                                onMouseEnter={() => setHoveredSegment('dropoff')}
                                                style={{
                                                width: `${Math.max(dropoffPercent, 0)}%`,
                                                background: 'linear-gradient(120deg, #F87171, #FB7185)',
                                                display: 'flex'
                                            }}></div>
                                        </div>
                                        {hoveredSegment === 'completed' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-36px',
                                                left: `${completedLabelPosition}%`,
                                                transform: 'translateX(-50%)',
                                                background: 'rgba(2, 20, 31, 0.86)',
                                                borderRadius: '999px',
                                                padding: '0.3rem 1.15rem',
                                                color: '#E6F9F6',
                                                fontSize: '0.9rem',
                                                fontWeight: 700,
                                                boxShadow: '0 8px 18px rgba(2, 20, 31, 0.45)',
                                                pointerEvents: 'none'
                                            }}>
                                                {`Completed ${checkoutConversion.toFixed(1)}%`}
                                            </div>
                                        )}
                                        {hoveredSegment === 'dropoff' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-36px',
                                                left: `${dropoffLabelPosition}%`,
                                                transform: 'translateX(-50%)',
                                                background: 'rgba(40, 6, 6, 0.88)',
                                                borderRadius: '999px',
                                                padding: '0.3rem 1.15rem',
                                                color: '#FFE6E8',
                                                fontSize: '0.9rem',
                                                fontWeight: 700,
                                                boxShadow: '0 8px 18px rgba(40, 6, 6, 0.4)',
                                                pointerEvents: 'none'
                                            }}>
                                                {`Drop-off ${dropoffPercent.toFixed(1)}%`}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        marginTop: '1.25rem',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                        gap: '1.25rem'
                                    }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--warm-gray)', letterSpacing: '0.12em' }}>Checkout Attempts</p>
                                            <p style={{ margin: '0.35rem 0 0', fontSize: '1.35rem', fontWeight: 700, color: '#F7FBFF' }}>
                                                {totalCheckouts.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--warm-gray)', letterSpacing: '0.12em' }}>Completed Orders</p>
                                            <p style={{ margin: '0.35rem 0 0', fontSize: '1.35rem', fontWeight: 700, color: '#34CFC2' }}>
                                                {(dashboardData?.totalOrders || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--warm-gray)', letterSpacing: '0.12em' }}>Abandoned Carts</p>
                                            <p style={{ margin: '0.35rem 0 0', fontSize: '1.35rem', fontWeight: 700, color: '#F87171' }}>
                                                {(dashboardData?.abandonedCarts || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--warm-gray)', padding: '2rem' }}>
                                    Not enough checkout data yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
