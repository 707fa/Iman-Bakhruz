import { AppStoreProvider } from "./hooks/useAppStore";
import { ToastProvider } from "./hooks/useToast";
import { UiProvider } from "./hooks/useUi";
import { AppRouter } from "./routes/AppRouter";

function App() {
  return (
    <UiProvider>
      <ToastProvider>
        <AppStoreProvider>
          <AppRouter />
        </AppStoreProvider>
      </ToastProvider>
    </UiProvider>
  );
}

export default App;
