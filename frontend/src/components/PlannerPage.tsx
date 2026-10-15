import React, { useState } from 'react';
import { 
  Route, 
  Zap, 
  Tag, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  CheckCircle2
} from 'lucide-react';
import type { DistributionPlan, Scenario } from '../types';

interface PlannerPageProps {
  plan: DistributionPlan | null;
  scenarios: Scenario[];
  onOptimize: (params: {
    scenario_key: string;
    enable_discounts: boolean;
    min_shelf_life_buffer_hours: number;
    strategy: 'freshroute' | 'baseline';
  }) => Promise<void>;
  loading: boolean;
}

export const PlannerPage: React.FC<PlannerPageProps> = ({
  plan,
  scenarios,
  onOptimize,
  loading,
}) => {
  const [strategy, setStrategy] = useState<'freshroute' | 'baseline'>('freshroute');
  const [selectedScenario, setSelectedScenario] = useState<string>('normal');
  const [enableDiscounts, setEnableDiscounts] = useState<boolean>(true);
  const [bufferHours, setBufferHours] = useState<number>(4.0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleRun = () => {
    onOptimize({
      strategy,
      scenario_key: selectedScenario,
      enable_discounts: enableDiscounts,
      min_shelf_life_buffer_hours: bufferHours,
    });
  };

  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Route className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-primary-text">Intelligent Dispatch Planner</h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                FR-04 Engine
              </span>
            </div>
            <p className="text-xs text-secondary-text">
              Deterministic FEFO allocation engine evaluating remaining shelf-life, road transit duration, destination gate limits, and transparent margin explainability.
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className={`btn-press flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer shrink-0 ${
              strategy === 'freshroute'
                ? 'bg-primary hover:bg-primary-hover text-white'
                : 'bg-elevated hover:bg-border/60 text-primary-text border border-border'
            }`}
          >
            <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : 'text-accent'}`} />
            <span>{loading ? 'Solving Engine...' : strategy === 'freshroute' ? 'Execute FreshRoute Optimizer' : 'Compute Baseline (FIFO)'}</span>
          </button>
        </div>

        {/* Control Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Strategy Selector */}
          <div>
            <label className="block font-semibold text-secondary-text mb-1">Planning Algorithm</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-elevated rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setStrategy('freshroute')}
                className={`btn-press py-1.5 text-center font-bold rounded-md text-xs transition-all cursor-pointer ${
                  strategy === 'freshroute'
                    ? 'bg-surface text-primary shadow-xs font-bold border border-primary/20'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                FreshRoute (FEFO)
              </button>
              <button
                type="button"
                onClick={() => setStrategy('baseline')}
                className={`btn-press py-1.5 text-center font-medium rounded-md text-xs transition-all cursor-pointer ${
                  strategy === 'baseline'
                    ? 'bg-surface text-primary-text shadow-xs font-bold border border-border'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                Baseline (FIFO)
              </button>
            </div>
          </div>

          {/* Scenario Selector */}
          <div>
            <label className="block font-semibold text-secondary-text mb-1">Benchmark Scenario</label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-medium focus:border-primary focus:outline-none"
            >
              {scenarios.map((sc) => (
                <option key={sc.key} value={sc.key}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shelf Life Buffer */}
          <div>
            <div className="flex justify-between font-semibold text-secondary-text mb-1">
              <span>Arrival Safety Margin</span>
              <span className="font-mono font-bold text-primary">{bufferHours} Hours</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={bufferHours}
                onChange={(e) => setBufferHours(parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <span className="text-[10px] text-muted-text font-mono">12h</span>
            </div>
          </div>

          {/* Discount Policy Toggle */}
          <div>
            <label className="block font-semibold text-secondary-text mb-1">Markdown Clearance Engine</label>
              <button
                type="button"
                onClick={() => setEnableDiscounts(!enableDiscounts)}
                className={`btn-press w-full py-2 px-3 rounded-lg border flex items-center justify-between font-semibold text-xs transition-all cursor-pointer ${
                enableDiscounts
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-elevated border-border text-secondary-text'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>{enableDiscounts ? 'Discounts Active (FR-05)' : 'No Discounts'}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${enableDiscounts ? 'bg-primary animate-pulse' : 'bg-muted-text'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Plan Performance Summary Strip */}
      {plan && (
        <div
          key={`${plan.strategy}-${plan.net_revenue}-${plan.fulfillment_rate}`}
          className="reveal grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
            <span className="text-[11px] text-secondary-text font-medium">Plan Strategy</span>
            <div className="text-sm font-bold text-primary-text font-mono uppercase mt-0.5">{plan.strategy}</div>
          </div>
          <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
            <span className="text-[11px] text-secondary-text font-medium">Demand Fulfilled</span>
            <div className="text-sm font-bold text-primary font-mono mt-0.5">{plan.fulfillment_rate.toFixed(1)}%</div>
          </div>
          <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
            <span className="text-[11px] text-secondary-text font-medium">Spoiled Loss</span>
            <div className={`text-sm font-bold font-mono mt-0.5 ${plan.spoiled_quantity > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {plan.spoiled_quantity.toLocaleString()} kg
            </div>
          </div>
          <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
            <span className="text-[11px] text-secondary-text font-medium">Transport Tariffs</span>
            <div className="text-sm font-bold text-primary-text font-mono mt-0.5">₹{plan.transport_cost.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
            <span className="text-[11px] text-secondary-text font-medium">Net Realization</span>
            <div className="text-sm font-bold text-primary font-mono mt-0.5">₹{plan.net_revenue.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
            <span className="text-[11px] text-secondary-text font-medium">Violations Blocked</span>
            <div className="text-sm font-bold text-primary font-mono mt-0.5">{plan.infeasible_prevented} avoided</div>
          </div>
        </div>
      )}

      {/* Main Allocations Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-primary-text text-sm">Recommended Dispatch Allocations</h3>
            <p className="text-xs text-secondary-text">
              Click any allocation row to view the full mathematical explainability statement and proof of feasibility.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-elevated text-secondary-text border border-border">
            {plan?.allocations.length || 0} dispatches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-elevated/70 border-b border-border text-secondary-text uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4">Destination Mandi</th>
                <th className="py-3 px-4 text-right">Allocated Qty</th>
                <th className="py-3 px-4">Transit Time</th>
                <th className="py-3 px-4">Arrival Buffer</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Net Margin</th>
                <th className="py-3 px-4 text-center">Explainability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium text-primary-text">
              {!plan || plan.allocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-text">
                    No active distribution allocations. Click "Execute FreshRoute Optimizer" above.
                  </td>
                </tr>
              ) : (
                plan.allocations.map((alloc, allocIdx) => {
                  const isExpanded = expandedRow === alloc.id;
                  return (
                    <React.Fragment key={alloc.id}>
                      <tr 
                        onClick={() => toggleRow(alloc.id)}
                        style={{ animationDelay: `${Math.min(allocIdx, 10) * 30}ms` }}
                        className={`row-enter cursor-pointer transition-colors ${
                          isExpanded 
                            ? 'bg-primary/5' 
                            : 'hover:bg-elevated/50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {alloc.batch_code}
                        </td>
                        <td className="py-3 px-4 font-medium text-primary-text">
                          {alloc.commodity}
                        </td>
                        <td className="py-3 px-4 font-semibold text-primary-text">
                          {alloc.destination_name}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-primary-text tabular-nums">
                          {alloc.allocated_quantity.toLocaleString()} <span className="text-[10px] text-muted-text">kg</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-secondary-text">
                          {alloc.travel_time_hours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center space-x-1 font-mono font-semibold px-2 py-0.5 rounded text-[11px] border ${
                            alloc.arrival_shelf_life_remaining <= 6
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{alloc.arrival_shelf_life_remaining.toFixed(1)}h left</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-secondary-text tabular-nums">
                          <div>₹{alloc.effective_selling_price.toFixed(2)}/kg</div>
                          {alloc.discount_percent > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              (-{alloc.discount_percent.toFixed(0)}% disc)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-primary tabular-nums">
                          ₹{alloc.net_contribution.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button className="btn-press p-1 rounded text-muted-text hover:text-primary transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Explainability Drawer (FR-07) */}
                      {isExpanded && (
                        <tr className="row-enter bg-primary/5 border-b border-border">
                          <td colSpan={9} className="p-4 space-y-3">
                            <div className="p-4 bg-surface rounded-xl border border-primary/30 shadow-xs space-y-2">
                              <div className="flex items-center space-x-2 text-primary font-bold text-xs">
                                <Info className="w-4 h-4 text-primary shrink-0" />
                                <span>Algorithmic Explainability & Feasibility Proof (FR-07)</span>
                              </div>
                              <p className="text-xs text-primary-text leading-relaxed font-normal">
                                {alloc.reason}
                              </p>
                              <div className="pt-2 border-t border-border flex flex-wrap gap-2 text-[11px]">
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Arrival &gt; Min Safety Buffer</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Within Mandi Receiving Gate Limit</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Within Unmet Market Demand</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-elevated text-secondary-text border border-border font-mono">
                                  <span>Unit Tariff: ₹{alloc.unit_transport_cost.toFixed(2)}/kg</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-elevated text-secondary-text border border-border font-mono">
                                  <span>Handling Tariff: ₹{alloc.unit_handling_cost.toFixed(2)}/kg</span>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Recommendations Panel (FR-05) */}
      {plan && plan.discount_recommendations.length > 0 && (
        <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Tag className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-primary-text text-sm">Discount & Margin Preservation Recommendations</h3>
                <p className="text-xs text-secondary-text">
                  Rule-based dynamic discount alerts triggered to clear near-expiry inventory before total spoilage (FR-05).
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {plan.discount_recommendations.length} markdown alerts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.discount_recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl border border-border bg-elevated/40 hover:bg-elevated/70 transition-all text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary-text">{rec.batch_code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                      rec.risk_level === 'critical'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : rec.risk_level === 'high_risk'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {rec.risk_level.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between font-semibold">
                    <span className="text-primary-text">{rec.commodity} ({rec.quantity.toLocaleString()} kg)</span>
                    <span className="text-primary font-bold font-mono">
                      -{rec.recommended_discount_percent.toFixed(0)}% Off
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-secondary-text leading-relaxed font-normal">
                    {rec.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-border text-[10px] text-muted-text flex justify-between items-center font-mono">
                  <span>Price: ₹{rec.discounted_price.toFixed(1)}/kg <span className="line-through text-muted-text/70">₹{rec.original_price.toFixed(1)}</span></span>
                  <span className="font-semibold text-primary">{rec.expected_margin_impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};