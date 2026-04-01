import { AppStoreProvider } from "./hooks/useAppStore";
import { UiProvider } from "./hooks/useUi";
import { AppRouter } from "./routes/AppRouter";

function App() {
  return (
    <UiProvider>
      <AppStoreProvider>
        <AppRouter />
      </AppStoreProvider>
    </UiProvider>
  );
}

export default App;
