import time
import logging
from typing import List, Dict, Any, Tuple
from .discounter import evaluate_discount_rules

logger = logging.getLogger(__name__)

def run_freshroute_optimization(
    batches: List[Dict[str, Any]],
    destinations: List[Dict[str, Any]],
    demands: List[Dict[str, Any]],
    transport_options: List[Dict[str, Any]],
    scenario_modifiers: Dict[str, float] = None,
    enable_discounts: bool = True,
    min_shelf_life_buffer_hours: float = 4.0
) -> Dict[str, Any]:
    """
    Intelligent Shelf-Life-Aware Dispatch Optimization (FR-04, FR-05, FR-07).
    Deterministic greedy optimization with full constraint verification & explainability.
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

    # Apply scenario modifiers to working copies
    active_batches = []
    total_inventory = 0.0
    for b in batches:
        b_copy = dict(b)
        b_copy["remaining_shelf_life"] = max(0.5, b["remaining_shelf_life"] * scenario_modifiers.get("shelf_life", 1.0))
        b_copy["available_qty"] = float(b["quantity"])
        total_inventory += b_copy["available_qty"]
        active_batches.append(b_copy)

    # Sort batches by remaining shelf life ASCENDING (FEFO - most perishable first)
    active_batches.sort(key=lambda x: (x["remaining_shelf_life"], -x["available_qty"]))

    # Prepare destinations & capacities
    dest_map = {}
    for d in destinations:
        dest_map[d["id"]] = {
            "id": d["id"],
            "name": d["name"],
            "code": d["code"],
            "location": d["location"],
            "remaining_capacity": float(d["receiving_capacity"]) * scenario_modifiers.get("capacity", 1.0),
            "total_capacity": float(d["receiving_capacity"]) * scenario_modifiers.get("capacity", 1.0),
        }

    # Prepare demands
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

    # Prepare transport options lookup: (destination_id, warehouse) -> option
    transport_lookup = {}
    dest_transport_list = {}
    for t in transport_options:
        key = (t["destination_id"], t["origin_warehouse"])
        adj_travel_time = float(t["travel_time_hours"]) * scenario_modifiers.get("travel_time", 1.0)
        adj_transport_cost = float(t["transport_cost_per_kg"]) * scenario_modifiers.get("transport_cost", 1.0)
        t_data = {
            "travel_time_hours": adj_travel_time,
            "transport_cost_per_kg": adj_transport_cost,
            "max_capacity_kg": float(t.get("max_capacity_kg", 5000.0)),
            "transport_mode": t.get("transport_mode", "Refrigerated Truck")
        }
        transport_lookup[key] = t_data
        dest_transport_list.setdefault(t["destination_id"], []).append(t_data)

    allocations = []
    discount_recommendations = []
    infeasible_prevented = 0
    rejections_log = []

    # Iterate over sorted batches (most urgent first)
    for batch in active_batches:
        b_code = batch["batch_code"]
        comm = batch["commodity"]
        warehouse = batch["storage_location"]
        shelf_life = batch["remaining_shelf_life"]
        handling_cost = float(batch.get("handling_cost", 1.5))
        procurement_cost = float(batch.get("procurement_cost", 15.0))

        if batch["available_qty"] <= 0:
            continue

        # Find potential destinations with demand for this commodity
        candidate_destinations = []
        min_transit_time = 999.0

        for dest_id, dest in dest_map.items():
            demand_key = (dest_id, comm)
            if demand_key not in active_demands:
                continue

            demand_info = active_demands[demand_key]
            if demand_info["unmet_demand"] <= 0:
                continue

            # Lookup transport
            t_opt = transport_lookup.get((dest_id, warehouse))
            if not t_opt:
                # Fallback to any transport to that destination if exact warehouse not mapped
                dest_opts = dest_transport_list.get(dest_id, [])
                if dest_opts:
                    t_opt = dest_opts[0]
                else:
                    t_opt = {"travel_time_hours": 8.0, "transport_cost_per_kg": 3.0, "max_capacity_kg": 4000.0}

            transit_time = t_opt["travel_time_hours"]
            min_transit_time = min(min_transit_time, transit_time)
            trans_cost = t_opt["transport_cost_per_kg"]

            # Feasibility Check 1: Shelf life vs Arrival time + handling buffer
            arrival_shelf_life = shelf_life - transit_time
            if arrival_shelf_life < min_shelf_life_buffer_hours:
                infeasible_prevented += 1
                rejections_log.append({
                    "batch_code": b_code,
                    "destination": dest["name"],
                    "reason": f"INSUFFICIENT SHELF LIFE: Journey requires {transit_time:.1f}h. Remaining shelf life of {shelf_life:.1f}h leaves only {arrival_shelf_life:.1f}h buffer (threshold: {min_shelf_life_buffer_hours:.1f}h). Risk of transit spoilage."
                })
                continue

            # Feasibility Check 2: Delivery deadline check
            if transit_time > demand_info["deadline"]:
                infeasible_prevented += 1
                rejections_log.append({
                    "batch_code": b_code,
                    "destination": dest["name"],
                    "reason": f"DELIVERY DEADLINE EXCEEDED: Transit ({transit_time:.1f}h) exceeds destination intake deadline ({demand_info['deadline']:.1f}h)."
                })
                continue

            # Feasibility Check 3: Destination remaining capacity
            if dest["remaining_capacity"] <= 0:
                infeasible_prevented += 1
                rejections_log.append({
                    "batch_code": b_code,
                    "destination": dest["name"],
                    "reason": f"CAPACITY EXHAUSTED: Destination {dest['name']} has reached its max intake capacity of {dest['total_capacity']:.0f}kg."
                })
                continue

            # Candidate is feasible! Calculate unit economic contribution
            unit_price = demand_info["selling_price"]
            net_unit_margin = unit_price - trans_cost - handling_cost

            candidate_destinations.append({
                "dest_id": dest_id,
                "dest_name": dest["name"],
                "transit_time": transit_time,
                "arrival_shelf_life": arrival_shelf_life,
                "trans_cost": trans_cost,
                "unit_price": unit_price,
                "net_unit_margin": net_unit_margin,
                "demand_info": demand_info,
                "dest_obj": dest
            })

        # Check discount recommendations for this batch
        total_unmet_demand = sum(c["demand_info"]["unmet_demand"] for c in candidate_destinations)
        discount_rate, risk_level, discount_reason, margin_impact = evaluate_discount_rules(
            batch,
            candidate_destinations,
            total_unmet_demand,
            min_transit_time if min_transit_time < 900 else 6.0
        )

        avg_price = (
            sum(c["unit_price"] for c in candidate_destinations) / len(candidate_destinations)
            if candidate_destinations else 30.0
        )

        if risk_level != "none" and enable_discounts:
            discount_recommendations.append({
                "batch_code": b_code,
                "commodity": comm,
                "quantity": batch["available_qty"],
                "current_shelf_life": shelf_life,
                "recommended_discount_percent": discount_rate * 100.0,
                "original_price": avg_price,
                "discounted_price": avg_price * (1.0 - discount_rate),
                "risk_level": risk_level,
                "reason": discount_reason,
                "expected_margin_impact": margin_impact
            })

        # Rank candidates: Highest net unit contribution first, breaking ties by shorter transit time
        candidate_destinations.sort(key=lambda c: (-c["net_unit_margin"], c["transit_time"]))

        # Allocate stock across ranked candidate destinations
        for cand in candidate_destinations:
            if batch["available_qty"] <= 0:
                break

            demand_info = cand["demand_info"]
            dest_obj = cand["dest_obj"]

            allocatable = min(
                batch["available_qty"],
                demand_info["unmet_demand"],
                dest_obj["remaining_capacity"]
            )

            if allocatable <= 0:
                continue

            # Apply discount if enabled for high/critical risks to stimulate clearance and avoid spoilage
            applied_discount = discount_rate if (enable_discounts and risk_level in ["high_risk", "critical"]) else 0.0
            effective_price = cand["unit_price"] * (1.0 - applied_discount)
            unit_net_contribution = effective_price - cand["trans_cost"] - handling_cost
            total_net_contribution = allocatable * unit_net_contribution

            # Update working states
            batch["available_qty"] -= allocatable
            demand_info["unmet_demand"] -= allocatable
            dest_obj["remaining_capacity"] -= allocatable

            # Build explainability message complying with FR-07
            reason = (
                f"Dispatch {allocatable:.0f} kg of {comm} to {cand['dest_name']} prioritized because batch {b_code} "
                f"has {shelf_life:.1f} hours remaining shelf life, journey takes {cand['transit_time']:.1f} hours, "
                f"leaving {cand['arrival_shelf_life']:.1f} hours fresh arrival window. Yields INR {unit_net_contribution:.2f}/kg net margin "
                f"while fully respecting {cand['dest_name']}'s receiving capacity and demand."
            )

            allocations.append({
                "batch_id": batch.get("id"),
                "batch_code": b_code,
                "destination_id": cand["dest_id"],
                "destination_name": cand["dest_name"],
                "commodity": comm,
                "allocated_quantity": allocatable,
                "travel_time_hours": cand["transit_time"],
                "arrival_shelf_life_remaining": cand["arrival_shelf_life"],
                "unit_price": cand["unit_price"],
                "unit_transport_cost": cand["trans_cost"],
                "unit_handling_cost": handling_cost,
                "discount_percent": applied_discount * 100.0,
                "effective_selling_price": effective_price,
                "net_contribution": total_net_contribution,
                "reason": reason,
                "constraint_checks": {
                    "shelf_life_feasible": True,
                    "within_receiving_capacity": True,
                    "within_unmet_demand": True,
                    "arrival_buffer_hours": cand["arrival_shelf_life"]
                }
            })

    # Economic metrics calculation according to PRD section 11
    fulfilled_demand = sum(a["allocated_quantity"] for a in allocations)
    unmet_demand = max(0.0, total_demand_kg - fulfilled_demand)
    
    # Leftover inventory: evaluate spoilage vs healthy warehouse retention
    # In agricultural logistics, produce left unallocated with low remaining shelf-life (< 24h or < transit buffer) spoils.
    # High shelf-life items (e.g. Onion with 120h) remain securely in cold storage.
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
    discount_loss = sum(a["allocated_quantity"] * (a["unit_price"] - a["effective_selling_price"]) for a in allocations)
    effective_sales = gross_revenue - discount_loss
    transport_cost = sum(a["allocated_quantity"] * a["unit_transport_cost"] for a in allocations)
    handling_cost = sum(a["allocated_quantity"] * a["unit_handling_cost"] for a in allocations)

    # Net Revenue formula: Effective Sales - Transport - Handling - Spoilage Costs
    net_revenue = effective_sales - transport_cost - handling_cost - spoilage_cost

    fulfillment_rate = (fulfilled_demand / total_demand_kg * 100.0) if total_demand_kg > 0 else 0.0
    spoilage_rate = (spoiled_quantity / total_inventory * 100.0) if total_inventory > 0 else 0.0
    execution_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return {
        "strategy": "freshroute",
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
        "discount_recommendations": discount_recommendations,
        "rejections": rejections_log
    }
