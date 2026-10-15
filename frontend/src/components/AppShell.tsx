import React, { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { 
  Sprout, 
  LayoutDashboard, 
  Boxes, 
  MapPin, 
  Route, 
  BarChart3, 
  Sliders, 
  RotateCcw, 
  Zap, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Database
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Tooltip } from './Tooltip';

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetSeed: () => void;
  isResetting: boolean;
  onQuickOptimize: () => void;
  isOptimizing: boolean;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  batchesCount: number;
  atRiskCount: number;
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  onResetSeed,
  isResetting,
  onQuickOptimize,
  isOptimizing,
  loading,
  searchQuery,
  setSearchQuery,
  batchesCount,
  atRiskCount,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // ---- Sliding active indicator for sidebar navigation ----
  // Measured in a layout effect so the very first paint already has the
  // indicator on the active item (no slide-in-from-top under StrictMode),
  // while every later position change transitions because the style
  // update lands between paints.
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const item = itemRefs.current[activeTab];
    if (!nav || !item) return;
    setIndicator({ top: item.offsetTop, height: item.offsetHeight });
  }, [activeTab, sidebarCollapsed, mobileDrawerOpen]);

  // Reset content scroll position when switching pages
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Restore focus to the menu trigger when the mobile drawer closes
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerWasOpen = useRef(false);
  useEffect(() => {
    if (drawerWasOpen.current && !mobileDrawerOpen) {
      menuBtnRef.current?.focus();
    }
    drawerWasOpen.current = mobileDrawerOpen;
  }, [mobileDrawerOpen]);

  // Close mobile drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen]);

  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      badge: atRiskCount > 0 ? `${atRiskCount} alert` : null,
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: Boxes,
      badge: batchesCount > 0 ? `${batchesCount}` : null,
      badgeColor: 'bg-primary/10 text-primary border-primary/20'
    },
    { 
      id: 'destinations', 
      label: 'Destinations & Demand', 
      icon: MapPin,
      badge: null,
      badgeColor: ''
    },
    { 
      id: 'planner', 
      label: 'Dispatch Planner', 
      icon: Route,
      badge: 'FEFO',
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    { 
      id: 'analytics', 
      label: 'Results & Analytics', 
      icon: BarChart3,
      badge: null,
      badgeColor: ''
    },
    { 
      id: 'simulator', 
      label: 'Scenario Simulator', 
      icon: Sliders,
      badge: '5 Tests',
      badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    },
  ];

  const currentTabLabel = navItems.find(item => item.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-primary-text font-sans">
      {/* Mobile Drawer Backdrop — always mounted so it can fade out in
          step with the drawer instead of vanishing instantly */}
      <div
        aria-hidden={!mobileDrawerOpen}
        onClick={() => setMobileDrawerOpen(false)}
        className={`fr-backdrop fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden ${
          mobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar (Desktop + Mobile Slide-over) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-surface border-r border-border transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:static lg:translate-x-0
        ${mobileDrawerOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border select-none">
          <div 
            onClick={() => { setActiveTab('dashboard'); setMobileDrawerOpen(false); }}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div data-magnetic className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-105">
              <Sprout className="w-5 h-5 stroke-[2.4]" />
            </div>
            {(!sidebarCollapsed || mobileDrawerOpen) && (
              <div className="overflow-hidden">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base tracking-tight text-primary-text">Fresh<span className="text-primary">Route</span></span>
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">FreshRoute</span>
                </div>
                <p className="text-[11px] text-muted-text truncate font-medium">Produce Distribution Engine</p>
              </div>
            )}
          </div>

          {/* Close button for mobile */}
          <button 
            onClick={() => setMobileDrawerOpen(false)}
            className="btn-press p-1.5 text-muted-text hover:text-primary-text hover:bg-elevated rounded-lg lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav ref={navRef} className="relative flex-1 px-3 py-4 overflow-y-auto">
          <span
            aria-hidden="true"
            className="nav-indicator"
            style={
              indicator
                ? { height: `${indicator.height}px`, transform: `translateY(${indicator.top}px)` }
                : { display: 'none' }
            }
          />
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const descriptions: Record<string, string> = {
                dashboard: 'KPI health & alerts',
                inventory: 'Batches & hubs',
                destinations: 'APMC mandis & demand',
                planner: 'FEFO dispatch allocation',
                analytics: 'Economic benchmarking',
                simulator: 'Disruption shock tests',
              };

              return (
                <Tooltip
                  key={item.id}
                  text={descriptions[item.id] || item.label}
                  position={sidebarCollapsed && !mobileDrawerOpen ? 'right' : 'top'}
                  wrapperClassName="w-full block"
                >
                  <button
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`
                      btn-press w-full flex items-center rounded-xl px-3 py-2.5 text-xs font-medium transition-all group relative cursor-pointer
                      ${isActive 
                        ? 'bg-primary/10 text-primary font-semibold shadow-xs border border-primary/20' 
                        : 'text-secondary-text hover:text-primary-text hover:bg-elevated border border-transparent'}
                      ${sidebarCollapsed && !mobileDrawerOpen ? 'justify-center' : 'justify-between'}
                    `}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-all group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-text group-hover:text-primary'}`} />
                      {(!sidebarCollapsed || mobileDrawerOpen) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {(!sidebarCollapsed || mobileDrawerOpen) && item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border flex items-center justify-between">
          {(!sidebarCollapsed || mobileDrawerOpen) && (
            <Tooltip text="PostgreSQL 17 relational database connected & synchronized" position="right">
              <div className="flex items-center space-x-2 text-[11px] text-muted-text font-mono truncate cursor-help">
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate">PostgreSQL Grounded</span>
              </div>
            </Tooltip>
          )}
          <Tooltip text={sidebarCollapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"} position="right">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn-press hidden lg:flex p-1.5 rounded-lg text-muted-text hover:text-primary-text hover:bg-elevated ml-auto transition-colors cursor-pointer"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="relative flex-1 flex flex-col h-full overflow-hidden">
        {/* Optimization / reset / initial-load progress indicator */}
        {(loading || isOptimizing || isResetting) && (
          <div className="fr-progress" role="progressbar" aria-label="Engine running" />
        )}

        {/* Topbar Navigation */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-surface/90 backdrop-blur-md shrink-0 z-30">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              ref={menuBtnRef}
              onClick={() => setMobileDrawerOpen(true)}
              className="btn-press lg:hidden p-2 rounded-lg text-muted-text hover:text-primary-text hover:bg-elevated"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Title */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-primary">FreshRoute</span>
              <span className="text-muted-text">/</span>
              <span className="font-medium text-primary-text">{currentTabLabel}</span>
            </div>
          </div>

          {/* Search + Action Buttons */}
          {/* Search + Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Filter Search */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!searchQuery.trim()) return;
                const q = searchQuery.toLowerCase().trim();
                if (['mumbai', 'pune', 'surat', 'ahmedabad', 'goa', 'blr', 'bengaluru', 'mandi', 'yard', 'dest', 'depot'].some(k => q.includes(k))) {
                  setActiveTab('destinations');
                } else if (['tomato', 'mango', 'spinach', 'banana', 'onion', 'potato', 'apple', 'grapes', 'batch', 'inventory', 'stock', 'kg', 'b-'].some(k => q.includes(k))) {
                  setActiveTab('inventory');
                } else if (q.includes('plan') || q.includes('fefo') || q.includes('discount')) {
                  setActiveTab('planner');
                } else if (q.includes('sim') || q.includes('scenario') || q.includes('disrupt') || q.includes('heat') || q.includes('strike')) {
                  setActiveTab('simulator');
                } else if (q.includes('report') || q.includes('pdf') || q.includes('analytics') || q.includes('kpi') || q.includes('audit')) {
                  setActiveTab('analytics');
                } else {
                  setActiveTab('inventory');
                }
              }}
              className="relative hidden md:flex items-center space-x-1.5"
            >
              <div className="relative w-48 lg:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mandi, produce, plan..."
                  className="w-full pl-8 pr-7 py-2 text-xs bg-elevated/70 border border-border rounded-xl text-primary-text placeholder:text-muted-text focus:bg-surface focus:border-primary focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="btn-press absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-text hover:text-primary-text rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Tooltip text="Search platform">
                <button
                  type="submit"
                  className="btn-press flex items-center space-x-1 px-3 py-2 bg-elevated hover:bg-border/60 border border-border rounded-xl text-xs font-bold text-primary-text cursor-pointer transition-colors shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Search</span>
                </button>
              </Tooltip>
            </form>

            {/* Quick Optimize Action */}
            <Tooltip text="Run FEFO Optimizer">
              <button
                onClick={onQuickOptimize}
                disabled={isOptimizing}
                data-magnetic
                className="btn-press flex items-center space-x-1.5 px-3 py-2 bg-primary text-white dark:text-neutral-950 hover:bg-primary-hover font-bold text-xs rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <Zap className={`w-3.5 h-3.5 text-accent dark:text-neutral-950 ${isOptimizing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isOptimizing ? 'Solving...' : 'Optimize Plan'}</span>
              </button>
            </Tooltip>

            {/* Seed Reset for Judging */}
            <Tooltip text="Reset demo data">
              <button
                onClick={onResetSeed}
                disabled={isResetting}
                className="btn-press flex items-center space-x-1.5 px-2.5 py-2 text-xs font-semibold text-secondary-text hover:text-primary-text bg-elevated hover:bg-border/60 border border-border rounded-xl disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isResetting ? 'Resetting...' : 'Reset Data'}</span>
              </button>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip text="Toggle theme">
              <ThemeToggle />
            </Tooltip>
          </div>
        </header>

        {/* Scrollable Content Pane */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
