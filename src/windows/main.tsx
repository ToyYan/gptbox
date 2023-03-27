import { createRoot } from 'react-dom/client';
import '@/styles/globals.css';
import Main from '@/components/Main';
const element = document.getElementById('root');
const root = createRoot(element as HTMLElement);
import '../i18n';

root.render(<Main serverSideApiKeyIsSet={false}></Main>);
electronAPI.ready();