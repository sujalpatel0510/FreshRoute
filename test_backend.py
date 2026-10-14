from backend.database import engine, Base, SessionLocal
from backend.seed import reset_and_seed
from backend.models import InventoryBatch, Destination, Demand
from backend.engine.optimizer import run_freshroute_optimization
from backend.engine.baseline import run_baseline_optimization
from backend.main import _extract_engine_inputs

print("Creating tables in PostgreSQL...")
Base.metadata.create_all(bind=engine)
db = SessionLocal()
reset_and_seed(db)

batch_cnt = db.query(InventoryBatch).count()
dest_cnt = db.query(Destination).count()
demand_cnt = db.query(Demand).count()
print(f"PostgreSQL populated successfully!")
print(f"  - Batches: {batch_cnt}")
print(f"  - Destinations: {dest_cnt}")
print(f"  - Demands: {demand_cnt}")

batches, dests, demands, transports = _extract_engine_inputs(db)
opt_res = run_freshroute_optimization(batches, dests, demands, transports)
base_res = run_baseline_optimization(batches, dests, demands, transports)

print("\n--- RESULTS COMPARISON ---")
print(f"FreshRoute Net Revenue: INR {opt_res['net_revenue']:,.2f}")
print(f"Baseline Net Revenue:   INR {base_res['net_revenue']:,.2f}")
print(f"FreshRoute Spoilage:    {opt_res['spoiled_quantity']:.1f} kg ({opt_res['spoilage_rate']:.1f}%)")
print(f"Baseline Spoilage:      {base_res['spoiled_quantity']:.1f} kg ({base_res['spoilage_rate']:.1f}%)")
print(f"FreshRoute Fulfillment: {opt_res['fulfillment_rate']:.1f}%")
print(f"Baseline Fulfillment:   {base_res['fulfillment_rate']:.1f}%")
print(f"Infeasible Prevented:   {opt_res['infeasible_prevented']}")
print(f"Execution Runtime:      {opt_res['execution_time_ms']} ms (PRD requirement: < 2000 ms)")

db.close()
