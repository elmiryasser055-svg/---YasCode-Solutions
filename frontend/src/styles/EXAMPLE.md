// Example: How to use globals.css classes in your components
//
// This file shows BEFORE vs AFTER for common UI patterns.
// Copy the "AFTER" patterns into your components.

/* ============================================================
   BEFORE (old style - plain Tailwind)
   ============================================================ */

// Card
<div className="rounded-md border p-4 bg-white shadow-sm">
  <h3>Title</h3>
  <p>Content...</p>
</div>

// Button primary
<button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
  Click me
</button>

// Button secondary
<button className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-50">
  Cancel
</button>

// Input
<input className="w-full rounded border p-2" placeholder="Type..." />

// Table row hover
<tr className="hover:bg-gray-50">

/* ============================================================
   AFTER (new style - globals.css components)
   ============================================================ */

// Card with animation
<div className="yc-card animate-fade-in-up delay-100">
  <h3 className="text-lg font-semibold text-gray-800">Title</h3>
  <p className="text-sm text-gray-500">Content...</p>
</div>

// Button primary (gradient + shadow + hover lift)
<button className="yc-btn-primary">
  <span>💾</span>
  <span>Click me</span>
</button>

// Button secondary
<button className="yc-btn-secondary">
  <span>✕</span>
  <span>Cancel</span>
</button>

// Button danger
<button className="yc-btn-danger">
  <span>🗑</span>
  <span>Delete</span>
</button>

// Button success
<button className="yc-btn-success">
  <span>✓</span>
  <span>Confirm</span>
</button>

// Input with focus glow
<input className="yc-input" placeholder="Type..." />

// Badge
<span className="yc-badge yc-badge-blue">New</span>
<span className="yc-badge yc-badge-green">In Stock</span>
<span className="yc-badge yc-badge-red">Low Stock</span>
<span className="yc-badge yc-badge-amber">Warning</span>

// Sidebar navigation
<nav className="w-56 space-y-1 p-3">
  <button className="yc-sidebar-item active">
    <span>🏠</span>
    <span>Home</span>
  </button>
  <button className="yc-sidebar-item">
    <span>📦</span>
    <span>Products</span>
  </button>
</nav>

// Divider
<div className="yc-divider" />

// Loading spinner
<div className="animate-spin-slow h-5 w-5 rounded-full border-2 border-gray-300 border-t-blue-600" />

// Error shake animation
<div className="animate-shake text-red-600">
  Invalid input!
</div>

// Floating icon
<div className="animate-float text-4xl">🎉</div>

// Glow pulse on important button
<button className="yc-btn-primary animate-glow-pulse">
  Important Action
</button>
