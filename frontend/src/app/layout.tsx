'use client';

import './globals.css';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Provider store={store}>
          <div className="min-h-screen flex">
            <Sidebar />
            <div className="flex-1 flex flex-col ml-64">
              <Header />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </Provider>
      </body>
    </html>
  );
}
