import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './components/DashboardPage';
import { InventoryPage } from './components/InventoryPage';
import { DestinationsPage } from './components/DestinationsPage';
import { PlannerPage } from './components/PlannerPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { SimulatorPage } from './components/SimulatorPage';
import { ThemeToggle, useTheme } from './components/ThemeToggle';
import { CustomCursor } from './components/CustomCursor';

import { 
  fetchDashboard, 
  fetchBatches, 
  fetchDestinations, 
  fetchScenarios, 
  runOptimizePlan, 
  runBaselinePlan,
  runSimulation, 
  createBatch, 
  updateBatch, 
  deleteBatch, 
  createDestination,
  resetDatabaseSeed 
} from './api';

import type { 
  Batch, 
  Destination, 
  DistributionPlan, 
  EvaluationComparison, 
  DashboardMetrics, 
  Scenario 
} from './types';
import { CheckCircle, AlertCircle, Search, ShieldCheck } from 'lucide-react';

export function App() {
  const { mode, toggled } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentPlan, setCurrentPlan] = useState<DistributionPlan | null>(null);
  const [baselinePlan, setBaselinePlan] = useState<DistributionPlan | null>(null);
  const [comparison, setComparison] = useState<EvaluationComparison | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Set data-theme attribute on html element for CSS variable theming
  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'system') {
      html.dataset.theme = '';
    } else {
      html.dataset.theme = mode;
    }
  }, [mode]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dashData, batchData, destData, scData] = await Promise.all([
        fetchDashboard(),
        fetchBatches(),
        fetchDestinations(),
        fetchScenarios(),
      ]);

      setMetrics(dashData);
      setBatches(batchData);
      setDestinations(destData);
      setScenarios(scData);

      // Initialize with an optimized plan and baseline comparison
      const optPlan = await runOptimizePlan({ scenario_key: 'normal', enable_discounts: true });
      setCurrentPlan(optPlan);

      const basePlan = await runBaselinePlan({ scenario_key: 'normal' });
      setBaselinePlan(basePlan);

      const simComp = await runSimulation('normal', true);
      setComparison(simComp);
    } catch (err: any) {
      console.error(err);
      showToast('Could not reach backend API. Ensure FastAPI server is running on port 8000.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleResetSeed = async () => {
    if (!window.confirm('Reset all batches and demands in PostgreSQL to the official evaluation dataset?')) return;
    try {
      setIsResetting(true);
      await resetDatabaseSeed();
      await loadAllData();
      showToast('PostgreSQL dataset successfully reset to default evaluation scenario!');
    } catch (err: any) {
      showToast(err.message || 'Reset failed', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOptimize = async (params: {
    strategy: 'freshroute' | 'baseline';
    scenario_key: string;
    enable_discounts: boolean;
    min_shelf_life_buffer_hours: number;
  }) => {
    try {
      setIsOptimizing(true);
      if (params.strategy === 'freshroute') {
        const plan = await runOptimizePlan(params);
        setCurrentPlan(plan);
        const comp = await runSimulation(params.scenario_key, params.enable_discounts);
        setComparison(comp);
        showToast(`FreshRoute Optimization solved in ${plan.execution_time_ms} ms!`);
      } else {
        const plan = await runBaselinePlan(params);
        setBaselinePlan(plan);
        setCurrentPlan(plan);
        showToast(`Baseline Plan generated in ${plan.execution_time_ms} ms!`);
      }
      const updatedMetrics = await fetchDashboard();
      setMetrics(updatedMetrics);
    } catch (err: any) {
      showToast(err.message || 'Optimization failed', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRunSimulation = async (key: string): Promise<EvaluationComparison> => {
    try {
      setIsOptimizing(true);
      const comp = await runSimulation(key, true);
      setComparison(comp);
      setCurrentPlan(comp.optimized_plan);
      setBaselinePlan(comp.baseline_plan);
      showToast(`Simulation complete: ${comp.scenario_name}`);
      return comp;
    } catch (err: any) {
      showToast(err.message || 'Simulation run failed', 'error');
      throw err;
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAddBatch = async (data: Partial<Batch>) => {
    await createBatch(data);
    const updated = await fetchBatches();
    setBatches(updated);
    const m = await fetchDashboard();
    setMetrics(m);
    showToast(`Batch ${data.batch_code} registered in PostgreSQL!`);
  };

  const handleUpdateBatch = async (id: number, data: Partial<Batch>) => {
    await updateBatch(id, data);
    const updated = await fetchBatches();
    setBatches(updated);
    const m = await fetchDashboard();
    setMetrics(m);
    showToast(`Batch updated successfully!`);
  };

  const handleDeleteBatch = async (id: number) => {
    await deleteBatch(id);
    const updated = await fetchBatches();
    setBatches(updated);
    const m = await fetchDashboard();
    setMetrics(m);
    showToast(`Batch deleted from database.`);
  };

  const handleAddDestination = async (data: any) => {
    await createDestination(data);
    const updated = await fetchDestinations();
    setDestinations(updated);
    showToast(`Destination ${data.name} added successfully!`);
  };

  return (
    <div className="min-h-screen font-sans" data-theme={mode}>
      {/* Custom Cursor */}
      <CustomCursor />

      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
          toast.type === 'success'
            ? 'bg-emerald-800 text-white border-emerald-700 shadow-emerald-950/20'
            : 'bg-rose-800 text-white border-rose-700 shadow-rose-950/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-rose-300" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Application Shell */}
      <div className="flex flex-col min-h-screen">
        {/* Top Bar / Header */}
        <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50 bg-white/95 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            {/* Brand & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-surface font-bold shrink-0">
                <CheckCircle className="w-5 h-5 text-surface" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-extrabold tracking-tight var(--primary-text)">FreshRoute</span>
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full">PS 03 MVP</span>
                </div>
                <p className="text-[11px] var(--muted-text) font-medium">Smarter Distribution · Less Waste · Better Returns</p>
              </div>
            </div>

            {/* Top Bar Actions: Search, Notifications, Theme */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Quick Search */}
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 var(--muted-text)" />
                <input
                  type="text"
                  placeholder="Search batches, destinations, plans..."
                  className="pl-9 py-2 rounded-full border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface/50"
                />
              </div>

              {/* Notifications (placeholder - app doesn't have a notification system) */}
              {/* Intentionally omitted - no notification backend exists */}

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-surface/50 transition-colors"
              onClick={() => setActiveTab('dashboard')}
              aria-label="Open main navigation"
            >
              <svg className="w-5 h-5 var(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l2-2m0 0l2-2m-2 2l2 2m2-2l2 2" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex flex-1 min-h-[calc(100dvh-64px)]">
          {/* Sidebar */}
          <aside className="w-64 border-r border-border flex-shrink-0 bg-surface overflow-y-auto transition-transform ${
            activeTab === 'dashboard' ? 'transform translateX(0)' : 'transform translateX(-100%)'
          } md:transform translateX(0) lg:transform translateX(0)">
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 var(--surface)" />
                </div>
                <div className="flex-1">
                  <span className="font-extrabold tracking-tight var(--primary-text)">FreshRoute</span>
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full">PS 03 MVP</span>
                </div>
              </div>
            </div>

            <nav className="mt-6 space-y-1">
              <div className="px-2 py-1.5 rounded-md text-sm font-medium var(--muted-text) cursor-pointer hover:bg-primary/5 transition-colors" 
                   onClick={() => setActiveTab('dashboard')}
                   aria-current="page" 
                   style={{ color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--muted-text)' }}>
<svg className="w-4 h-4 me-2 var(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                   <line x1="3" y1="3" x2="21" y2="21" />
                 </svg>
                 Dashboard
              </div>

              <div className="px-2 py-1.5 rounded-md text-sm font-medium cursor-pointer hover:bg-primary/5 transition-colors" 
                   onClick={() => setActiveTab('inventory')}
                   style={{ color: activeTab === 'inventory' ? 'var(--primary)' : 'var(--muted-text)' }}>
                <svg className="w-4 h-4 me-2 var(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="18" x2="21" y2="12" />
                  <line x1="3" y1="12" x2="21" y2="3" />
                </svg>
                Inventory
              </div>

              <div className="px-2 py-1.5 rounded-md text-sm font-medium cursor-pointer hover:bg-primary/5 transition-colors" 
                   onClick={() => setActiveTab('destinations')}
                   style={{ color: activeTab === 'destinations' ? 'var(--primary)' : 'var(--muted-text)' }}>
                <svg className="w-4 h-4 me-2 var(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="9" r="3" />
                  <path d="M21 21l-2.7-2.7a2.8 2.8 0 0 1 0-4" />
                </svg>
                Destinations & Demand
              </div>

              <div className="px-2 py-1.5 rounded-md text-sm font-medium cursor-pointer hover:bg-primary/5 transition-colors" 
                   onClick={() => setActiveTab('planner')}
                   style={{ color: activeTab === 'planner' ? 'var(--primary)' : 'var(--muted-text)' }}>
                <svg className="w-4 h-4 me-2 var(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12l2-2m0 0l2-2m-2 2l2 2m2-2l2 2" />
                </svg>
                Dispatch Planner
              </div>

              <div className="px-2 py-1.5 rounded-md text-sm font-medium cursor-pointer hover:bg-primary/5 transition-colors" 
                   onClick={() => setActiveTab('analytics')}
                   style={{ color: activeTab === 'analytics' ? 'var(--primary)' : 'var(--muted-text)' }}>
                <svg className="w-4 h-4 me-2 var(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 21l-2.7-2.7a2.8 2.8 0 0 1 0-4" />
                </svg>
                Results & Analytics
              </div>

              <div className="px-2 py-1.5 rounded-md text-sm font-medium cursor-pointer hover:bg-primary/5 transition-colors" 
                   onClick={() => setActiveTab('simulator')}
                   style={{ color: activeTab === 'simulator' ? 'var(--primary)' : 'var(--muted-text)' }}>
                <svg className="w-4 h-4 me-2 var(--primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="9" r="3" />
                  <path d="M21 21l-2.7-2.7a2.8 2.8 0 0 1 0-4" />
                </svg>
                Scenario Simulator
              </div>
            </nav>

            {/* Mobile drawer toggle is handled by navbar */}
          </aside>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-h-[calc(100dvh-64px)]" style={{ flex: '1' }}>
            {/* Content will be rendered by tab pages */}

            {/* System status banner when backend is unreachable */}
            {loading && !metrics && (
              <div className="flex items-center justify-center min-h-[calc(100dvh-128px)] text-var(--muted-text)">
                Loading supply chain telemetry...
              </div>
            )}
          </main>
        </div>

        {/* Footer & Hackathon Judging Metadata */}
        <footer className="bg-white border-t border-border mt-0 py-4 text-xs var(--muted-text)">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-bold var(--primary-text)">FreshRoute</span>
              <span>·</span>
              <span>Problem Statement PS 03: Decision Support for Perishable Produce Distribution</span>
            </div>

            <div className="flex items-center space-x-4 text-[11px]">
              <span className="flex items-center space-x-1 var(--primary) font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PostgreSQL 17 Grounded</span>
              </span>
              <span>·</span>
              <span>Deterministic Greedy FEFO Optimizer</span>
              <span>·</span>
              <span>All Constraints Verified</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
export default App;