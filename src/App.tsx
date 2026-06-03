import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppStoreProvider } from "./hooks/useAppStore";
import { ToastProvider } from "./hooks/useToast";
import { UiProvider } from "./hooks/useUi";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <ErrorBoundary>
      <UiProvider>
        <ToastProvider>
          <AppStoreProvider>
            {/* Temporary: render the 404 page for all visitors. Remove when ready. */}
            <NotFoundPage />
          </AppStoreProvider>
        </ToastProvider>
      </UiProvider>
    </ErrorBoundary>
  );
}

export default App;
