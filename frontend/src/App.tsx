import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './components/DashboardPage';
import { InventoryPage } from './components/InventoryPage';
import { DestinationsPage } from './components/DestinationsPage';
import { PlannerPage } from './components/PlannerPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { SimulatorPage } from './components/SimulatorPage';
import { useTheme } from './components/ThemeToggle';
import { Cursor } from './components/Cursor';

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
  updateDestination,
  deleteDestination,
  createDemand,
  updateDemand,
  deleteDemand,
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
import { CheckCircle, AlertCircle } from 'lucide-react';

// Helper to resolve active tab from URL path or hash
function getTabFromUrl(): string {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  const target = path || hash;

  if (target === 'inventory') return 'inventory';
  if (target === 'destinations') return 'destinations';
  if (target === 'planner') return 'planner';
  if (target === 'analytics') return 'analytics';
  if (target === 'simulator') return 'simulator';
  return 'dashboard';
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'FreshRoute — Dashboard & Overview',
  inventory: 'FreshRoute — Inventory & Batch Tracking',
  destinations: 'FreshRoute — Destinations & APMC Demand',
  planner: 'FreshRoute — Intelligent Dispatch Planner',
  analytics: 'FreshRoute — Comparative Results & Analytics',
  simulator: 'FreshRoute — Disruption Scenario Simulator',
};

export function App() {
  const { mode } = useTheme();
  const [activeTab, setActiveTab] = useState<string>(() => getTabFromUrl());
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  const [toastClosing, setToastClosing] = useState(false);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // One timer at a time: a newer toast must never be cleared by the
    // older toast's timeout.
    window.clearTimeout(toastTimerRef.current);
    setToastClosing(false);
    setToast({ message, type });
    // Error messages stay up longer so they can actually be read
    toastTimerRef.current = window.setTimeout(() => {
      setToastClosing(true);
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        setToastClosing(false);
      }, 180);
    }, type === 'error' ? 6000 : 4000);
  };

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  // Direct, high-performance page rendering — zero double-mount lag
  const renderPage = (tab: string) => {
    switch (tab) {
      case 'inventory':
        return (
          <InventoryPage
            batches={batches}
            loading={loading}
            onAddBatch={handleAddBatch}
            onUpdateBatch={handleUpdateBatch}
            onDeleteBatch={handleDeleteBatch}
          />
        );
      case 'destinations':
        return (
          <DestinationsPage
            destinations={destinations}
            loading={loading}
            onAddDestination={handleAddDestination}
            onUpdateDestination={handleUpdateDestination}
            onDeleteDestination={handleDeleteDestination}
            onAddDemand={handleAddDemand}
            onUpdateDemand={handleUpdateDemand}
            onDeleteDemand={handleDeleteDemand}
          />
        );
      case 'planner':
        return (
          <PlannerPage
            plan={currentPlan}
            scenarios={scenarios}
            onOptimize={handleOptimize}
            loading={isOptimizing}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPage
            comparison={comparison}
            currentPlan={currentPlan}
            baselinePlan={baselinePlan}
            loading={loading || isOptimizing}
            onRunComparison={() => handleRunSimulation('normal')}
          />
        );
      case 'simulator':
        return (
          <SimulatorPage
            scenarios={scenarios}
            onRunSimulation={handleRunSimulation}
            loading={isOptimizing}
            currentComparison={comparison}
          />
        );
      default:
        return (
          <DashboardPage
            metrics={metrics}
            loading={loading}
            onNavigate={handleTabChange}
            onRunQuickOptimize={() => handleOptimize({
              strategy: 'freshroute',
              scenario_key: 'normal',
              enable_discounts: true,
              min_shelf_life_buffer_hours: 4.0
            })}
            onRunQuickBaseline={() => handleOptimize({
              strategy: 'baseline',
              scenario_key: 'normal',
              enable_discounts: false,
              min_shelf_life_buffer_hours: 0
            })}
            isOptimizing={isOptimizing}
            recentPlan={currentPlan}
          />
        );
    }
  };

  // URL switching and HTML5 History synchronization
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    const targetPath = newTab === 'dashboard' ? '/' : `/${newTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: newTab }, '', targetPath);
    }
    document.title = TAB_TITLES[newTab] || 'FreshRoute — Produce Distribution Platform';
  }, []);

  // Sync browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromUrl();
      setActiveTab(tab);
      document.title = TAB_TITLES[tab] || 'FreshRoute';
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update document title on initial load
  useEffect(() => {
    document.title = TAB_TITLES[activeTab] || 'FreshRoute';
  }, [activeTab]);

  // Theme attribute is owned by ThemeProvider (pre-paint script in
  // index.html covers first paint); the wrapper below only mirrors mode
  // so content inherits the same tokens on the very first render.

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dashData, batchData, destData, scData, simComp] = await Promise.all([
        fetchDashboard(),
        fetchBatches(),
        fetchDestinations(),
        fetchScenarios(),
        runSimulation('normal', true),
      ]);

      setMetrics(dashData);
      setBatches(batchData);
      setDestinations(destData);
      setScenarios(scData);
      setComparison(simComp);
      setCurrentPlan(simComp.optimized_plan);
      setBaselinePlan(simComp.baseline_plan);
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
    if (!window.confirm('Reset all batches and demands in PostgreSQL to the official benchmark evaluation dataset?')) return;
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

  const handleUpdateDestination = async (id: number, data: any) => {
    await updateDestination(id, data);
    const updated = await fetchDestinations();
    setDestinations(updated);
    showToast(`Destination updated successfully!`);
  };

  const handleDeleteDestination = async (id: number) => {
    await deleteDestination(id);
    const updated = await fetchDestinations();
    setDestinations(updated);
    showToast(`Destination deleted successfully.`);
  };

  const handleAddDemand = async (destId: number, data: any) => {
    await createDemand(destId, data);
    const updated = await fetchDestinations();
    setDestinations(updated);
    showToast(`Demand added successfully!`);
  };

  const handleUpdateDemand = async (demandId: number, data: any) => {
    await updateDemand(demandId, data);
    const updated = await fetchDestinations();
    setDestinations(updated);
    showToast(`Demand updated successfully!`);
  };

  const handleDeleteDemand = async (demandId: number) => {
    await deleteDemand(demandId);
    const updated = await fetchDestinations();
    setDestinations(updated);
    showToast(`Demand deleted successfully.`);
  };

  return (
    <div className="h-screen w-screen overflow-hidden font-sans" data-theme={mode}>
      <Cursor />

      {toast && (
        <div
          key={toast.message}
          role="status"
          aria-live="polite"
          className={`${toastClosing ? 'toast-out' : 'toast-in'} fixed top-4 right-4 z-[60] flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700 shadow-emerald-950/20'
              : 'bg-rose-800 text-white border-rose-700 shadow-rose-950/20'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-accent" /> : <AlertCircle className="w-4 h-4 text-rose-300" />}
          <span>{toast.message}</span>
        </div>
      )}

      <AppShell
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onResetSeed={handleResetSeed}
        isResetting={isResetting}
        onQuickOptimize={() => handleOptimize({
          strategy: 'freshroute',
          scenario_key: 'normal',
          enable_discounts: true,
          min_shelf_life_buffer_hours: 4.0
        })}
        isOptimizing={isOptimizing}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        batchesCount={batches.length}
        atRiskCount={metrics?.batches_at_risk_count || 0}
      >
        <div key={activeTab} className="page-enter relative z-10">
          {renderPage(activeTab)}
        </div>
      </AppShell>
    </div>
  );
}

export default App;
