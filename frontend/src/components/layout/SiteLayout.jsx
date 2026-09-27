import { Outlet } from "react-router-dom";

import Footer from "./Footer";
import Header from "./Header";

export default function SiteLayout() {
  return (
    <div className="site-shell">
      <div className="site-background" aria-hidden="true">
        <span className="site-orb site-orb--one" />
        <span className="site-orb site-orb--two" />
      </div>

      <Header />

      <div className="site-content">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
