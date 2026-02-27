import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Kitchen from "./pages/Kitchen.jsx";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/kitchen", element: <Kitchen /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
