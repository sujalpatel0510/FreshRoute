export interface Batch {
  id: number;
  batch_code: string;
  commodity: string;
  quantity: number;
  initial_quantity: number;
  remaining_shelf_life: number;
  storage_location: string;
  handling_cost: number;
  procurement_cost: number;
  status: string;
  notes?: string;
  created_at: string;
}

export interface Demand {
  id: number;
  destination_id: number;
  commodity: string;
  demand_quantity: number;
  selling_price: number;
  delivery_deadline_hours: number;
}

export interface TransportOption {
  id: number;
  destination_id: number;
  origin_warehouse: string;
  travel_time_hours: number;
  transport_cost_per_kg: number;
  max_capacity_kg: number;
  transport_mode: string;
}

export interface Destination {
  id: number;
  code: string;
  name: string;
  location: string;
  state: string;
  receiving_capacity: number;
  latitude?: number;
  longitude?: number;
  demands: Demand[];
  transport_options: TransportOption[];
}

export interface Allocation {
  id: number;
  batch_code: string;
  destination_name: string;
  commodity: string;
  allocated_quantity: number;
  travel_time_hours: number;
  arrival_shelf_life_remaining: number;
  unit_price: number;
  unit_transport_cost: number;
  unit_handling_cost: number;
  discount_percent: number;
  effective_selling_price: number;
  net_contribution: number;
  reason: string;
  constraint_checks?: {
    shelf_life_feasible: boolean;
    within_receiving_capacity: boolean;
    within_unmet_demand: boolean;
    arrival_buffer_hours: number;
  };
}

export interface DiscountRecommendation {
  id: number;
  batch_code: string;
  commodity: string;
  quantity: number;
  current_shelf_life: number;
  recommended_discount_percent: number;
  original_price: number;
  discounted_price: number;
  risk_level: string;
  reason: string;
  expected_margin_impact: string;
}

export interface DistributionPlan {
  id: number;
  plan_name: string;
  strategy: 'freshroute' | 'baseline';
  scenario_name: string;
  created_at: string;
  total_inventory: number;
  total_demand: number;
  fulfilled_demand: number;
  unmet_demand: number;
  spoiled_quantity: number;
  gross_revenue: number;
  transport_cost: number;
  handling_cost: number;
  discount_loss: number;
  spoilage_cost: number;
  net_revenue: number;
  fulfillment_rate: number;
  spoilage_rate: number;
  infeasible_prevented: number;
  execution_time_ms: number;
  allocations: Allocation[];
  discount_recommendations: DiscountRecommendation[];
}

export interface EvaluationComparison {
  scenario_name: string;
  baseline_plan: DistributionPlan;
  optimized_plan: DistributionPlan;
  spoilage_reduction_percent: number | null;
  net_revenue_lift: number;
  net_revenue_lift_percent: number;
  fulfillment_lift_percent: number;
  spoilage_quantity_prevented_kg: number;
  runtime_comparison_ms: {
    baseline_ms: number;
    freshroute_ms: number;
  };
}

export interface DashboardMetrics {
  total_inventory_kg: number;
  batches_at_risk_count: number;
  total_demand_kg: number;
  active_commodities: string[];
  recent_plan?: DistributionPlan;
  urgent_alerts: Array<{
    severity: string;
    batch_code: string;
    commodity: string;
    quantity: number;
    remaining_hours: number;
    warehouse: string;
    message: string;
  }>;
}

export interface Scenario {
  id: number;
  key: string;
  name: string;
  description: string;
  demand_multiplier: number;
  travel_time_multiplier: number;
  capacity_multiplier: number;
  shelf_life_multiplier: number;
  transport_cost_multiplier: number;
  is_active: boolean;
}
