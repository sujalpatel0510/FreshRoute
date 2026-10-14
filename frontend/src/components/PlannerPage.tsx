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
import { useTheme } from '../components/ThemeToggle';

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
  const { mode } = useTheme();
  const isDark = mode === 'dark';
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

  const strategyBg = isDark ? 'var(--primary)/20' : 'var(--primary)/10';
  const strategyBorder = isDark ? 'var(--primary)/30' : 'var(--primary)/30';
  const strategyText = isDark ? 'var(--primary)' : 'var(--primary)';

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/30">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg ${strategyBg} border ${strategyBorder} text-${strategyText.split('/')[0]}`}>
                <Route className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-body dark:text-[color:var(--primary-text)]">Intelligent Dispatch Planner</h2>
            </div>
            <p className="text-xs text-var(--muted-text) mt-1">
              Configure parameters to calculate feasible, capacity-constrained stock allocations with transparent explainability.
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50 ${
              strategy === 'freshroute'
                ? 'bg-primary hover-primary/90 text-white shadow-primary/20'
                : 'bg-surface/50 hover:bg-surface/80 text-var(--muted-text)'`
            }`}
          >
            <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Solving Engine...' : strategy === 'freshroute' ? 'Optimize FreshRoute Plan' : 'Generate Baseline Plan'}</span>
          </button>
        </div>

        {/* Control Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/* Strategy Selector */}
          <div>
            <label className="block font-semibold text-var(--muted-text) mb-1">Planning Strategy</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border border-border/30">
              <button
                type="button"
                onClick={() => setStrategy('freshroute')}
                className={`py-1.5 text-center font-bold rounded-md transition-all ${
                  strategy === 'freshroute'
                    ? 'bg-primary/20 text-primary border var(--primary)/30'
                    : 'text-var(--muted-text) hover:text-var(--primary)'
                }`}
              >
                FreshRoute (FEFO)
              </button>
              <button
                type="button"
                onClick={() => setStrategy('baseline')}
                className={`py-1.5 text-center font-bold rounded-md transition-all ${
                  strategy === 'baseline'
                    ? 'bg-white text-var(--primary-500) shadow-xs'
                    : 'text-var(--muted-text) hover:text-var(--primary)'
                }`}
              >
                Baseline (FIFO)
              </button>
            </div>
          </div>

          {/* Scenario Selector */}
          <div>
            <label className="block font-semibold text-var(--muted-text) mb-1">Operational Scenario</label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
            <label className="block font-semibold text-var(--muted-text) mb-1">
              Min Arrival Buffer: <span className="font-bold text-primary">{bufferHours} Hours</span>
            </label>
            <input
              type="range"
              min="1"
              max="12"
              step="0.5"
              value={bufferHours}
              onChange={(e) => setBufferHours(parseFloat(e.target.value))}
              className="w-full mt-2 cursor-pointer"
            />
          </div>

          {/* Discount Policy Toggle */}
          <div>
            <label className="block font-semibold text-var(--muted-text) mb-1">Clearance Discounting</label>
            <button
              type="button"
              onClick={() => setEnableDiscounts(!enableDiscounts)}
              className={`w-full py-2 px-3 rounded-full border flex items-center justify-between font-semibold transition-all ${
                enableDiscounts
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-surface/50 border-border/30 text-var(--muted-text)'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>{enableDiscounts ? 'Discounts Enabled' : 'Discounts Disabled'}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${
                enableDiscounts ? 'bg-primary-500' : 'var(--surface)/30'
              }`}></span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Performance Summary Strip */}
      {plan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-surface/50 rounded-xl border border-border/30 p-3.5">
            <span className="text-[11px] text-var(--muted-text) font-medium">Plan Strategy</span>
            <div className="text-sm font-bold text-body dark:text-[color:var(--primary-text)] uppercase mt-0.5">{plan.strategy}</div>
          </div>
          <div className="bg-surface/50 rounded-xl border border-border/30 p-3.5">
            <span className="text-[11px] text-var(--muted-text) font-medium">Fulfillment Rate</span>
            <div className="text-sm font-bold text-primary dark:text-[color:var(--primary-text)] mt-0.5">{plan.fulfillment_rate.toFixed(1)}%</div>
          </div>
          <div className="bg-surface/50 rounded-xl border border-border/30 p-3.5">
            <span className="text-[11px] text-var(--muted-text) font-medium">Spoiled Quantity</span>
            <div className={`text-sm font-bold mt-0.5 ${
              plan.spoiled_quantity > 0 ? 'text-warning' : 'text-primary'
            }`}>
              {plan.spoiled_quantity.toLocaleString()} kg
            </div>
          </div>
          <div className="bg-surface/50 rounded-xl border border-border/30 p-3.5">
            <span className="text-[11px] text-var(--muted-text) font-medium">Transport Tariffs</span>
            <div className="text-sm font-bold text-body dark:text-[color:var(--primary-text)] mt-0.5">₹{plan.transport_cost.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-surface/50 rounded-xl border border-border/30 p-3.5">
            <span className="text-[11px] text-var(--muted-text) font-medium">Net Realization</span>
            <div className="text-sm font-bold text-primary dark:text-[color:var(--primary-text)] mt-0.5">₹{plan.net_revenue.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-surface/50 rounded-xl border border-border/30 p-3.5">
            <span className="text-[11px] text-var(--muted-text) font-medium">Violations Blocked</span>
            <div className="text-sm font-bold text-primary mt-0.5">{plan.infeasible_prevented} avoided</div>
          </div>
        </div>
      )}

      {/* Main Allocations Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-shadow-sm">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-body dark:text-[color:var(--primary-text)] text-sm">Recommended Dispatch Allocations</h3>
            <p className="text-xs text-var(--muted-text)">
              Click any row to inspect the complete explainability statement and constraint verification proof.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface/20 text-var(--muted-text) border border-border/30">
            {plan?.allocations.length || 0} dispatches
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/50 border-b border-border/30 text-var(--muted-text) uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4">Destination Mandi</th>
                <th className="py-3 px-4 text-right">Allocated (kg)</th>
                <th className="py-3 px-4">Transit Time</th>
                <th className="py-3 px-4">Arrival Shelf Buffer</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4 text-right">Net Contribution</th>
                <th className="py-3 px-4 text-center">Explainability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-medium text-body dark:text-[color:var(--primary-text)]">
              {!plan || plan.allocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-var(--muted-text)">
                    No active distribution allocations. Click "Optimize FreshRoute Plan" above.
                  </td>
                </tr>
              ) : (
                plan.allocations.map((alloc) => {
                  const isExpanded = expandedRow === alloc.id;

                  return (
                    <React.Fragment key={alloc.id}>
                      <tr
                        onClick={() => toggleRow(alloc.id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-primary/20' : 'hover:bg-primary/5'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-body dark:text-[color:var(--primary-text)]">
                          {alloc.batch_code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-body dark:text-[color:var(--primary-text)]">
                          {alloc.commodity}
                        </td>
                        <td className="py-3 px-4 font-semibold text-body dark:text-[color:var(--primary-text)]">
                          {alloc.destination_name}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-body dark:text-[color:var(--primary-text)]">
                          {alloc.allocated_quantity.toLocaleString()} kg
                        </td>
                        <td className="py-3 px-4 text-var(--muted-text)">
                          {alloc.travel_time_hours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center space-x-1 font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${
                            alloc.arrival_shelf_life_remaining <= 6
                              ? 'bg-warning/20 text-warning border border-warning/30'
                              : 'bg-primary/20 text-primary border border-primary/30'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{alloc.arrival_shelf_life_remaining.toFixed(1)}h left</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-var(--muted-text)">
                          <div>₹{alloc.effective_selling_price.toFixed(2)}/kg</div>
                          {alloc.discount_percent > 0 && (
                            <span className="text-[10px] text-warning font-bold">
                              (-{alloc.discount_percent.toFixed(0)}% disc)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary dark:text-[color:var(--primary-text)]">
                          ₹{alloc.net_contribution.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button className="p-1 rounded text-var(--muted-text) hover:text-primary">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Explainability Drawer (FR-07) */}
                      {isExpanded && (
                        <tr className="border border-primary/20">
                          <td colSpan={9} className="p-4 space-y-3">
                            <div className="p-3.5 rounded-xl bg-surface/50 border border-primary/30 shadow-sm space-y-2">
                              <div className="flex items-center space-x-2 text-primary font-bold text-xs">
                                <Info className="w-4 h-4 text-primary" />
                                <span>Algorithmic Explainability Rationale (FR-07)</span>
                              </div>
                              <p className="text-var(--muted-text) leading-relaxed font-normal">
                                {alloc.reason}
                              </p>
                              <div className="pt-2 border-t border-border/30 flex flex-wrap gap-2 text-[10px]">
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-primary" />
                                  <span>Shelf Life Feasible</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-primary" />
                                  <span>Within Gate Intake Limit</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-surface/20 text-var(--muted-text) border border-border/30 font-medium">
                                  <span>Unit Tariff: ₹{alloc.unit_transport_cost.toFixed(2)}/kg</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-surface/20 text-var(--muted-text) border border-border/30 font-medium">
                                  <span>Warehouse Handling: ₹{alloc.unit_handling_cost.toFixed(2)}/kg</span>
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
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg bg-warning/20 text-warning border border-warning/30`}>
                <Tag className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-body dark:text-[color:var(--primary-text)] text-sm">Discount & Margin Preservation Recommendations</h3>
                <p className="text-xs text-var(--muted-text)">
                  Rule-based dynamic discount alerts triggered to clear near-expiry inventory before total write-off (FR-05).
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
              {plan.discount_recommendations.length} batches recommended
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.discount_recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl border border-border/30 bg-surface/50 hover:bg-surface/60 transition-all text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-body dark:text-[color:var(--primary-text)]">{rec.batch_code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      rec.risk_level === 'critical'
                        ? 'bg-warning/20 text-warning border border-warning/30'
                        : rec.risk_level === 'high_risk'
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-primary/20 text-primary border border-primary/30'
                    }`}>
                      {rec.risk_level.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-var(--muted-text) font-semibold">
                    <span>{rec.commodity} ({rec.quantity} kg)</span>
                    <span className="text-primary font-bold">
                      -{rec.recommended_discount_percent.toFixed(0)}% Off
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] text-var(--muted-text) leading-relaxed font-normal">
                    {rec.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/30 text-[10px] text-var(--muted-text) flex justify-between items-center">
                  <span>Price: ₹{rec.discounted_price.toFixed(1)}/kg (was ₹{rec.original_price.toFixed(1)})</span>
                  <span className="font-bold text-primary">{rec.expected_margin_impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};