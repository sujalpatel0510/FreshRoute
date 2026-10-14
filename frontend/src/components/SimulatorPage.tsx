import React, { useState } from 'react';
import { 
  Sliders, 
  Play, 
  CloudRain, 
  Flame, 
  TrendingDown, 
  Truck, 
  Fuel, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck,
  Zap 
} from 'lucide-react';
import type { Scenario, EvaluationComparison } from '../types';
import { useTheme } from '../components/ThemeToggle';

interface SimulatorPageProps {
  scenarios: Scenario[];
  onRunSimulation: (key: string) => Promise<EvaluationComparison>;
  loading: boolean;
  currentComparison: EvaluationComparison | null;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  scenarios,
  onRunSimulation,
  loading,
  currentComparison,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const [selectedKey, setSelectedKey] = useState<string>('market_demand_drop');
  const [simulationResult, setSimulationResult] = useState<EvaluationComparison | null>(currentComparison);

  const getScenarioIcon = (key: string) => {
    switch (key) {
      case 'monsoon_delay':
        return CloudRain;
      case 'heatwave_expiry':
        return Flame;
      case 'market_demand_drop':
        return TrendingDown;
      case 'fleet_breakdown':
        return Truck;
      case 'fuel_cost_spike':
        return Fuel;
      default:
        return CheckCircle2;
    }
  };

  const handleSimulate = async (key: string) => {
    setSelectedKey(key);
    try {
      const result = await onRunSimulation(key);
      setSimulationResult(result);
    } catch (e) {
      console.error(e);
    }
  };

  const cardBg = isDark ? 'bg-surface/50' : 'bg-white';
  const cardBorder = isDark ? 'border-border/30' : 'border-slate-200';
  const cardText = isDark ? 'text-var(--muted-text)' : 'text-slate-600';
  const cardIconBg = isDark ? 'var(--surface)/20' : 'var(--surface)/50';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm ${isDark ? 'dark' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary`}>
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-body dark:text-[color:var(--primary-text)]">
                Supply Chain Disruption Simulator
              </h2>
            </div>
            <p className="text-xs text-var(--muted-text) mt-1">
              Stress-test FreshRoute against extreme agricultural real-world disruptions and verify mathematical resilience against baseline (FR-08).
            </p>
          </div>

          <button
            onClick={() => handleSimulate(selectedKey)}
            disabled={loading}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-primary hover-primary/90 text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50`}
          >
            <Play className={`w-4 h-4 fill-current ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Simulating Engine...' : 'Run Selected Disruption'}</span>
          </button>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const Icon = getScenarioIcon(sc.key);
          const isSelected = selectedKey === sc.key;

          return (
            <div
              key={sc.key}
              onClick={() => handleSimulate(sc.key)}
              className={`p-4 rounded-2xl border border-border cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-primary/20 border-primary/30 ring-2 ring-primary/20 shadow-xs'
                  : 'bg-surface/50 border-border/30 hover:border-primary/20'
              }`}
            >
              <div>
                <div className={`p-2 rounded-xl ${
                  isSelected ? 'bg-primary/20 text-primary' : 'bg-surface/50 text-var(--muted-text)'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-surface/50 text-var(--muted-text)'`
                }`}>
                  {isSelected ? 'ACTIVE' : 'SELECT'}
                </span>
              </div>

              <h3 className="font-bold text-body dark:text-[color:var(--primary-text)] text-sm mt-3">{sc.name}</h3>
              <p className="text-var(--muted-text) mt-1 leading-relaxed">{sc.description}</p>
            </div>
          );
        })}
      </div>

      {/* Disruption Live Impact Dashboard */}
      {simulationResult && (
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/30 gap-2">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold mb-1">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>Simulation Benchmark Complete</span>
              </div>
              <h3 className="text-lg font-bold text-body dark:text-[color:var(--primary-text)]">
                Stress-Test Response: {simulationResult.scenario_name}
              </h3>
            </div>
            <span className="text-xs font-mono bg-surface/50 px-3 py-1 rounded-lg text-var(--muted-text) font-medium">
              Runtime: {simulationResult.runtime_comparison_ms.freshroute_ms.toFixed(2)} ms
            </span>
          </div>

          {/* Core Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} ${isDark ? 'dark' : ''}`}>
              <span className="text-primary font-semibold flex items-center justify-between">
                <span>Spoilage Prevention</span>
                <ShieldCheck className="w-4 h-4 text-primary" />
              </span>
              <div className="text-2xl font-extrabold text-primary dark:text-[color:var(--primary-text)] mt-2">
                {simulationResult.spoilage_reduction_percent != null
                  ? `${simulationResult.spoilage_reduction_percent.toFixed(1)}%`
                  : '100%'}
              </div>
              <p className="text-[11px] text-var(--muted-text) mt-1">
                {simulationResult.spoilage_quantity_prevented_kg.toLocaleString()} kg produce saved from rot
              </p>
            </div>

            <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} ${isDark ? 'dark' : ''}`}>
              <span className="text-primary font-semibold flex items-center justify-between">
                <span>Net Revenue Advantage</span>
                <TrendingDown className="w-4 h-4 text-primary rotate-180" />
              </span>
              <div className="text-2xl font-extrabold text-primary dark:text-[color:var(--primary-text)] mt-2">
                +₹{simulationResult.net_revenue_lift.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[11px] text-var(--muted-text) mt-1">
                +{simulationResult.net_revenue_lift_percent.toFixed(2)}% higher return vs baseline
              </p>
            </div>

            <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} ${isDark ? 'dark' : ''}`}>
              <span className="text-var(--muted-text) font-semibold flex items-center justify-between">
                <span>Baseline Spoilage Loss</span>
                <ShieldAlert className="w-4 h-4 text-var(--error)" />
              </span>
              <div className="text-2xl font-bold text-var(--error) mt-2">
                {simulationResult.baseline_plan.spoiled_quantity.toLocaleString()} kg
              </div>
              <p className="text-[11px] text-var(--muted-text) mt-1">
                ₹{simulationResult.baseline_plan.spoilage_cost.toLocaleString('en-IN')} economic write-off
              </p>
            </div>

            <div className={`p-4 rounded-xl ${cardBg} border ${cardBorder} ${isDark ? 'dark' : ''}`}>
              <span className="text-primary font-semibold flex items-center justify-between">
                <span>FreshRoute Spoilage</span>
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </span>
              <div className="text-2xl font-bold text-primary dark:text-[color:var(--primary-text)] mt-2">
                {simulationResult.optimized_plan.spoiled_quantity.toLocaleString()} kg
              </div>
              <p className="text-[11px] text-var(--muted-text) mt-1">
                Rate: {simulationResult.optimized_plan.spoilage_rate.toFixed(1)}% (minimized)
              </p>
            </div>
          </div>

          {/* Explainability Callout under Disruption */}
          <div className={`p-4 rounded-xl bg-surface/50 border border-border/30 text-var(--muted-text) space-y-2 ${isDark ? 'dark' : ''}`}>
            <span className="font-bold text-body dark:text-[color:var(--primary-text)] block text-xs">
              Why FreshRoute adapted better under {simulationResult.scenario_name}:
            </span>
            <p className="leading-relaxed">
              When the disruption took effect, naive baseline sequencing attempted fixed-order dispatches that either violated the tightened arrival deadline, or filled nearby gate capacity with fresher lots—leaving fragile batches stranded in cold storage. In contrast, FreshRoute immediately re-indexed every active lot by remaining shelf-life urgency (FEFO), rerouting critical lots to surviving short-transit corridors and activating clearance discounts where needed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};