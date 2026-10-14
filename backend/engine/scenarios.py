from typing import Dict, Any, List

DEFAULT_SCENARIOS = [
    {
        "key": "normal",
        "name": "Normal Distribution",
        "description": "Baseline operational conditions with standard highway travel times, normal APMC demand, and rated truck capacities.",
        "demand_multiplier": 1.0,
        "travel_time_multiplier": 1.0,
        "capacity_multiplier": 1.0,
        "shelf_life_multiplier": 1.0,
        "transport_cost_multiplier": 1.0,
        "is_active": True
    },
    {
        "key": "monsoon_delay",
        "name": "Monsoon Highway Inundation",
        "description": "Severe monsoon flooding along Western Ghats corridors increases transit durations by +60%, testing shelf-life viability and route feasibility.",
        "demand_multiplier": 1.0,
        "travel_time_multiplier": 1.6,
        "capacity_multiplier": 1.0,
        "shelf_life_multiplier": 1.0,
        "transport_cost_multiplier": 1.25,
        "is_active": False
    },
    {
        "key": "heatwave_expiry",
        "name": "Extreme Summer Heatwave",
        "description": "Ambient temperatures soaring to 44°C reduce effective shelf lives by 40% across non-precooled transit, testing urgent clearance dispatch and discount triggers.",
        "demand_multiplier": 1.0,
        "travel_time_multiplier": 1.0,
        "capacity_multiplier": 1.0,
        "shelf_life_multiplier": 0.6,
        "transport_cost_multiplier": 1.0,
        "is_active": False
    },
    {
        "key": "market_demand_drop",
        "name": "Sudden Urban Demand Contraction",
        "description": "Post-festival lull contracts terminal mandi demand by 35%, challenging distributor allocation balance and triggering selective clearance discounting.",
        "demand_multiplier": 0.65,
        "travel_time_multiplier": 1.0,
        "capacity_multiplier": 1.0,
        "shelf_life_multiplier": 1.0,
        "transport_cost_multiplier": 1.0,
        "is_active": False
    },
    {
        "key": "fleet_breakdown",
        "name": "Cold-Chain Fleet Capacity Crunch",
        "description": "Reefer vehicle maintenance bottlenecks restrict total transport capacity by 45%, forcing selective prioritization of high-value, highly perishable lots.",
        "demand_multiplier": 1.0,
        "travel_time_multiplier": 1.0,
        "capacity_multiplier": 0.55,
        "shelf_life_multiplier": 1.0,
        "transport_cost_multiplier": 1.3,
        "is_active": False
    },
    {
        "key": "fuel_cost_spike",
        "name": "Diesel Price Escalation",
        "description": "Spike in commercial diesel prices increases logistics tariffs by +75%, testing whether distant destinations remain net-positive.",
        "demand_multiplier": 1.0,
        "travel_time_multiplier": 1.0,
        "capacity_multiplier": 1.0,
        "shelf_life_multiplier": 1.0,
        "transport_cost_multiplier": 1.75,
        "is_active": False
    }
]

def get_scenario_by_key(key: str) -> Dict[str, Any]:
    for s in DEFAULT_SCENARIOS:
        if s["key"] == key:
            return s
    return DEFAULT_SCENARIOS[0]
