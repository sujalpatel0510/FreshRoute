import React, { useState } from 'react';
import { 
  MapPin, 
  Truck, 
  Plus, 
  Building2, 
  Gauge, 
  X,
  AlertCircle,
  Clock,
  ShieldCheck,
  Search,
  Loader2
} from 'lucide-react';
import type { Destination } from '../types';
import { Overlay } from './Overlay';

interface DestinationsPageProps {
  destinations: Destination[];
  loading: boolean;
  onAddDestination: (data: any) => Promise<void>;
}

export const DestinationsPage: React.FC<DestinationsPageProps> = ({
  destinations,
  loading,
  onAddDestination,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: `DEST-${Date.now().toString().slice(-3)}`,
    name: '',
    location: '',
    state: 'Maharashtra',
    receiving_capacity: 5000,
    commodity: 'Tomato',
    demand_quantity: 1500,
    selling_price: 36.0,
    travel_time_hours: 6.0,
    transport_cost_per_kg: 2.5,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDestinations = destinations.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location) {
      setFormError('Please fill in destination name and location');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        location: formData.location,
        state: formData.state,
        receiving_capacity: formData.receiving_capacity,
        demands: [
          {
            commodity: formData.commodity,
            demand_quantity: formData.demand_quantity,
            selling_price: formData.selling_price,
            delivery_deadline_hours: 48.0,
          }
        ],
        transport_options: [
          {
            origin_warehouse: 'Nashik Agro Hub',
            travel_time_hours: formData.travel_time_hours,
            transport_cost_per_kg: formData.transport_cost_per_kg,
            max_capacity_kg: 5000,
            transport_mode: 'Refrigerated Truck (2-4°C)',
          }
        ]
      };
      await onAddDestination(payload);
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add destination');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-primary-text">
              Destination Networks & APMC Demand
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
              {destinations.length} APMC Mandis
            </span>
          </div>
          <p className="text-xs text-secondary-text mt-0.5">
            Target wholesale markets, spot pricing tariffs, transit duration limits, and receiving gate throughput caps.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
            <input
              type="text"
              placeholder="Search mandi or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-elevated/60 border border-border rounded-lg text-primary-text placeholder-muted-text focus:bg-surface focus:border-primary focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setFormData({
                code: `DEST-${Date.now().toString().slice(-3)}`,
                name: '',
                location: '',
                state: 'Maharashtra',
                receiving_capacity: 5000,
                commodity: 'Tomato',
                demand_quantity: 1500,
                selling_price: 36.0,
                travel_time_hours: 6.0,
                transport_cost_per_kg: 2.5,
              });
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="btn-press flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Destination</span>
          </button>
        </div>
      </div>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-16 text-muted-text">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading destination networks from PostgreSQL...</span>
          </div>
        ) : filteredDestinations.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-text bg-surface rounded-2xl border border-dashed border-border">
            <span>No matching destinations found.</span>
          </div>
        ) : (
          filteredDestinations.map((dest) => {
            const totalDemand = dest.demands.reduce((sum, d) => sum + d.demand_quantity, 0);
            const primaryTransport = dest.transport_options[0];
            const capacityRatio = Math.min(100, (totalDemand / dest.receiving_capacity) * 100);

            return (
              <div
                key={dest.id}
                data-cursor="card"
                className="stagger-card bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-150"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary-text text-sm">{dest.name}</h3>
                        <p className="text-[11px] text-muted-text flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted-text" />
                          <span>{dest.location}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-elevated text-secondary-text border border-border">
                      {dest.code}
                    </span>
                  </div>

                  {/* Gate Intake & Transit Specs */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-elevated/60 border border-border p-3 text-xs">
                    <div>
                      <span className="text-[10px] text-secondary-text font-medium">Intake Capacity</span>
                      <div className="font-bold text-primary-text font-mono mt-0.5 flex items-center space-x-1">
                        <Gauge className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{dest.receiving_capacity.toLocaleString()} <span className="text-[10px] font-normal text-muted-text">kg</span></span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-secondary-text font-medium">Transit from Nashik</span>
                      <div className="font-bold text-primary-text font-mono mt-0.5 flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{primaryTransport ? `${primaryTransport.travel_time_hours}h` : '5.0h'} · ₹{primaryTransport?.transport_cost_per_kg || 2.5}/kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity Utilization Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-secondary-text font-mono">
                      <span>Demand vs Gate Limit</span>
                      <span>{capacityRatio.toFixed(0)}% Utilized</span>
                    </div>
                    <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          capacityRatio > 90 ? 'bg-amber-500' : 'bg-primary'
                        }`} 
                        style={{ width: `${capacityRatio}%` }} 
                      />
                    </div>
                  </div>

                  {/* Demands List */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-secondary-text">
                      <span>Commodity Demands</span>
                      <span className="font-mono text-[11px] text-primary font-bold">Total: {totalDemand.toLocaleString()} kg</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {dest.demands.map((dm) => (
                        <div
                          key={dm.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-elevated/40 border border-border text-xs"
                        >
                          <span className="font-medium text-primary-text">{dm.commodity}</span>
                          <div className="text-right font-mono text-[11px]">
                            <span className="font-bold text-primary-text">{dm.demand_quantity.toLocaleString()} kg</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-2">₹{dm.selling_price}/kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-text flex justify-between items-center">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-muted-text" />
                    <span>Arrival window: 48h</span>
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Reefer Verified</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Destination Modal */}
      <Overlay
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        closeOnBackdrop={false}
        ariaLabel="Add destination dialog"
        dialogClassName="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border"
      >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-primary-text">Add Destination Mandi / Wholesale Hub</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn-press text-muted-text hover:text-primary-text p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div role="alert" className="form-error mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Destination Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-elevated/50 font-mono text-primary-text focus:bg-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Hub Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune Market Yard"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">City / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune, Maharashtra"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Gate Intake Capacity (kg)</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={formData.receiving_capacity}
                    onChange={(e) => setFormData({ ...formData, receiving_capacity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Initial Demand Specs */}
              <div className="p-3 rounded-xl bg-elevated/40 border border-border space-y-3">
                <span className="font-bold text-primary-text block text-xs">Primary Commodity Demand</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-secondary-text mb-0.5 block">Commodity</label>
                    <select
                      value={formData.commodity}
                      onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
                    >
                      <option value="Tomato">Tomato</option>
                      <option value="Mango">Mango</option>
                      <option value="Spinach">Spinach</option>
                      <option value="Banana">Banana</option>
                      <option value="Onion">Onion</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-secondary-text mb-0.5 block">Demand (kg)</label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={formData.demand_quantity}
                      onChange={(e) => setFormData({ ...formData, demand_quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-secondary-text mb-0.5 block">Selling Price (₹/kg)</label>
                    <input
                      type="number"
                      min="5"
                      step="1"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Transport Specs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Transit Time from Hub (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={formData.travel_time_hours}
                    onChange={(e) => setFormData({ ...formData, travel_time_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Transport Tariff (₹/kg)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.1"
                    value={formData.transport_cost_per_kg}
                    onChange={(e) => setFormData({ ...formData, transport_cost_per_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-press px-3.5 py-1.5 rounded-lg text-secondary-text hover:bg-elevated font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-press inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Registering...' : 'Add Destination'}</span>
                </button>
              </div>
            </form>
      </Overlay>
    </div>
  );
};