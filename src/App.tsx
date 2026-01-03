import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Marking from "./pages/Marking";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/marking" element={<Marking />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
