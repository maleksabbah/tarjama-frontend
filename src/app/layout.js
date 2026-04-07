import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'Tarjama — Arabic ASR Platform',
  description: 'Upload Arabic video, get subtitles powered by fine-tuned Whisper',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
