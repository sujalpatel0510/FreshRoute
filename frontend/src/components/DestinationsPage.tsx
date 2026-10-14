import React, { useState } from 'react';
import { 
  MapPin, 
  Truck, 
  Plus, 
  Building2, 
  Gauge, 
  X,
  AlertCircle
} from 'lucide-react';
import type { Destination } from '../types';
import { useTheme } from '../components/ThemeToggle';

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
  const { mode } = useTheme();
  const isDark = mode === 'dark';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-body dark:text-[color:var(--primary-text)]">
            Destination Hubs & Market Demand
          </h2>
          <p className="text-xs text-var(--muted-text) mt-0.5">
            Target APMCs, wholesale terminal mandis, and receiving gate throughput constraints.
          </p>
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
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover-primary/90 text-surface font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Destination Hub</span>
        </button>
      </div>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-16 text-var(--muted-text)">Loading destination networks...</div>
        ) : (
          destinations.map((dest) => {
            const totalDemand = dest.demands.reduce((sum, d) => sum + d.demand_quantity, 0);
            const primaryTransport = dest.transport_options[0];

            return (
              <div
                key={dest.id}
                className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all cursor-pointer"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/30 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-body dark:text-[color:var(--primary-text)] text-sm">{dest.name}</h3>
                        <p className="text-[11px] text-var(--muted-text) flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-var(--muted-text)" />
                          <span>{dest.location}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface/20 text-var(--muted-text) border border-border/30">
                      {dest.code}
                    </span>
                  </div>

                  {/* Capacity & Transit Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface/50 border border-border/30 p-3 text-xs">
                    <div>
                      <span className="text-[10px] text-var(--muted-text) font-medium">Max Receiving Gate</span>
                      <div className="font-bold text-body dark:text-[color:var(--primary-text)] mt-0.5 flex items-center space-x-1">
                        <Gauge className="w-3.5 h-3.5 text-primary" />
                        <span>{dest.receiving_capacity.toLocaleString()} kg</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-var(--muted-text) font-medium">Transit from Nashik</span>
                      <div className="font-bold text-body dark:text-[color:var(--primary-text)] mt-0.5 flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-primary" />
                        <span>{primaryTransport ? `${primaryTransport.travel_time_hours}h` : '5.0h'} (₹${primaryTransport?.transport_cost_per_kg || 2.5}/kg)</span>
                      </div>
                    </div>
                  </div>

                  {/* Demands List */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-var(--muted-text)">
                      <span>Commodity Demands</span>
                      <span className="text-[11px] text-var(--muted-text)">Total: {totalDemand.toLocaleString()} kg</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {dest.demands.map((dm) => (
                        <div
                          key={dm.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-border/30 text-xs"
                        >
                          <span className="font-semibold text-body dark:text-[color:var(--primary-text)]">{dm.commodity}</span>
                          <div className="text-right">
                            <span className="font-bold text-body dark:text-[color:var(--primary-text)]">{dm.demand_quantity.toLocaleString()} kg</span>
                            <span className="text-primary font-semibold ml-2">@ ₹{dm.selling_price}/kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 text-[11px] text-var(--muted-text) flex justify-between items-center">
                  <span>Permitted window: 48h deadline</span>
                  <span className="font-semibold text-primary">Reefer Ready</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Destination Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <h3 className="text-lg font-bold text-body dark:text-[color:var(--primary-text)]">Add Destination APMC / Mandi</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-var(--muted-text) hover:text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-error/20 border border-error/30 rounded-xl error text-error text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Destination Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Hub Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nashik APMC Mandi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Location / City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nashik, Maharashtra"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus-border"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Max Intake Capacity (kg)</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={formData.receiving_capacity}
                    onChange={(e) => setFormData({ ...formData, receiving_capacity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus-border"
                  />
                </div>
              </div>

              {/* Initial Demand Specs */}
              <div className="p-3 rounded-xl bg-surface/50 border border-border/30 space-y-3">
                <span className="font-bold text-body dark:text-[color:var(--primary-text)] block text-xs">Primary Commodity Demand</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-var(--muted-text) mb-0.5">Commodity</label>
                    <select
                      value={formData.commodity}
                      onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-full border border-border/50 bg-white"
                    >
                      <option value="Tomato">Tomato</option>
                      <option value="Mango">Mango</option>
                      <option value="Spinach">Spinach</option>
                      <option value="Banana">Banana</option>
                      <option value="Onion">Onion</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-var(--muted-text) mb-0.5">Demand (kg)</label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={formData.demand_quantity}
                      onChange={(e) => setFormData({ ...formData, demand_quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-full border border-border/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-var(--muted-text) mb-0.5">Selling Price (₹/kg)</label>
                    <input
                      type="number"
                      min="5"
                      step="1"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-full border border-border/50"
                    />
                  </div>
                </div>
              </div>

              {/* Transport Specs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Transit Time from Hub (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={formData.travel_time_hours}
                    onChange={(e) => setFormData({ ...formData, travel_time_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-full border border-border/50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Transport Tariff (₹/kg)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.1"
                    value={formData.transport_cost_per_kg}
                    onChange={(e) => setFormData({ ...formData, transport_cost_per_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-full border border-border/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-var(--muted-text) hover:bg-surface/80 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-full bg-primary hover-primary/90 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Add Destination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};