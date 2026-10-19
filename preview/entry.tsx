import { createRoot } from 'react-dom/client';
import MapIsland from '../src/components/MapIsland';

const root = document.getElementById('root');
if (root) createRoot(root).render(<MapIsland dataBase="./data/" />);
