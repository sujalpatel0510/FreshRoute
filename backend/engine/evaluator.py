from typing import Dict, Any, Optional

def compute_evaluation_comparison(
    baseline: Dict[str, Any],
    optimized: Dict[str, Any],
    scenario_name: str = "Normal Operation"
) -> Dict[str, Any]:
    """
    Computes rigorous metrics comparing FreshRoute against the Baseline (Section 11).
    - Spoilage rate: (Spoiled / Total) * 100
    - Demand fulfillment: (Delivered / Total Demand) * 100
    - Net revenue = Sales - Transport - Handling - Discount - Spoilage
    - Spoilage reduction vs baseline: ((Sb - So) / Sb) * 100
    """
    sb = baseline.get("spoiled_quantity", 0.0)
    so = optimized.get("spoiled_quantity", 0.0)

    if sb > 0:
        spoilage_reduction_pct = round(((sb - so) / sb) * 100.0, 2)
    else:
        spoilage_reduction_pct = 0.0 if so == 0 else None

    spoilage_prevented_kg = max(0.0, sb - so)

    b_net = baseline.get("net_revenue", 0.0)
    o_net = optimized.get("net_revenue", 0.0)
    net_revenue_lift = round(o_net - b_net, 2)

    if abs(b_net) > 0:
        net_revenue_lift_pct = round((net_revenue_lift / abs(b_net)) * 100.0, 2)
    else:
        net_revenue_lift_pct = 0.0

    b_ful = baseline.get("fulfillment_rate", 0.0)
    o_ful = optimized.get("fulfillment_rate", 0.0)
    fulfillment_lift_pct = round(o_ful - b_ful, 2)

    return {
        "scenario_name": scenario_name,
        "baseline_plan": baseline,
        "optimized_plan": optimized,
        "spoilage_reduction_percent": spoilage_reduction_pct,
        "net_revenue_lift": net_revenue_lift,
        "net_revenue_lift_percent": net_revenue_lift_pct,
        "fulfillment_lift_percent": fulfillment_lift_pct,
        "spoilage_quantity_prevented_kg": spoilage_prevented_kg,
        "runtime_comparison_ms": {
            "baseline_ms": baseline.get("execution_time_ms", 0.0),
            "freshroute_ms": optimized.get("execution_time_ms", 0.0)
        }
    }
