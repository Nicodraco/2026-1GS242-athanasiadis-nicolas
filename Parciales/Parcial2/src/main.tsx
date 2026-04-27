import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { getClerkPublishableKey, isClerkConfigured } from "@/lib/env";
import "@/styles.css";

const publishableKey = getClerkPublishableKey();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isClerkConfigured() && publishableKey ? (
      <ClerkProvider publishableKey={publishableKey}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
);
