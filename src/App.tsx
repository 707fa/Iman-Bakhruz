import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppStoreProvider } from "./hooks/useAppStore";
import { ToastProvider } from "./hooks/useToast";
import { UiProvider } from "./hooks/useUi";
import { AppRouter } from "./routes/AppRouter";

function App() {
  return (
    <ErrorBoundary>
      <UiProvider>
        <ToastProvider>
          <AppStoreProvider>
            <AppRouter />
          </AppStoreProvider>
        </ToastProvider>
      </UiProvider>
    </ErrorBoundary>
  );
}

export default App;
