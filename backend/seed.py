import logging
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import (
    InventoryBatch,
    Destination,
    Demand,
    TransportOption,
    Scenario
)
from .engine.scenarios import DEFAULT_SCENARIOS

logger = logging.getLogger(__name__)

def seed_database(db: Session = None):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Check if already seeded
        if db.query(InventoryBatch).count() > 0:
            logger.info("Database already populated with initial records.")
            return

        logger.info("Seeding realistic agricultural produce data...")

        # 1. Scenarios
        for s_data in DEFAULT_SCENARIOS:
            sc = Scenario(
                key=s_data["key"],
                name=s_data["name"],
                description=s_data["description"],
                demand_multiplier=s_data["demand_multiplier"],
                travel_time_multiplier=s_data["travel_time_multiplier"],
                capacity_multiplier=s_data["capacity_multiplier"],
                shelf_life_multiplier=s_data["shelf_life_multiplier"],
                transport_cost_multiplier=s_data["transport_cost_multiplier"],
                is_active=s_data["is_active"]
            )
            db.add(sc)

        # 2. Destinations
        destinations_data = [
            {
                "code": "MUM-APMC",
                "name": "Mumbai Vashi APMC",
                "location": "Navi Mumbai, Maharashtra",
                "state": "Maharashtra",
                "receiving_capacity": 6500.0,
                "latitude": 19.0760,
                "longitude": 72.8777
            },
            {
                "code": "PUN-MKT",
                "name": "Pune Gultekdi Market Yard",
                "location": "Gultekdi, Pune",
                "state": "Maharashtra",
                "receiving_capacity": 4500.0,
                "latitude": 18.5204,
                "longitude": 73.8567
            },
            {
                "code": "SUR-MND",
                "name": "Surat APMC Mandi",
                "location": "Surat, Gujarat",
                "state": "Gujarat",
                "receiving_capacity": 5000.0,
                "latitude": 21.1702,
                "longitude": 72.8311
            },
            {
                "code": "AHM-APMC",
                "name": "Ahmedabad Jamalpur Mandi",
                "location": "Ahmedabad, Gujarat",
                "state": "Gujarat",
                "receiving_capacity": 5500.0,
                "latitude": 23.0225,
                "longitude": 72.5714
            },
            {
                "code": "GOA-DEP",
                "name": "Goa Mapusa Cold Depot",
                "location": "Mapusa, Goa",
                "state": "Goa",
                "receiving_capacity": 3000.0,
                "latitude": 15.5937,
                "longitude": 73.8142
            },
            {
                "code": "BLR-YESH",
                "name": "Bengaluru Yeshwanthpur Hub",
                "location": "Yeshwanthpur, Bengaluru",
                "state": "Karnataka",
                "receiving_capacity": 7000.0,
                "latitude": 13.0285,
                "longitude": 77.5457
            }
        ]

        created_dests = {}
        for d in destinations_data:
            dest_obj = Destination(**d)
            db.add(dest_obj)
            db.flush()
            created_dests[d["code"]] = dest_obj

        # 3. Demands per destination
        demands_data = [
            # Mumbai Vashi APMC
            {"dest_code": "MUM-APMC", "commodity": "Tomato", "demand_quantity": 2400.0, "selling_price": 38.0, "deadline": 36.0},
            {"dest_code": "MUM-APMC", "commodity": "Mango", "demand_quantity": 1200.0, "selling_price": 195.0, "deadline": 48.0},
            {"dest_code": "MUM-APMC", "commodity": "Spinach", "demand_quantity": 800.0, "selling_price": 34.0, "deadline": 18.0},
            {"dest_code": "MUM-APMC", "commodity": "Banana", "demand_quantity": 1500.0, "selling_price": 40.0, "deadline": 60.0},
            {"dest_code": "MUM-APMC", "commodity": "Onion", "demand_quantity": 3000.0, "selling_price": 32.0, "deadline": 96.0},

            # Pune Gultekdi
            {"dest_code": "PUN-MKT", "commodity": "Tomato", "demand_quantity": 1500.0, "selling_price": 35.0, "deadline": 36.0},
            {"dest_code": "PUN-MKT", "commodity": "Mango", "demand_quantity": 800.0, "selling_price": 185.0, "deadline": 48.0},
            {"dest_code": "PUN-MKT", "commodity": "Spinach", "demand_quantity": 600.0, "selling_price": 30.0, "deadline": 16.0},
            {"dest_code": "PUN-MKT", "commodity": "Banana", "demand_quantity": 1000.0, "selling_price": 36.0, "deadline": 55.0},

            # Surat APMC
            {"dest_code": "SUR-MND", "commodity": "Tomato", "demand_quantity": 1800.0, "selling_price": 36.0, "deadline": 40.0},
            {"dest_code": "SUR-MND", "commodity": "Mango", "demand_quantity": 700.0, "selling_price": 190.0, "deadline": 48.0},
            {"dest_code": "SUR-MND", "commodity": "Banana", "demand_quantity": 1200.0, "selling_price": 38.0, "deadline": 50.0},
            {"dest_code": "SUR-MND", "commodity": "Onion", "demand_quantity": 2200.0, "selling_price": 30.0, "deadline": 80.0},

            # Ahmedabad Jamalpur
            {"dest_code": "AHM-APMC", "commodity": "Tomato", "demand_quantity": 2000.0, "selling_price": 37.0, "deadline": 48.0},
            {"dest_code": "AHM-APMC", "commodity": "Mango", "demand_quantity": 900.0, "selling_price": 200.0, "deadline": 48.0},
            {"dest_code": "AHM-APMC", "commodity": "Banana", "demand_quantity": 1400.0, "selling_price": 39.0, "deadline": 65.0},

            # Goa Mapusa
            {"dest_code": "GOA-DEP", "commodity": "Tomato", "demand_quantity": 900.0, "selling_price": 42.0, "deadline": 48.0},
            {"dest_code": "GOA-DEP", "commodity": "Mango", "demand_quantity": 600.0, "selling_price": 215.0, "deadline": 48.0},
            {"dest_code": "GOA-DEP", "commodity": "Spinach", "demand_quantity": 400.0, "selling_price": 38.0, "deadline": 24.0},

            # Bengaluru Yeshwanthpur
            {"dest_code": "BLR-YESH", "commodity": "Tomato", "demand_quantity": 2800.0, "selling_price": 41.0, "deadline": 72.0},
            {"dest_code": "BLR-YESH", "commodity": "Mango", "demand_quantity": 1500.0, "selling_price": 225.0, "deadline": 72.0},
            {"dest_code": "BLR-YESH", "commodity": "Onion", "demand_quantity": 3500.0, "selling_price": 35.0, "deadline": 120.0},
        ]

        for dm in demands_data:
            dest = created_dests[dm["dest_code"]]
            demand_obj = Demand(
                destination_id=dest.id,
                commodity=dm["commodity"],
                demand_quantity=dm["demand_quantity"],
                selling_price=dm["selling_price"],
                delivery_deadline_hours=dm["deadline"]
            )
            db.add(demand_obj)

        # 4. Transport options from Nashik Agro Cold Storage (Central hub)
        transport_data = [
            {"dest_code": "MUM-APMC", "wh": "Nashik Agro Hub", "time": 4.5, "cost": 2.2, "cap": 6000.0},
            {"dest_code": "PUN-MKT", "wh": "Nashik Agro Hub", "time": 5.0, "cost": 2.5, "cap": 5000.0},
            {"dest_code": "SUR-MND", "wh": "Nashik Agro Hub", "time": 7.0, "cost": 3.2, "cap": 5500.0},
            {"dest_code": "AHM-APMC", "wh": "Nashik Agro Hub", "time": 11.5, "cost": 4.5, "cap": 6000.0},
            {"dest_code": "GOA-DEP", "wh": "Nashik Agro Hub", "time": 13.5, "cost": 5.2, "cap": 3500.0},
            {"dest_code": "BLR-YESH", "wh": "Nashik Agro Hub", "time": 19.5, "cost": 6.8, "cap": 7500.0},

            # Also from Pune Rural Hub
            {"dest_code": "MUM-APMC", "wh": "Pune Cold Facility", "time": 3.5, "cost": 1.8, "cap": 5000.0},
            {"dest_code": "PUN-MKT", "wh": "Pune Cold Facility", "time": 1.2, "cost": 0.8, "cap": 4500.0},
            {"dest_code": "SUR-MND", "wh": "Pune Cold Facility", "time": 8.0, "cost": 3.6, "cap": 4500.0},
            {"dest_code": "GOA-DEP", "wh": "Pune Cold Facility", "time": 10.5, "cost": 4.2, "cap": 3000.0},
            {"dest_code": "BLR-YESH", "wh": "Pune Cold Facility", "time": 16.0, "cost": 5.8, "cap": 6500.0},
        ]

        for tp in transport_data:
            dest = created_dests[tp["dest_code"]]
            tp_obj = TransportOption(
                destination_id=dest.id,
                origin_warehouse=tp["wh"],
                travel_time_hours=tp["time"],
                transport_cost_per_kg=tp["cost"],
                max_capacity_kg=tp["cap"],
                transport_mode="Refrigerated Reefer (2-4°C)"
            )
            db.add(tp_obj)

        # 5. Inventory Batches
        # Rich realistic mix: some critical batches with short shelf life (urgent priority),
        # some moderate, some plenty, some testing the boundary conditions!
        batches_data = [
            # Tomatoes: highly perishable
            {
                "batch_code": "BATCH-TOM-03",
                "commodity": "Tomato",
                "quantity": 1800.0,
                "initial_quantity": 1800.0,
                "remaining_shelf_life": 38.0, # Fresh, can reach Bengaluru
                "storage_location": "Pune Cold Facility",
                "handling_cost": 1.1,
                "procurement_cost": 13.5,
                "status": "available",
                "notes": "Green-mature stage lot from Junnar cluster, precooling completed."
            },
            {
                "batch_code": "BATCH-TOM-02",
                "commodity": "Tomato",
                "quantity": 2200.0,
                "initial_quantity": 2200.0,
                "remaining_shelf_life": 22.0, # Moderate shelf life
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 1.2,
                "procurement_cost": 14.0,
                "status": "available",
                "notes": "Firm harvest batch from Dindori farm cluster."
            },
            {
                "batch_code": "BATCH-TOM-01",
                "commodity": "Tomato",
                "quantity": 1600.0,
                "initial_quantity": 1600.0,
                "remaining_shelf_life": 10.5, # Urgent! Only 10.5h remaining - Mumbai/Pune feasible, distant markets infeasible!
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 1.2,
                "procurement_cost": 14.0,
                "status": "available",
                "notes": "Grade A Hybrid Nashik Red. High respiration index, priority clearance needed."
            },

            # Mangoes: high value Alphonso
            {
                "batch_code": "BATCH-MNG-02",
                "commodity": "Mango",
                "quantity": 1400.0,
                "initial_quantity": 1400.0,
                "remaining_shelf_life": 44.0, # Robust shelf life
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 3.5,
                "procurement_cost": 82.0,
                "status": "available",
                "notes": "Premium exports grade batch, Controlled Atmosphere stored."
            },
            {
                "batch_code": "BATCH-MNG-03",
                "commodity": "Mango",
                "quantity": 1100.0,
                "initial_quantity": 1100.0,
                "remaining_shelf_life": 52.0,
                "storage_location": "Pune Cold Facility",
                "handling_cost": 3.2,
                "procurement_cost": 80.0,
                "status": "available",
                "notes": "Alphonso mature green from Devgad belt."
            },
            {
                "batch_code": "BATCH-MNG-01",
                "commodity": "Mango",
                "quantity": 900.0,
                "initial_quantity": 900.0,
                "remaining_shelf_life": 15.0, # Urgent clearance lot!
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 3.5,
                "procurement_cost": 85.0,
                "status": "available",
                "notes": "Ratnagiri Alphonso. Ripening index 4 (yellow-orange stage)."
            },

            # Spinach / Palak: ultra-sensitive leaf crop
            {
                "batch_code": "BATCH-SPN-01",
                "commodity": "Spinach",
                "quantity": 700.0,
                "initial_quantity": 700.0,
                "remaining_shelf_life": 8.0, # Critical! High risk of yellowing/wilting
                "storage_location": "Pune Cold Facility",
                "handling_cost": 1.5,
                "procurement_cost": 12.0,
                "status": "available",
                "notes": "Hydroponic tender baby spinach. Immediate transit needed."
            },
            {
                "batch_code": "BATCH-SPN-02",
                "commodity": "Spinach",
                "quantity": 900.0,
                "initial_quantity": 900.0,
                "remaining_shelf_life": 19.0,
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 1.4,
                "procurement_cost": 11.5,
                "status": "available",
                "notes": "Standard washed and crated bunch spinach."
            },

            # Bananas: moderate shelf life
            {
                "batch_code": "BATCH-BAN-01",
                "commodity": "Banana",
                "quantity": 2500.0,
                "initial_quantity": 2500.0,
                "remaining_shelf_life": 32.0,
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 1.0,
                "procurement_cost": 17.0,
                "status": "available",
                "notes": "Jalgaon G9 Cavendish. Pulp temp 14°C."
            },
            {
                "batch_code": "BATCH-BAN-02",
                "commodity": "Banana",
                "quantity": 2000.0,
                "initial_quantity": 2000.0,
                "remaining_shelf_life": 58.0,
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 1.0,
                "procurement_cost": 16.5,
                "status": "available",
                "notes": "Unripened green bunches from Raver taluka."
            },

            # Onions: less perishable, high volume
            {
                "batch_code": "BATCH-ONI-01",
                "commodity": "Onion",
                "quantity": 4500.0,
                "initial_quantity": 4500.0,
                "remaining_shelf_life": 90.0,
                "storage_location": "Nashik Agro Hub",
                "handling_cost": 0.8,
                "procurement_cost": 16.0,
                "status": "available",
                "notes": "Lasalgaon Red Onion. Good skin coverage, ambient ventilated."
            },
            {
                "batch_code": "BATCH-ONI-02",
                "commodity": "Onion",
                "quantity": 3000.0,
                "initial_quantity": 3000.0,
                "remaining_shelf_life": 120.0,
                "storage_location": "Pune Cold Facility",
                "handling_cost": 0.8,
                "procurement_cost": 15.5,
                "status": "available",
                "notes": "Kharif crop cured onion lot."
            }
        ]

        for b in batches_data:
            batch_obj = InventoryBatch(**b)
            db.add(batch_obj)

        db.commit()
        logger.info(f"Successfully seeded database: {len(batches_data)} batches, {len(destinations_data)} destinations.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise e
    finally:
        if close_db:
            db.close()

def reset_and_seed(db: Session):
    """Cleanly wipes existing transactional records and reseeds."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database(db)
