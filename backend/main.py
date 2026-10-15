import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from .models import (
    InventoryBatch,
    Destination,
    Demand,
    TransportOption,
    DistributionPlan,
    Allocation,
    DiscountRecommendation,
    Scenario
)
from .schemas import (
    BatchCreate,
    BatchUpdate,
    BatchOut,
    DestinationCreate,
    DestinationUpdate,
    DestinationOut,
    DemandCreate,
    DemandCreateIn,
    DemandUpdate,
    DemandOut,
    PlanOut,
    OptimizeRequest,
    SimulationRequest,
    EvaluationComparisonOut,
    DashboardMetricsOut,
    ScenarioOut
)
from .engine.optimizer import run_freshroute_optimization
from .engine.baseline import run_baseline_optimization
from .engine.evaluator import compute_evaluation_comparison
from .engine.scenarios import get_scenario_by_key, DEFAULT_SCENARIOS
from .seed import seed_database, reset_and_seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FreshRoute")

app = FastAPI(
    title="FreshRoute API",
    description="Intelligent Decision Support Platform for Perishable Produce Distribution (PS 03)",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()

# ----------------- Seed & System Endpoints ----------------- #
@app.post("/api/system/reset-seed", tags=["System"])
def reset_seed_data(db: Session = Depends(get_db)):
    """Resets the entire database with the clean synthetic dataset for reproducible judging."""
    reset_and_seed(db)
    return {"status": "success", "message": "Database reset and seeded with default agricultural scenario"}

# ----------------- Dashboard Endpoints ----------------- #
@app.get("/api/dashboard", response_model=DashboardMetricsOut, tags=["Dashboard"])
def get_dashboard_metrics(db: Session = Depends(get_db)):
    batches = db.query(InventoryBatch).filter(InventoryBatch.quantity > 0).all()
    total_inventory = sum(b.quantity for b in batches)
    batches_at_risk = sum(1 for b in batches if b.remaining_shelf_life <= 24.0)

    demands = db.query(Demand).all()
    total_demand = sum(d.demand_quantity for d in demands)
    active_commodities = list(set(b.commodity for b in batches))

    # Fetch most recent plan if any
    recent_plan_db = db.query(DistributionPlan).order_by(DistributionPlan.created_at.desc()).first()
    recent_plan = None
    if recent_plan_db:
        recent_plan = recent_plan_db

    # Urgent risk alerts
    urgent_alerts = []
    for b in batches:
        if b.remaining_shelf_life <= 12.0:
            urgent_alerts.append({
                "severity": "CRITICAL",
                "batch_code": b.batch_code,
                "commodity": b.commodity,
                "quantity": b.quantity,
                "remaining_hours": b.remaining_shelf_life,
                "warehouse": b.storage_location,
                "message": f"Critical degradation risk: {b.commodity} lot ({b.batch_code}) has only {b.remaining_shelf_life:.1f}h remaining shelf life."
            })
        elif b.remaining_shelf_life <= 24.0:
            urgent_alerts.append({
                "severity": "WARNING",
                "batch_code": b.batch_code,
                "commodity": b.commodity,
                "quantity": b.quantity,
                "remaining_hours": b.remaining_shelf_life,
                "warehouse": b.storage_location,
                "message": f"Priority dispatch advised: {b.commodity} ({b.batch_code}) with {b.remaining_shelf_life:.1f}h shelf life."
            })

    return {
        "total_inventory_kg": total_inventory,
        "batches_at_risk_count": batches_at_risk,
        "total_demand_kg": total_demand,
        "active_commodities": active_commodities,
        "recent_plan": recent_plan,
        "urgent_alerts": urgent_alerts[:8]
    }

# ----------------- Batches Endpoints ----------------- #
@app.get("/api/batches", response_model=List[BatchOut], tags=["Inventory"])
def list_batches(commodity: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(InventoryBatch)
    if commodity:
        query = query.filter(InventoryBatch.commodity.ilike(f"%{commodity}%"))
    return query.order_by(InventoryBatch.remaining_shelf_life.asc()).all()

@app.post("/api/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED, tags=["Inventory"])
def create_batch(batch_in: BatchCreate, db: Session = Depends(get_db)):
    # Check duplicate
    existing = db.query(InventoryBatch).filter(InventoryBatch.batch_code == batch_in.batch_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Batch code {batch_in.batch_code} already exists")

    batch = InventoryBatch(
        batch_code=batch_in.batch_code,
        commodity=batch_in.commodity,
        quantity=batch_in.quantity,
        initial_quantity=batch_in.quantity,
        remaining_shelf_life=batch_in.remaining_shelf_life,
        storage_location=batch_in.storage_location,
        handling_cost=batch_in.handling_cost,
        procurement_cost=batch_in.procurement_cost,
        status="available",
        notes=batch_in.notes
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch

@app.put("/api/batches/{batch_id}", response_model=BatchOut, tags=["Inventory"])
def update_batch(batch_id: int, batch_in: BatchUpdate, db: Session = Depends(get_db)):
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    update_data = batch_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(batch, field, val)

    db.commit()
    db.refresh(batch)
    return batch

@app.delete("/api/batches/{batch_id}", tags=["Inventory"])
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    db.delete(batch)
    db.commit()
    return {"status": "success", "message": f"Batch {batch.batch_code} deleted successfully"}

# ----------------- Destinations Endpoints ----------------- #
@app.get("/api/destinations", response_model=List[DestinationOut], tags=["Destinations"])
def list_destinations(db: Session = Depends(get_db)):
    return db.query(Destination).all()

@app.post("/api/destinations", response_model=DestinationOut, status_code=status.HTTP_201_CREATED, tags=["Destinations"])
def create_destination(dest_in: DestinationCreate, db: Session = Depends(get_db)):
    existing = db.query(Destination).filter(Destination.code == dest_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Destination code {dest_in.code} already exists")

    dest = Destination(
        code=dest_in.code,
        name=dest_in.name,
        location=dest_in.location,
        state=dest_in.state,
        receiving_capacity=dest_in.receiving_capacity,
        latitude=dest_in.latitude,
        longitude=dest_in.longitude
    )
    db.add(dest)
    db.flush()

    if dest_in.demands:
        for dm in dest_in.demands:
            d_obj = Demand(
                destination_id=dest.id,
                commodity=dm.commodity,
                demand_quantity=dm.demand_quantity,
                selling_price=dm.selling_price,
                delivery_deadline_hours=dm.delivery_deadline_hours
            )
            db.add(d_obj)

    if dest_in.transport_options:
        for tp in dest_in.transport_options:
            t_obj = TransportOption(
                destination_id=dest.id,
                origin_warehouse=tp.origin_warehouse,
                travel_time_hours=tp.travel_time_hours,
                transport_cost_per_kg=tp.transport_cost_per_kg,
                max_capacity_kg=tp.max_capacity_kg,
                transport_mode=tp.transport_mode
            )
            db.add(t_obj)

    db.commit()
    db.refresh(dest)
    return dest

@app.put("/api/destinations/{dest_id}", response_model=DestinationOut, tags=["Destinations"])
def update_destination(dest_id: int, dest_in: DestinationUpdate, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == dest_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    
    update_data = dest_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(dest, field, val)
        
    db.commit()
    db.refresh(dest)
    return dest

@app.delete("/api/destinations/{dest_id}", tags=["Destinations"])
def delete_destination(dest_id: int, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == dest_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
        
    db.query(Demand).filter(Demand.destination_id == dest_id).delete()
    db.query(TransportOption).filter(TransportOption.destination_id == dest_id).delete()
    db.delete(dest)
    db.commit()
    return {"status": "success", "message": f"Destination {dest.name} deleted successfully"}

@app.post("/api/destinations/{dest_id}/demands", response_model=DemandOut, status_code=status.HTTP_201_CREATED, tags=["Destinations"])
def add_destination_demand(dest_id: int, demand_in: DemandCreateIn, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == dest_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
        
    dm = Demand(
        destination_id=dest_id,
        commodity=demand_in.commodity,
        demand_quantity=demand_in.demand_quantity,
        selling_price=demand_in.selling_price,
        delivery_deadline_hours=demand_in.delivery_deadline_hours
    )
    db.add(dm)
    db.commit()
    db.refresh(dm)
    return dm

@app.put("/api/demands/{demand_id}", response_model=DemandOut, tags=["Destinations"])
def update_demand(demand_id: int, demand_in: DemandUpdate, db: Session = Depends(get_db)):
    dm = db.query(Demand).filter(Demand.id == demand_id).first()
    if not dm:
        raise HTTPException(status_code=404, detail="Demand not found")
        
    update_data = demand_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(dm, field, val)
        
    db.commit()
    db.refresh(dm)
    return dm

@app.delete("/api/demands/{demand_id}", tags=["Destinations"])
def delete_demand(demand_id: int, db: Session = Depends(get_db)):
    dm = db.query(Demand).filter(Demand.id == demand_id).first()
    if not dm:
        raise HTTPException(status_code=404, detail="Demand not found")
        
    db.delete(dm)
    db.commit()
    return {"status": "success", "message": "Demand deleted successfully"}

# ----------------- Scenarios ----------------- #
@app.get("/api/scenarios", response_model=List[ScenarioOut], tags=["Scenarios"])
def get_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(Scenario).all()
    if not scenarios:
        for s in DEFAULT_SCENARIOS:
            db.add(Scenario(**s))
        db.commit()
        scenarios = db.query(Scenario).all()
    return scenarios

# ----------------- Helpers for Data Extraction ----------------- #
def _extract_engine_inputs(db: Session):
    batches = [
        {
            "id": b.id,
            "batch_code": b.batch_code,
            "commodity": b.commodity,
            "quantity": b.quantity,
            "remaining_shelf_life": b.remaining_shelf_life,
            "storage_location": b.storage_location,
            "handling_cost": b.handling_cost,
            "procurement_cost": b.procurement_cost
        }
        for b in db.query(InventoryBatch).filter(InventoryBatch.quantity > 0).all()
    ]

    destinations = [
        {
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "location": d.location,
            "receiving_capacity": d.receiving_capacity,
            "latitude": d.latitude,
            "longitude": d.longitude
        }
        for d in db.query(Destination).all()
    ]

    demands = [
        {
            "id": dm.id,
            "destination_id": dm.destination_id,
            "commodity": dm.commodity,
            "demand_quantity": dm.demand_quantity,
            "selling_price": dm.selling_price,
            "delivery_deadline_hours": dm.delivery_deadline_hours
        }
        for dm in db.query(Demand).all()
    ]

    transport_options = [
        {
            "id": t.id,
            "destination_id": t.destination_id,
            "origin_warehouse": t.origin_warehouse,
            "travel_time_hours": t.travel_time_hours,
            "transport_cost_per_kg": t.transport_cost_per_kg,
            "max_capacity_kg": t.max_capacity_kg,
            "transport_mode": t.transport_mode
        }
        for t in db.query(TransportOption).all()
    ]

    return batches, destinations, demands, transport_options

def _persist_plan(result: dict, plan_name: str, scenario_name: str, db: Session) -> DistributionPlan:
    plan = DistributionPlan(
        plan_name=plan_name,
        strategy=result["strategy"],
        scenario_name=scenario_name,
        total_inventory=result["total_inventory"],
        total_demand=result["total_demand"],
        fulfilled_demand=result["fulfilled_demand"],
        unmet_demand=result["unmet_demand"],
        spoiled_quantity=result["spoiled_quantity"],
        gross_revenue=result["gross_revenue"],
        transport_cost=result["transport_cost"],
        handling_cost=result["handling_cost"],
        discount_loss=result["discount_loss"],
        spoilage_cost=result["spoilage_cost"],
        net_revenue=result["net_revenue"],
        fulfillment_rate=result["fulfillment_rate"],
        spoilage_rate=result["spoilage_rate"],
        infeasible_prevented=result["infeasible_prevented"],
        execution_time_ms=result["execution_time_ms"]
    )
    db.add(plan)
    db.flush()

    for a in result["allocations"]:
        alloc = Allocation(
            plan_id=plan.id,
            batch_id=a.get("batch_id"),
            batch_code=a["batch_code"],
            destination_id=a.get("destination_id"),
            destination_name=a["destination_name"],
            commodity=a["commodity"],
            allocated_quantity=a["allocated_quantity"],
            travel_time_hours=a["travel_time_hours"],
            arrival_shelf_life_remaining=a["arrival_shelf_life_remaining"],
            unit_price=a["unit_price"],
            unit_transport_cost=a["unit_transport_cost"],
            unit_handling_cost=a["unit_handling_cost"],
            discount_percent=a["discount_percent"],
            effective_selling_price=a["effective_selling_price"],
            net_contribution=a["net_contribution"],
            reason=a["reason"],
            constraint_checks=a.get("constraint_checks")
        )
        db.add(alloc)

    for disc in result["discount_recommendations"]:
        d_rec = DiscountRecommendation(
            plan_id=plan.id,
            batch_code=disc["batch_code"],
            commodity=disc["commodity"],
            quantity=disc["quantity"],
            current_shelf_life=disc["current_shelf_life"],
            recommended_discount_percent=disc["recommended_discount_percent"],
            original_price=disc["original_price"],
            discounted_price=disc["discounted_price"],
            risk_level=disc["risk_level"],
            reason=disc["reason"],
            expected_margin_impact=disc["expected_margin_impact"]
        )
        db.add(d_rec)

    db.commit()
    db.refresh(plan)
    return plan

# ----------------- Planning & Optimization Endpoints ----------------- #
@app.post("/api/plans/optimize", response_model=PlanOut, tags=["Optimization"])
def generate_optimized_plan(req: OptimizeRequest, db: Session = Depends(get_db)):
    batches, destinations, demands, transport_options = _extract_engine_inputs(db)
    
    scenario_cfg = get_scenario_by_key(req.scenario_key or "normal")
    modifiers = {
        "demand": scenario_cfg["demand_multiplier"],
        "travel_time": scenario_cfg["travel_time_multiplier"],
        "capacity": scenario_cfg["capacity_multiplier"],
        "shelf_life": scenario_cfg["shelf_life_multiplier"],
        "transport_cost": scenario_cfg["transport_cost_multiplier"]
    }

    result = run_freshroute_optimization(
        batches=batches,
        destinations=destinations,
        demands=demands,
        transport_options=transport_options,
        scenario_modifiers=modifiers,
        enable_discounts=req.enable_discounts,
        min_shelf_life_buffer_hours=req.min_shelf_life_buffer_hours
    )

    plan_name = f"FreshRoute Optimized - {scenario_cfg['name']}"
    plan = _persist_plan(result, plan_name, scenario_cfg['name'], db)
    return plan

@app.post("/api/plans/baseline", response_model=PlanOut, tags=["Optimization"])
def generate_baseline_plan(req: OptimizeRequest, db: Session = Depends(get_db)):
    batches, destinations, demands, transport_options = _extract_engine_inputs(db)

    scenario_cfg = get_scenario_by_key(req.scenario_key or "normal")
    modifiers = {
        "demand": scenario_cfg["demand_multiplier"],
        "travel_time": scenario_cfg["travel_time_multiplier"],
        "capacity": scenario_cfg["capacity_multiplier"],
        "shelf_life": scenario_cfg["shelf_life_multiplier"],
        "transport_cost": scenario_cfg["transport_cost_multiplier"]
    }

    result = run_baseline_optimization(
        batches=batches,
        destinations=destinations,
        demands=demands,
        transport_options=transport_options,
        scenario_modifiers=modifiers,
        min_shelf_life_buffer_hours=req.min_shelf_life_buffer_hours
    )

    plan_name = f"Baseline Plan - {scenario_cfg['name']}"
    plan = _persist_plan(result, plan_name, scenario_cfg['name'], db)
    return plan

# ----------------- Scenario Simulation & Comparative Evaluation ----------------- #
@app.post("/api/simulations/run", response_model=EvaluationComparisonOut, tags=["Simulation"])
def run_simulation(req: SimulationRequest, db: Session = Depends(get_db)):
    batches, destinations, demands, transport_options = _extract_engine_inputs(db)
    scenario_cfg = get_scenario_by_key(req.scenario_key)

    modifiers = {
        "demand": scenario_cfg["demand_multiplier"],
        "travel_time": scenario_cfg["travel_time_multiplier"],
        "capacity": scenario_cfg["capacity_multiplier"],
        "shelf_life": scenario_cfg["shelf_life_multiplier"],
        "transport_cost": scenario_cfg["transport_cost_multiplier"]
    }

    # Run both strategies on identical input parameters
    baseline_result = run_baseline_optimization(
        batches=batches,
        destinations=destinations,
        demands=demands,
        transport_options=transport_options,
        scenario_modifiers=modifiers
    )

    freshroute_result = run_freshroute_optimization(
        batches=batches,
        destinations=destinations,
        demands=demands,
        transport_options=transport_options,
        scenario_modifiers=modifiers,
        enable_discounts=req.enable_discounts
    )

    # Persist both plans for record
    p_base = _persist_plan(baseline_result, f"Baseline Simulation - {scenario_cfg['name']}", scenario_cfg['name'], db)
    p_opt = _persist_plan(freshroute_result, f"FreshRoute Simulation - {scenario_cfg['name']}", scenario_cfg['name'], db)

    # Convert to schema format
    comparison = compute_evaluation_comparison(baseline_result, freshroute_result, scenario_cfg["name"])
    
    return {
        "scenario_name": scenario_cfg["name"],
        "baseline_plan": p_base,
        "optimized_plan": p_opt,
        "spoilage_reduction_percent": comparison["spoilage_reduction_percent"],
        "net_revenue_lift": comparison["net_revenue_lift"],
        "net_revenue_lift_percent": comparison["net_revenue_lift_percent"],
        "fulfillment_lift_percent": comparison["fulfillment_lift_percent"],
        "spoilage_quantity_prevented_kg": comparison["spoilage_quantity_prevented_kg"],
        "runtime_comparison_ms": comparison["runtime_comparison_ms"]
    }

@app.get("/api/evaluations/{plan_id}", tags=["Evaluation"])
def get_evaluation(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(DistributionPlan).filter(DistributionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan
