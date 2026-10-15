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
  Zap,
  Activity
} from 'lucide-react';
import type { Scenario, EvaluationComparison } from '../types';
import { Tooltip } from './Tooltip';

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
    // Ignore clicks while a run is in flight — concurrent simulations
    // would race and whichever finished last would win.
    if (loading) return;
    setSelectedKey(key);
    try {
      const result = await onRunSimulation(key);
      setSimulationResult(result);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-primary-text">
              Supply Chain Disruption & Stress Simulator
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              FR-08 Simulation
            </span>
          </div>
          <p className="text-xs text-secondary-text mt-1">
            Stress-test FreshRoute against severe real-world agricultural shocks (heatwaves, flood delays, diesel surges) and evaluate mathematical resilience against baseline.
          </p>
        </div>

        <Tooltip text="Simulate real-world disruption effects across all supply chain nodes">
          <button
            onClick={() => handleSimulate(selectedKey)}
            disabled={loading}
            className="btn-press flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-neutral-950 font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Play className={`w-4 h-4 fill-current ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Simulating Engine...' : 'Run Selected Shock Test'}</span>
          </button>
        </Tooltip>
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const Icon = getScenarioIcon(sc.key);
          const isSelected = selectedKey === sc.key;

          return (
            <Tooltip
              key={sc.key}
              text={`Click to run simulation under ${sc.name}`}
              wrapperClassName="w-full h-full block"
            >
              <div
                onClick={() => handleSimulate(sc.key)}
                data-cursor="card"
                data-cursor-label="Run"
                className={`stagger-card btn-press p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-full ${
                  isSelected
                    ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                    : 'bg-surface border-border hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ${
                      isSelected 
                        ? 'bg-primary text-white dark:text-neutral-950 font-bold' 
                        : 'bg-elevated text-secondary-text border border-border'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isSelected 
                        ? 'bg-primary/15 text-primary border-primary/30' 
                        : 'bg-elevated text-muted-text border-border'
                    }`}>
                      {isSelected ? 'ACTIVE SCENARIO' : 'SELECT'}
                    </span>
                  </div>

                  <h3 className="font-bold text-primary-text text-sm mt-3">{sc.name}</h3>
                  <p className="text-xs text-secondary-text mt-1 leading-relaxed">{sc.description}</p>
                </div>

                {/* Stress Multipliers */}
                <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-1.5 text-[10px] font-mono">
                  {sc.travel_time_multiplier !== 1 && (
                    <Tooltip text="Transit delay impact factor">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold cursor-help">
                        Transit +{Math.round((sc.travel_time_multiplier - 1) * 100)}%
                      </span>
                    </Tooltip>
                  )}
                  {sc.shelf_life_multiplier !== 1 && (
                    <Tooltip text="Shelf life degradation impact factor">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold cursor-help">
                        Shelf Life -{Math.round((1 - sc.shelf_life_multiplier) * 100)}%
                      </span>
                    </Tooltip>
                  )}
                  {sc.demand_multiplier !== 1 && (
                    <Tooltip text="Market demand contraction factor">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold cursor-help">
                        Demand -{Math.round((1 - sc.demand_multiplier) * 100)}%
                      </span>
                    </Tooltip>
                  )}
                  {sc.capacity_multiplier !== 1 && (
                    <Tooltip text="Fleet transit capacity reduction">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold cursor-help">
                        Fleet -{Math.round((1 - sc.capacity_multiplier) * 100)}%
                      </span>
                    </Tooltip>
                  )}
                  {sc.transport_cost_multiplier !== 1 && (
                    <Tooltip text="Logistics freight tariff inflation">
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-semibold cursor-help">
                        Tariffs +{Math.round((sc.transport_cost_multiplier - 1) * 100)}%
                      </span>
                    </Tooltip>
                  )}
                  {sc.key === 'normal' && (
                    <Tooltip text="Nominal benchmark operational baseline">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold cursor-help">
                        1.0x Baseline Nominal
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Disruption Live Impact Dashboard */}
      {simulationResult && (
        <div
          key={`${simulationResult.scenario_name}-${simulationResult.runtime_comparison_ms.freshroute_ms}`}
          className="reveal bg-surface rounded-2xl border border-border shadow-xs p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold mb-1">
                <Zap className="w-3.5 h-3.5 text-accent" />
                <span>Simulation Benchmark Grounded</span>
              </div>
              <h3 className="text-lg font-bold text-primary-text">
                Stress-Test Response: {simulationResult.scenario_name}
              </h3>
            </div>
            <span className="text-xs font-mono bg-elevated px-3 py-1 rounded-lg text-secondary-text font-medium border border-border">
              Runtime: {simulationResult.runtime_comparison_ms.freshroute_ms.toFixed(2)} ms
            </span>
          </div>

          {/* Core Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-between">
                <span>Spoilage Mitigation</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </span>
              <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 font-mono mt-2">
                {simulationResult.spoilage_reduction_percent != null
                  ? `${simulationResult.spoilage_reduction_percent.toFixed(1)}%`
                  : '100%'}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                {simulationResult.spoilage_quantity_prevented_kg.toLocaleString()} kg food saved
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
              <span className="text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-between">
                <span>Net Revenue Advantage</span>
                <TrendingDown className="w-4 h-4 text-blue-500 rotate-180" />
              </span>
              <div className="text-2xl font-extrabold text-blue-800 dark:text-blue-200 font-mono mt-2">
                +₹{simulationResult.net_revenue_lift.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 font-mono">
                +{simulationResult.net_revenue_lift_percent.toFixed(2)}% margin boost
              </p>
            </div>

            <div className="p-4 rounded-xl bg-elevated border border-border text-xs">
              <span className="text-secondary-text font-semibold flex items-center justify-between">
                <span>Baseline Spoilage Loss</span>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-2">
                {simulationResult.baseline_plan.spoiled_quantity.toLocaleString()} kg
              </div>
              <p className="text-[11px] text-muted-text mt-1 font-mono">
                ₹{simulationResult.baseline_plan.spoilage_cost.toLocaleString('en-IN')} economic loss
              </p>
            </div>

            <div className="p-4 rounded-xl bg-elevated border border-border text-xs">
              <span className="text-secondary-text font-semibold flex items-center justify-between">
                <span>FreshRoute Spoilage</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </span>
              <div className="text-2xl font-bold text-primary font-mono mt-2">
                {simulationResult.optimized_plan.spoiled_quantity.toLocaleString()} kg
              </div>
              <p className="text-[11px] text-muted-text mt-1 font-mono">
                Rate: {simulationResult.optimized_plan.spoilage_rate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Explainability Callout under Disruption */}
          <div className="p-4 bg-elevated/60 rounded-xl border border-border text-xs text-secondary-text space-y-2">
            <span className="font-bold text-primary-text block text-xs flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-primary" />
              <span>Algorithmic Adaptation Rationale under {simulationResult.scenario_name}:</span>
            </span>
            <p className="leading-relaxed">
              When the disruption took effect, naive FIFO baseline sequencing attempted rigid allocations that either violated the shortened arrival deadline, or filled nearby gate capacity with fresher lots—leaving fragile batches stranded in cold storage. In contrast, FreshRoute dynamically re-indexed every active lot by remaining shelf-life urgency (FEFO), rerouting critical lots to surviving short-transit corridors and applying clearance discounts where necessary to preserve margins.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};