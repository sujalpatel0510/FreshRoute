import time
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def run_baseline_optimization(
    batches: List[Dict[str, Any]],
    destinations: List[Dict[str, Any]],
    demands: List[Dict[str, Any]],
    transport_options: List[Dict[str, Any]],
    scenario_modifiers: Dict[str, float] = None,
    min_shelf_life_buffer_hours: float = 4.0
) -> Dict[str, Any]:
    """
    Baseline Planning Strategy (FR-06):
    - Fixed sequential order allocation (FIFO / batch arrival order, NOT shelf-life urgency sorted).
    - Allocates to destinations in simple fixed order without smart cross-margin optimization.
    - No proactive discounting to stimulate velocity for at-risk inventory.
    - Strictly enforces physical feasibility constraints (shelf-life, capacity, deadline)
      so the comparison is 100% fair and rigorous.
    """
    start_time = time.perf_counter()
    if scenario_modifiers is None:
        scenario_modifiers = {
            "demand": 1.0,
            "travel_time": 1.0,
            "capacity": 1.0,
            "shelf_life": 1.0,
            "transport_cost": 1.0
        }

    # Batches processed in natural/FIFO arrival order (by id / insertion order)
    active_batches = []
    total_inventory = 0.0
    for b in sorted(batches, key=lambda x: x.get("id", 0)):
        b_copy = dict(b)
        b_copy["remaining_shelf_life"] = max(0.5, b["remaining_shelf_life"] * scenario_modifiers.get("shelf_life", 1.0))
        b_copy["available_qty"] = float(b["quantity"])
        total_inventory += b_copy["available_qty"]
        active_batches.append(b_copy)

    # Destinations in fixed alphabetical order
    dest_map = {}
    for d in sorted(destinations, key=lambda x: x["name"]):
        dest_map[d["id"]] = {
            "id": d["id"],
            "name": d["name"],
            "code": d["code"],
            "location": d["location"],
            "remaining_capacity": float(d["receiving_capacity"]) * scenario_modifiers.get("capacity", 1.0),
            "total_capacity": float(d["receiving_capacity"]) * scenario_modifiers.get("capacity", 1.0),
        }

    # Demands
    active_demands = {}
    total_demand_kg = 0.0
    for dm in demands:
        d_id = dm["destination_id"]
        comm = dm["commodity"]
        key = (d_id, comm)
        adj_demand = float(dm["demand_quantity"]) * scenario_modifiers.get("demand", 1.0)
        total_demand_kg += adj_demand
        active_demands[key] = {
            "id": dm.get("id"),
            "destination_id": d_id,
            "commodity": comm,
            "unmet_demand": adj_demand,
            "total_demand": adj_demand,
            "selling_price": float(dm["selling_price"]),
            "deadline": float(dm.get("delivery_deadline_hours", 48.0))
        }

    # Transport options lookup
    transport_lookup = {}
    for t in transport_options:
        key = (t["destination_id"], t["origin_warehouse"])
        transport_lookup[key] = {
            "travel_time_hours": float(t["travel_time_hours"]) * scenario_modifiers.get("travel_time", 1.0),
            "transport_cost_per_kg": float(t["transport_cost_per_kg"]) * scenario_modifiers.get("transport_cost", 1.0),
            "max_capacity_kg": float(t.get("max_capacity_kg", 5000.0)),
        }

    allocations = []
    infeasible_prevented = 0
    rejections_log = []

    # Baseline sequential loop
    for batch in active_batches:
        b_code = batch["batch_code"]
        comm = batch["commodity"]
        warehouse = batch["storage_location"]
        shelf_life = batch["remaining_shelf_life"]
        handling_cost = float(batch.get("handling_cost", 1.5))

        if batch["available_qty"] <= 0:
            continue

        for dest_id, dest in dest_map.items():
            if batch["available_qty"] <= 0:
                break

            demand_key = (dest_id, comm)
            if demand_key not in active_demands:
                continue

            demand_info = active_demands[demand_key]
            if demand_info["unmet_demand"] <= 0:
                continue

            t_opt = transport_lookup.get((dest_id, warehouse), {
                "travel_time_hours": 8.0,
                "transport_cost_per_kg": 3.0,
                "max_capacity_kg": 4000.0
            })

            transit_time = t_opt["travel_time_hours"]
            trans_cost = t_opt["transport_cost_per_kg"]

            # Baseline Feasibility checks (enforced so invalid dispatches don't execute)
            arrival_shelf_life = shelf_life - transit_time
            if arrival_shelf_life < min_shelf_life_buffer_hours:
                infeasible_prevented += 1
                rejections_log.append({
                    "batch_code": b_code,
                    "destination": dest["name"],
                    "reason": f"Baseline Rejection: Shelf life expired or arrival buffer too narrow ({arrival_shelf_life:.1f}h)."
                })
                continue

            if transit_time > demand_info["deadline"] or dest["remaining_capacity"] <= 0:
                infeasible_prevented += 1
                continue

            allocatable = min(
                batch["available_qty"],
                demand_info["unmet_demand"],
                dest["remaining_capacity"]
            )

            if allocatable <= 0:
                continue

            unit_price = demand_info["selling_price"]
            net_unit_margin = unit_price - trans_cost - handling_cost
            total_net = allocatable * net_unit_margin

            batch["available_qty"] -= allocatable
            demand_info["unmet_demand"] -= allocatable
            dest["remaining_capacity"] -= allocatable

            reason = (
                f"Baseline dispatch: Assigned {allocatable:.0f}kg of {comm} to {dest['name']} in fixed FIFO sequence. "
                f"No shelf-life priority applied."
            )

            allocations.append({
                "batch_id": batch.get("id"),
                "batch_code": b_code,
                "destination_id": dest_id,
                "destination_name": dest["name"],
                "commodity": comm,
                "allocated_quantity": allocatable,
                "travel_time_hours": transit_time,
                "arrival_shelf_life_remaining": arrival_shelf_life,
                "unit_price": unit_price,
                "unit_transport_cost": trans_cost,
                "unit_handling_cost": handling_cost,
                "discount_percent": 0.0,
                "effective_selling_price": unit_price,
                "net_contribution": total_net,
                "reason": reason,
                "constraint_checks": {
                    "shelf_life_feasible": True,
                    "within_receiving_capacity": True,
                    "within_unmet_demand": True,
                    "arrival_buffer_hours": arrival_shelf_life
                }
            })

    # Economic metrics
    fulfilled_demand = sum(a["allocated_quantity"] for a in allocations)
    unmet_demand = max(0.0, total_demand_kg - fulfilled_demand)

    # Leftover inventory: evaluate spoilage vs healthy warehouse retention
    spoiled_quantity = 0.0
    spoilage_cost = 0.0
    retained_inventory_qty = 0.0
    for b in active_batches:
        if b["available_qty"] > 0:
            if b["remaining_shelf_life"] <= 24.0:
                spoiled_quantity += b["available_qty"]
                spoilage_cost += b["available_qty"] * float(b.get("procurement_cost", 15.0))
            else:
                retained_inventory_qty += b["available_qty"]

    gross_revenue = sum(a["allocated_quantity"] * a["unit_price"] for a in allocations)
    transport_cost = sum(a["allocated_quantity"] * a["unit_transport_cost"] for a in allocations)
    handling_cost = sum(a["allocated_quantity"] * a["unit_handling_cost"] for a in allocations)
    discount_loss = 0.0

    net_revenue = gross_revenue - transport_cost - handling_cost - spoilage_cost

    fulfillment_rate = (fulfilled_demand / total_demand_kg * 100.0) if total_demand_kg > 0 else 0.0
    spoilage_rate = (spoiled_quantity / total_inventory * 100.0) if total_inventory > 0 else 0.0
    execution_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return {
        "strategy": "baseline",
        "total_inventory": total_inventory,
        "total_demand": total_demand_kg,
        "fulfilled_demand": fulfilled_demand,
        "unmet_demand": unmet_demand,
        "spoiled_quantity": spoiled_quantity,
        "gross_revenue": gross_revenue,
        "transport_cost": transport_cost,
        "handling_cost": handling_cost,
        "discount_loss": discount_loss,
        "spoilage_cost": spoilage_cost,
        "net_revenue": net_revenue,
        "fulfillment_rate": fulfillment_rate,
        "spoilage_rate": spoilage_rate,
        "infeasible_prevented": infeasible_prevented,
        "execution_time_ms": execution_time_ms,
        "allocations": allocations,
        "discount_recommendations": [],
        "rejections": rejections_log
    }
