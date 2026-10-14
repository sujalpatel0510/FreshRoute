from backend.database import SessionLocal
from backend.main import _extract_engine_inputs
from backend.engine.optimizer import run_freshroute_optimization
from backend.engine.baseline import run_baseline_optimization
from backend.engine.scenarios import DEFAULT_SCENARIOS
from backend.engine.evaluator import compute_evaluation_comparison

db = SessionLocal()
batches, dests, demands, transports = _extract_engine_inputs(db)

for sc in DEFAULT_SCENARIOS:
    mod = {
        'demand': sc['demand_multiplier'],
        'travel_time': sc['travel_time_multiplier'],
        'capacity': sc['capacity_multiplier'],
        'shelf_life': sc['shelf_life_multiplier'],
        'transport_cost': sc['transport_cost_multiplier']
    }
    opt = run_freshroute_optimization(batches, dests, demands, transports, mod)
    base = run_baseline_optimization(batches, dests, demands, transports, mod)
    comp = compute_evaluation_comparison(base, opt, sc['name'])
    print(f"\n=== Scenario: {sc['name']} ===")
    print(f"  FreshRoute Spoilage: {opt['spoiled_quantity']:.0f} kg ({opt['spoilage_rate']:.1f}%) | Baseline Spoilage: {base['spoiled_quantity']:.0f} kg ({base['spoilage_rate']:.1f}%)")
    print(f"  FreshRoute Net Rev:  INR {opt['net_revenue']:,.0f} | Baseline Net Rev: INR {base['net_revenue']:,.0f}")
    print(f"  Spoilage Reduction:  {comp['spoilage_reduction_percent']}% | Spoilage Prevented: {comp['spoilage_quantity_prevented_kg']:.0f} kg")
    print(f"  Infeasible Prevented: {opt['infeasible_prevented']} | Runtime: {opt['execution_time_ms']} ms")

db.close()
