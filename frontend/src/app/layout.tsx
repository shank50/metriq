import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

type RootLayoutProps = {
	children: ReactNode;
};

const toasterOptions = {
	position: 'top-right' as const,
	toastOptions: {
		style: {
			background: '#FFF9F0',
			color: '#3A3A3A',
			border: '1px solid #F5EFD8',
			boxShadow: '0 4px 6px -1px rgba(138, 116, 102, 0.1)'
		},
		success: {
			iconTheme: {
				primary: '#8B9D83',
				secondary: '#FFF9F0'
			}
		},
		error: {
			iconTheme: {
				primary: '#C4756F',
				secondary: '#FFF9F0'
			}
		}
	}
};

export default function RootLayout({ children }: RootLayoutProps) {
	return (
		<BrowserRouter>
			{children}
			<Toaster {...toasterOptions} />
		</BrowserRouter>
	);
}
