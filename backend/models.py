import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from .database import Base

class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(50), unique=True, index=True, nullable=False)
    commodity = Column(String(100), index=True, nullable=False)
    quantity = Column(Float, nullable=False)  # in kg
    initial_quantity = Column(Float, nullable=False) # initial kg
    remaining_shelf_life = Column(Float, nullable=False)  # in hours
    storage_location = Column(String(100), nullable=False)
    handling_cost = Column(Float, default=1.5)  # INR per kg
    procurement_cost = Column(Float, default=15.0)  # INR per kg (used for spoilage cost calculation)
    status = Column(String(30), default="available")  # available, allocated, dispatched, expired
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)

class Destination(Base):
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    location = Column(String(150), nullable=False)
    state = Column(String(100), default="Maharashtra")
    receiving_capacity = Column(Float, nullable=False)  # total kg intake limit
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    demands = relationship("Demand", back_populates="destination", cascade="all, delete-orphan")
    transport_options = relationship("TransportOption", back_populates="destination", cascade="all, delete-orphan")

class Demand(Base):
    __tablename__ = "demands"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    commodity = Column(String(100), index=True, nullable=False)
    demand_quantity = Column(Float, nullable=False)  # in kg
    selling_price = Column(Float, nullable=False)  # INR per kg
    delivery_deadline_hours = Column(Float, default=48.0)  # maximum allowable arrival window

    destination = relationship("Destination", back_populates="demands")

class TransportOption(Base):
    __tablename__ = "transport_options"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    origin_warehouse = Column(String(100), nullable=False)
    travel_time_hours = Column(Float, nullable=False)
    transport_cost_per_kg = Column(Float, nullable=False)  # INR per kg
    max_capacity_kg = Column(Float, default=5000.0)  # vehicle constraint
    transport_mode = Column(String(50), default="Refrigerated Truck")

    destination = relationship("Destination", back_populates="transport_options")

class DistributionPlan(Base):
    __tablename__ = "distribution_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String(150), nullable=False)
    strategy = Column(String(50), nullable=False)  # 'freshroute' or 'baseline'
    scenario_name = Column(String(100), default="Normal Operation")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Economic and operational metrics
    total_inventory = Column(Float, default=0.0)
    total_demand = Column(Float, default=0.0)
    fulfilled_demand = Column(Float, default=0.0)
    unmet_demand = Column(Float, default=0.0)
    spoiled_quantity = Column(Float, default=0.0)
    
    gross_revenue = Column(Float, default=0.0)
    transport_cost = Column(Float, default=0.0)
    handling_cost = Column(Float, default=0.0)
    discount_loss = Column(Float, default=0.0)
    spoilage_cost = Column(Float, default=0.0)
    net_revenue = Column(Float, default=0.0)

    fulfillment_rate = Column(Float, default=0.0)  # %
    spoilage_rate = Column(Float, default=0.0)  # %
    infeasible_prevented = Column(Integer, default=0)
    execution_time_ms = Column(Float, default=0.0)

    allocations = relationship("Allocation", back_populates="plan", cascade="all, delete-orphan")
    discount_recommendations = relationship("DiscountRecommendation", back_populates="plan", cascade="all, delete-orphan")

class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("distribution_plans.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=True)
    batch_code = Column(String(50), nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    destination_name = Column(String(150), nullable=False)
    commodity = Column(String(100), nullable=False)
    allocated_quantity = Column(Float, nullable=False)  # kg
    travel_time_hours = Column(Float, nullable=False)
    arrival_shelf_life_remaining = Column(Float, nullable=False)  # hours left upon arrival
    
    unit_price = Column(Float, nullable=False)
    unit_transport_cost = Column(Float, nullable=False)
    unit_handling_cost = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0)
    effective_selling_price = Column(Float, nullable=False)
    net_contribution = Column(Float, nullable=False)
    
    reason = Column(Text, nullable=False)
    constraint_checks = Column(JSON, nullable=True)  # {shelf_life_ok, demand_ok, capacity_ok, deadline_ok}

    plan = relationship("DistributionPlan", back_populates="allocations")

class DiscountRecommendation(Base):
    __tablename__ = "discount_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("distribution_plans.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=True)
    batch_code = Column(String(50), nullable=False)
    commodity = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    current_shelf_life = Column(Float, nullable=False)
    recommended_discount_percent = Column(Float, nullable=False)
    original_price = Column(Float, nullable=False)
    discounted_price = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False)  # critical, high_risk, candidate, none
    reason = Column(Text, nullable=False)
    expected_margin_impact = Column(Float, nullable=False)

    plan = relationship("DistributionPlan", back_populates="discount_recommendations")

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    demand_multiplier = Column(Float, default=1.0)
    travel_time_multiplier = Column(Float, default=1.0)
    capacity_multiplier = Column(Float, default=1.0)
    shelf_life_multiplier = Column(Float, default=1.0)
    transport_cost_multiplier = Column(Float, default=1.0)
    is_active = Column(Boolean, default=False)
