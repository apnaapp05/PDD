import AppLayout from "./layouts/AppLayout";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default App;
