# FreshRoute — Intelligent Perishable Produce Distribution
> **Problem Statement PS 03** · Hackathon MVP  
> *Smarter Distribution. Less Waste. Better Returns.*

FreshRoute is an AI-assisted decision-support and supply-chain optimization platform designed to combat post-harvest agricultural losses across India's produce distribution networks (e.g. Nashik, Pune, Mumbai APMC, Surat, Ahmedabad, Goa, Bengaluru).

---

## 🚀 Live Services & Architecture

- **Frontend Application**: [http://localhost:3000](http://localhost:3000) (React 19 + TypeScript + Vite + Tailwind CSS + Recharts)
- **FastAPI REST API**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: **PostgreSQL 17** (`freshroute` database running locally on `localhost:5432`)

---

## 🌟 Key Features & Problem Statement Coverage

| Requirement | Implementation & Capability | Status |
| :--- | :--- | :---: |
| **Inventory & Batch Tracking** | Real-time batch monitoring by commodity (Tomato, Mango, Spinach, Banana, Onion), quantity in kg, storage location, and remaining shelf life in hours with visual urgency indicators. | ✅ Mandatory MVP |
| **Destination & Demand Mgmt** | Configurable terminal mandis & APMCs with commodity demands, market selling prices (₹/kg), travel times, logistics tariffs, and receiving intake gate capacities. | ✅ Mandatory MVP |
| **Intelligent FEFO Optimizer** | Deterministic greedy allocation engine that prioritizes the most perishable lots first (First-Expired, First-Out) while enforcing hard physical constraints. | ✅ Mandatory MVP |
| **Infeasible Allocation Guards** | Automatic rejection of routes where travel time + handling buffer exceeds remaining shelf life, or where gate capacity or delivery deadlines are exceeded. | ✅ Mandatory MVP |
| **Dynamic Discount Engine** | Rule-based clearance recommendations for near-expiry batches to stimulate sales velocity and salvage margins before total write-off. | ✅ Mandatory MVP |
| **Baseline Benchmarking** | Transparent, reproducible comparison against a naive fixed FIFO strategy on identical initial conditions, measuring Spoilage Reduction %, Fulfillment Rate, and Net Revenue Lift. | ✅ Mandatory MVP |
| **Algorithmic Explainability** | Plain-language rationales and constraint verification audits for every dispatch recommendation and rejection. | ✅ Mandatory MVP |
| **Disruption Scenario Simulator** | One-click simulation of 6 real-world shocks (Monsoon Highway Inundation, Extreme Summer Heatwaves, Demand Contractions, Fleet Crunches, Fuel Tariffs). | ✅ Mandatory MVP |

---

## 📐 Mathematical Rigor & Formulas (PRD Section 11)

### 1. Spoilage Rate (%)
$$\text{Spoilage Rate} = \frac{\text{Spoiled Quantity (kg)}}{\text{Total Available Quantity (kg)}} \times 100$$

### 2. Demand Fulfillment Rate (%)
$$\text{Fulfillment} = \frac{\text{Delivered Quantity (kg)}}{\text{Total Demand (kg)}} \times 100$$

### 3. Net Economic Revenue (₹)
$$\text{Net Revenue} = \text{Effective Sales Revenue} - \text{Transport Costs} - \text{Handling Costs} - \text{Spoilage Write-Off Costs}$$
*Note: To avoid double-counting, effective sales revenue already accounts for price reductions on discounted lots.*

### 4. Spoilage Reduction vs. Baseline (%)
$$\text{Spoilage Reduction} = \frac{S_b - S_o}{S_b} \times 100$$
*(where $S_b$ = baseline spoilage and $S_o$ = optimized plan spoilage).*

---

## 🏆 Official Hackathon Demonstration Walkthrough (10-Step Guide)

1. **Open the Dashboard** at [http://localhost:3000](http://localhost:3000). Inspect total inventory (**22,600 kg**), demand (**22,600 kg**), and urgent alerts for perishable tomato, mango, and spinach lots.
2. **Review Inventory Management**: Click the **Inventory** tab. Notice `BATCH-TOM-01` with only **10.5 hours** of remaining shelf life, and `BATCH-SPN-01` with **8.0 hours**. Add or edit lots directly in PostgreSQL.
3. **Explore Destinations & Demand**: Switch to **Destinations & Demand**. View the network of APMCs: Mumbai Vashi (6,500 kg limit), Pune Market Yard, Surat APMC, Ahmedabad, Goa, and Bengaluru (19.5h transit).
4. **Run Baseline Plan**: Go to **Dispatch Planner**, select **Baseline (FIFO)**, and click *Generate Baseline Plan*.
5. **Run FreshRoute FEFO Optimizer**: Switch the strategy to **FreshRoute (FEFO)** with Discounts enabled, and click *Optimize FreshRoute Plan*. The engine executes in **~1.2 ms** (< 2000 ms threshold).
6. **Inspect Explainability**: Expand any dispatch row to view why the lot was selected:
   > *"Dispatch 1600 kg of Tomato to Mumbai Vashi APMC prioritized because batch BATCH-TOM-01 has 10.5 hours remaining shelf life, journey takes 4.5 hours, leaving 6.0 hours fresh arrival window..."*
7. **Inspect Discount Recommendations**: View the transparent recommendations table displaying risk levels (Critical, High Risk, Candidate) and margin preservation rationale.
8. **Analyze Comparative Benchmark**: Click **Results & Analytics** to see side-by-side tables and Recharts diagrams for Revenue and Volume breakdowns.
9. **Simulate Supply Chain Disruption**: Navigate to the **Scenario Simulator**. Select **Sudden Urban Demand Contraction** (-35% demand). FreshRoute reduces spoilage by **61.26%**, saving **680 kg** of produce from write-off!
10. **Test Cold-Chain Fleet Crunch**: Select the **Fleet Capacity Crunch** (-45% truck availability). FreshRoute achieves **100% spoilage reduction** over baseline, generating higher net returns.
11. **Reset Data**: Click the **Reset Data** button in the navbar at any time to return PostgreSQL to the pristine baseline dataset for the next judging session.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL 17 (`psycopg2-binary`), Pydantic 2.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts.
- **Database**: PostgreSQL 17 (`localhost:5432/freshroute`).
- **Optimization Algorithms**: Deterministic greedy FEFO allocation with multi-variable constraint verification and transparent explainability generators.
