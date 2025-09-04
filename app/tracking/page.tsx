"use client";

import LiveMap from "@/components/LiveMap";
import "../home.css";

export default function TrackingPage() {
  return (
    <div className="home-container">
      <nav className="notch-navbar">
        <div className="notch-navbar-inner">
          <a className="brand-name" href="/">Sparrow</a>
          <div className="nav-links">
            <a className="nav-link" href="/">Home</a>
            <a className="nav-link active" href="/tracking">Tracking</a>
          </div>
        </div>
      </nav>

      <main className="content">
        <h1 className="page-title">Live Parcel Tracking</h1>
        <LiveMap />
      </main>
    </div>
  );
}
