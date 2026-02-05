
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { DynamicBreadcrumbs } from './src/components/common/DynamicBreadcrumbs';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/i18n/i18n'; // Assuming standard i18n setup

// Mock generic environment for smoke test
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);

try {
    root.render(
        <I18nextProvider i18n={i18n}>
            <MemoryRouter initialEntries={['/dashboard/hr/employees']}>
                <DynamicBreadcrumbs />
            </MemoryRouter>
        </I18nextProvider>
    );
    console.log('Breadcrumbs render smoke test passed');
} catch (e) {
    console.error('Breadcrumbs render smoke test failed', e);
}

