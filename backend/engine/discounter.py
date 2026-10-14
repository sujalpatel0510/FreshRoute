import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def evaluate_discount_rules(
    batch_dict: Dict[str, Any],
    feasible_destinations: List[Dict[str, Any]],
    unmet_demand_total: float,
    min_transit_time_hours: float
) -> Tuple[float, str, str, str]:
    """
    Evaluates discount rules according to FR-05:
    - Critical: Remaining shelf life is shorter than minimum feasible delivery time + buffer.
    - High risk: Remaining shelf life is short (< 18 hrs) and no feasible destination has enough demand.
    - Discount candidate: Feasible destination exists, but expected selling opportunity needs a price incentive (< 36 hrs).
    - No discount needed: Sufficient shelf life (> 36 hrs) and suitable demand.

    Returns:
    (discount_percent, risk_level, reason, impact_summary)
    """
    shelf_life = batch_dict.get("remaining_shelf_life", 0.0)
    qty = batch_dict.get("quantity", 0.0)

    # Rule 1: Critical - shelf life less than min transit + 2h handling buffer
    if shelf_life <= (min_transit_time_hours + 2.0):
        discount = 0.40 # 40% discount for emergency clearance
        risk = "critical"
        reason = (
            f"CRITICAL EXPIRY: Batch has only {shelf_life:.1f}h shelf life remaining against "
            f"a minimum transit time of {min_transit_time_hours:.1f}h. A 40% clearance discount is required to stimulate urgent priority intake."
        )
        impact = f"Preserves up to 60% of inventory value rather than incurring total spoilage write-off."
        return discount, risk, reason, impact

    # Rule 2: High Risk - shelf life < 20h and unmet demand is less than batch quantity
    if shelf_life <= 20.0 and unmet_demand_total < qty:
        discount = 0.25
        risk = "high_risk"
        reason = (
            f"HIGH SPOILAGE RISK: {shelf_life:.1f}h shelf life with only {unmet_demand_total:.1f}kg "
            f"unmet market demand vs {qty:.1f}kg stock. Recommending 25% discount to clear excess volume before terminal degradation."
        )
        impact = f"Avoids leaving {(qty - unmet_demand_total):.1f}kg unsold in cold storage."
        return discount, risk, reason, impact

    # Rule 3: Discount Candidate - shelf life < 36h
    if shelf_life <= 36.0:
        discount = 0.15
        risk = "candidate"
        reason = (
            f"NEAR-WINDOW CANDIDATE: Shelf life is {shelf_life:.1f}h. Recommending a modest 15% discount "
            f"to ensure preferential retailer shelf placement and swift inventory turnover."
        )
        impact = f"Accelerates downstream sales velocity while retaining 85% gross margin."
        return discount, risk, reason, impact

    # Rule 4: No discount needed
    return 0.0, "none", f"Batch has healthy shelf life ({shelf_life:.1f}h). Standard market pricing applies.", "Full margin preserved."
