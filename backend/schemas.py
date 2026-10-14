from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# Inventory Batch Schemas
class BatchBase(BaseModel):
    batch_code: str
    commodity: str
    quantity: float = Field(..., gt=0, description="Quantity in kg")
    remaining_shelf_life: float = Field(..., gt=0, description="Estimated shelf life in hours")
    storage_location: str
    handling_cost: float = Field(default=1.5, ge=0)
    procurement_cost: float = Field(default=15.0, ge=0)
    notes: Optional[str] = None

class BatchCreate(BatchBase):
    pass

class BatchUpdate(BaseModel):
    quantity: Optional[float] = Field(None, gt=0)
    remaining_shelf_life: Optional[float] = Field(None, gt=0)
    storage_location: Optional[str] = None
    handling_cost: Optional[float] = Field(None, ge=0)
    procurement_cost: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None
    notes: Optional[str] = None

class BatchOut(BatchBase):
    id: int
    initial_quantity: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Demand and Transport Schemas
class DemandBase(BaseModel):
    commodity: str
    demand_quantity: float = Field(..., gt=0)
    selling_price: float = Field(..., gt=0)
    delivery_deadline_hours: float = Field(default=48.0, gt=0)

class DemandCreate(DemandBase):
    destination_id: int

class DemandOut(DemandBase):
    id: int
    destination_id: int

    class Config:
        from_attributes = True

class TransportOptionBase(BaseModel):
    origin_warehouse: str
    travel_time_hours: float = Field(..., gt=0)
    transport_cost_per_kg: float = Field(..., ge=0)
    max_capacity_kg: float = Field(default=5000.0, gt=0)
    transport_mode: str = "Refrigerated Truck"

class TransportOptionCreate(TransportOptionBase):
    destination_id: int

class TransportOptionOut(TransportOptionBase):
    id: int
    destination_id: int

    class Config:
        from_attributes = True

# Destination Schemas
class DestinationBase(BaseModel):
    code: str
    name: str
    location: str
    state: str = "Maharashtra"
    receiving_capacity: float = Field(..., gt=0)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DestinationCreate(DestinationBase):
    demands: Optional[List[DemandBase]] = None
    transport_options: Optional[List[TransportOptionBase]] = None

class DestinationOut(DestinationBase):
    id: int
    demands: List[DemandOut] = []
    transport_options: List[TransportOptionOut] = []

    class Config:
        from_attributes = True

# Allocation & Recommendation Schemas
class AllocationOut(BaseModel):
    id: int
    batch_code: str
    destination_name: str
    commodity: str
    allocated_quantity: float
    travel_time_hours: float
    arrival_shelf_life_remaining: float
    unit_price: float
    unit_transport_cost: float
    unit_handling_cost: float
    discount_percent: float
    effective_selling_price: float
    net_contribution: float
    reason: str
    constraint_checks: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class DiscountRecommendationOut(BaseModel):
    id: int
    batch_code: str
    commodity: str
    quantity: float
    current_shelf_life: float
    recommended_discount_percent: float
    original_price: float
    discounted_price: float
    risk_level: str
    reason: str
    expected_margin_impact: str

    class Config:
        from_attributes = True

class PlanOut(BaseModel):
    id: int
    plan_name: str
    strategy: str
    scenario_name: str
    created_at: datetime
    total_inventory: float
    total_demand: float
    fulfilled_demand: float
    unmet_demand: float
    spoiled_quantity: float
    gross_revenue: float
    transport_cost: float
    handling_cost: float
    discount_loss: float
    spoilage_cost: float
    net_revenue: float
    fulfillment_rate: float
    spoilage_rate: float
    infeasible_prevented: int
    execution_time_ms: float
    allocations: List[AllocationOut] = []
    discount_recommendations: List[DiscountRecommendationOut] = []

    class Config:
        from_attributes = True

class OptimizeRequest(BaseModel):
    strategy: str = "freshroute"  # "freshroute" or "baseline"
    scenario_name: str = "Normal Operation"
    scenario_key: Optional[str] = "normal"
    enable_discounts: bool = True
    min_shelf_life_buffer_hours: float = 4.0

class SimulationRequest(BaseModel):
    scenario_key: str
    enable_discounts: bool = True

class EvaluationComparisonOut(BaseModel):
    scenario_name: str
    baseline_plan: PlanOut
    optimized_plan: PlanOut
    spoilage_reduction_percent: Optional[float]
    net_revenue_lift: float
    net_revenue_lift_percent: float
    fulfillment_lift_percent: float
    spoilage_quantity_prevented_kg: float
    runtime_comparison_ms: Dict[str, float]

class DashboardMetricsOut(BaseModel):
    total_inventory_kg: float
    batches_at_risk_count: int
    total_demand_kg: float
    active_commodities: List[str]
    recent_plan: Optional[PlanOut] = None
    baseline_comparison: Optional[Dict[str, Any]] = None
    urgent_alerts: List[Dict[str, Any]] = []

class ScenarioOut(BaseModel):
    id: int
    key: str
    name: str
    description: str
    demand_multiplier: float
    travel_time_multiplier: float
    capacity_multiplier: float
    shelf_life_multiplier: float
    transport_cost_multiplier: float
    is_active: bool

    class Config:
        from_attributes = True
