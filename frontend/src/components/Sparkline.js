import { memo, useMemo, useId } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area } from 'recharts';

const defaultFormatter = (value) => {
	if (typeof value === 'number') {
		return value.toLocaleString('en-IN');
	}
	return value ?? '—';
};

const Sparkline = ({
	data = [],
	dataKey = 'value',
	label,
	value,
	formatValue = defaultFormatter,
	stroke = '#0FB5A8',
	fill,
	height = 72
}) => {
	const gradientId = `sparkline-${useId().replace(/:/g, '-')}`;

	const { percentage, directionIcon } = useMemo(() => {
		if (data.length < 2) {
			return { percentage: 0, directionIcon: null };
		}
		const first = Number(data[0]?.[dataKey] ?? 0);
		const last = Number(data[data.length - 1]?.[dataKey] ?? 0);
		const delta = first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;
		const clamped = Number.isFinite(delta) ? delta : 0;
		const icon = clamped === 0 ? null : clamped > 0 ? '▲' : '▼';
		return { percentage: clamped, directionIcon: icon };
	}, [data, dataKey]);

	return (
		<div style={{
			padding: '1rem',
			borderRadius: 'var(--radius-lg)',
			background: 'linear-gradient(135deg, rgba(10, 18, 33, 0.9), rgba(6, 12, 24, 0.9))',
			border: '1px solid rgba(255, 255, 255, 0.05)'
		}}>
			{(label || value !== undefined) && (
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
					<div>
						{label && (
							<p style={{
								margin: 0,
								fontSize: '0.75rem',
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								color: 'rgba(226, 232, 240, 0.6)'
							}}>
								{label}
							</p>
						)}
						{value !== undefined && (
							<p style={{
								margin: 0,
								fontSize: '1.5rem',
								fontWeight: 700,
								color: 'var(--charcoal)'
							}}>
								{formatValue(value)}
							</p>
						)}
					</div>
					{directionIcon && (
						<span style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '0.35rem',
							fontSize: '0.8rem',
							fontWeight: 600,
							color: directionIcon === '▲' ? '#0FB5A8' : '#F87171'
						}}>
							{directionIcon}
							{Math.abs(percentage).toFixed(1)}%
						</span>
					)}
				</div>
			)}

			<div style={{ width: '100%', height }}>
				{data.length > 0 ? (
					<ResponsiveContainer>
						<ComposedChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
							<defs>
								<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={stroke} stopOpacity={0.45} />
									<stop offset="95%" stopColor={stroke} stopOpacity={0} />
								</linearGradient>
							</defs>
							<Area
								type="monotone"
								dataKey={dataKey}
								stroke={stroke}
								fill={fill ?? `url(#${gradientId})`}
								fillOpacity={fill ? 0.65 : 0.9}
								strokeWidth={2}
								isAnimationActive={false}
							/>
							<Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} dot={false} isAnimationActive={false} />
						</ComposedChart>
					</ResponsiveContainer>
				) : (
					<div style={{
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'var(--warm-gray)',
						fontSize: '0.85rem'
					}}>
						No data
					</div>
				)}
			</div>
		</div>
	);
};

export default memo(Sparkline);
