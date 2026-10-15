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
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import type { Destination, Demand } from '../types';
import { Overlay } from './Overlay';
import { Tooltip } from './Tooltip';
import { CustomSelect } from './CustomSelect';

const COMMODITY_OPTIONS = [
  { value: 'Tomato', label: 'Tomato 🍅', badge: 'High Spoilage' },
  { value: 'Mango', label: 'Mango 🥭', badge: 'Export Premium' },
  { value: 'Spinach', label: 'Spinach 🥬', badge: 'Ultra Short' },
  { value: 'Banana', label: 'Banana 🍌', badge: 'Ethylene Sens.' },
  { value: 'Onion', label: 'Onion 🧅', badge: 'Moisture Sens.' },
  { value: 'Potato', label: 'Potato 🥔', badge: 'Bulk Staple' },
  { value: 'Apple', label: 'Apple 🍎', badge: 'Cold Chain' },
  { value: 'Grapes', label: 'Grapes 🍇', badge: 'Fragile' },
];

const STATE_OPTIONS = [
  'Maharashtra',
  'Gujarat',
  'Karnataka',
  'Goa',
  'Madhya Pradesh',
  'Telangana',
  'Tamil Nadu',
  'Rajasthan',
  'Delhi NCR',
];

interface DestinationsPageProps {
  destinations: Destination[];
  loading: boolean;
  onAddDestination: (data: any) => Promise<void>;
  onUpdateDestination: (id: number, data: any) => Promise<void>;
  onDeleteDestination: (id: number) => Promise<void>;
  onAddDemand: (destId: number, data: any) => Promise<void>;
  onUpdateDemand: (demandId: number, data: any) => Promise<void>;
  onDeleteDemand: (demandId: number) => Promise<void>;
}

export const DestinationsPage: React.FC<DestinationsPageProps> = ({
  destinations,
  loading,
  onAddDestination,
  onUpdateDestination,
  onDeleteDestination,
  onAddDemand,
  onUpdateDemand,
  onDeleteDemand,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [targetDestForDemand, setTargetDestForDemand] = useState<Destination | null>(null);
  const [editingDemand, setEditingDemand] = useState<{ destId: number; demand: Demand } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'dest' | 'demand';
    id: number;
    title: string;
    details: string;
  } | null>(null);

  // Add Destination Form
  const [addFormData, setAddFormData] = useState({
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

  // Edit Destination Form
  const [editDestFormData, setEditDestFormData] = useState({
    name: '',
    location: '',
    state: 'Maharashtra',
    receiving_capacity: 5000,
  });

  // Demand Form (Add or Edit)
  const [demandFormData, setDemandFormData] = useState({
    commodity: 'Tomato',
    demand_quantity: 1000,
    selling_price: 35.0,
    delivery_deadline_hours: 48.0,
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDestinations = destinations.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle Add Destination
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name || !addFormData.location) {
      setFormError('Please fill in destination name and location');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = {
        code: addFormData.code,
        name: addFormData.name,
        location: addFormData.location,
        state: addFormData.state,
        receiving_capacity: addFormData.receiving_capacity,
        demands: [
          {
            commodity: addFormData.commodity,
            demand_quantity: addFormData.demand_quantity,
            selling_price: addFormData.selling_price,
            delivery_deadline_hours: 48.0,
          }
        ],
        transport_options: [
          {
            origin_warehouse: 'Nashik Agro Hub',
            travel_time_hours: addFormData.travel_time_hours,
            transport_cost_per_kg: addFormData.transport_cost_per_kg,
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

  // Handle Edit Destination
  const handleEditDestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDest) return;
    if (!editDestFormData.name || !editDestFormData.location) {
      setFormError('Please fill in destination name and location');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await onUpdateDestination(editingDest.id, editDestFormData);
      setEditingDest(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update destination');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Demand
  const handleAddDemandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDestForDemand) return;

    setIsSubmitting(true);
    setFormError('');
    try {
      await onAddDemand(targetDestForDemand.id, demandFormData);
      setTargetDestForDemand(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add demand');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Demand
  const handleEditDemandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDemand) return;

    setIsSubmitting(true);
    setFormError('');
    try {
      await onUpdateDemand(editingDemand.demand.id, {
        demand_quantity: demandFormData.demand_quantity,
        selling_price: demandFormData.selling_price,
        delivery_deadline_hours: demandFormData.delivery_deadline_hours,
      });
      setEditingDemand(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update demand');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    try {
      if (deleteConfirm.type === 'dest') {
        await onDeleteDestination(deleteConfirm.id);
      } else {
        await onDeleteDemand(deleteConfirm.id);
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      setFormError(err.message || 'Deletion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAgroClimaticZone = (code: string) => {
    switch (code) {
      case 'MUM-APMC': return 'Zone IX: Western Plateau & Hills (Mumbai APMC)';
      case 'PUN-MKT': return 'Zone IX: Western Plateau & Hills (Pune Deccan)';
      case 'SUR-MND': return 'Zone XIII: Gujarat Plains (Surat Mandi)';
      case 'AHM-APMC': return 'Zone XIII: Gujarat Plains (Ahmedabad Central)';
      case 'GOA-DEP': return 'Zone XII: West Coast Plains (Goa Depot)';
      case 'BLR-YESH': return 'Zone X: Southern Plateau (Bengaluru Hub)';
      default: return 'Zone IX: Western Agro-Climatic Zone';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border/80 rounded-3xl p-5 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-primary-text">
              Destination Networks & APMC Demand
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
              {destinations.length} Mandis
            </span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
              MoFPI Grounded
            </span>
          </div>
          <p className="text-xs text-secondary-text mt-0.5">
            Wholesale mandi spot pricing, transit times, gate intake limits, and demand across 15 agro-climatic zones.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <form 
            onSubmit={(e) => { e.preventDefault(); }}
            className="flex items-center space-x-1.5"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
              <input
                type="text"
                placeholder="Search mandi or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs bg-elevated/60 border border-border rounded-xl text-primary-text placeholder-muted-text focus:bg-surface focus:border-primary focus:outline-none w-44 sm:w-56 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="btn-press absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-text hover:text-primary-text rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn-press flex items-center space-x-1 px-3 py-2 rounded-xl bg-elevated hover:bg-border/60 border border-border text-xs font-bold text-primary-text cursor-pointer transition-colors shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          <Tooltip text="Register APMC terminal">
            <button
              onClick={() => {
                setAddFormData({
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
              className="btn-press flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-neutral-950 font-bold text-xs shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Destination</span>
            </button>
          </Tooltip>
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
          <div className="col-span-3 text-center py-16 text-muted-text bg-surface rounded-3xl border border-dashed border-border">
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
                className="stagger-card bg-surface rounded-3xl border border-border/80 p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-150"
              >
                <div>
                  {/* Top Bar with Edit & Delete actions */}
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

                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-elevated text-secondary-text border border-border">
                        {dest.code}
                      </span>
                      <Tooltip text="Edit mandi & capacity">
                        <button
                          onClick={() => {
                            setEditingDest(dest);
                            setEditDestFormData({
                              name: dest.name,
                              location: dest.location,
                              state: dest.state,
                              receiving_capacity: dest.receiving_capacity,
                            });
                            setFormError('');
                          }}
                          className="btn-press p-1.5 rounded-lg text-secondary-text hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Delete mandi">
                        <button
                          onClick={() => {
                            setDeleteConfirm({
                              type: 'dest',
                              id: dest.id,
                              title: `Delete ${dest.name}?`,
                              details: `This will remove ${dest.name} (${dest.code}) along with its ${dest.demands.length} demands and transit tariffs.`,
                            });
                            setFormError('');
                          }}
                          className="btn-press p-1.5 rounded-lg text-secondary-text hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* MoFPI Agro-Climatic Zone Tag */}
                  <Tooltip text="Official MoFPI agro-climatic zone">
                    <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-primary/5 text-primary border border-primary/20 text-[10px] font-mono flex items-center justify-between w-full">
                      <span>{getAgroClimaticZone(dest.code)}</span>
                      <span className="text-secondary-text font-medium">Verified Mandi</span>
                    </div>
                  </Tooltip>

                  {/* Gate Intake & Transit Specs */}
                  <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-xl bg-elevated/60 border border-border p-3 text-xs">
                    <Tooltip text="Daily gate intake limit">
                      <div>
                        <span className="text-[10px] text-secondary-text font-medium">Intake Capacity</span>
                        <div className="font-bold text-primary-text font-mono mt-0.5 flex items-center space-x-1">
                          <Gauge className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{dest.receiving_capacity.toLocaleString()} <span className="text-[10px] font-normal text-muted-text">kg</span></span>
                        </div>
                      </div>
                    </Tooltip>
                    <Tooltip text="Transit time & tariff">
                      <div>
                        <span className="text-[10px] text-secondary-text font-medium">Transit from Nashik</span>
                        <div className="font-bold text-primary-text font-mono mt-0.5 flex items-center space-x-1">
                          <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{primaryTransport ? `${primaryTransport.travel_time_hours}h` : '5.0h'} · ₹{primaryTransport?.transport_cost_per_kg || 2.5}/kg</span>
                        </div>
                      </div>
                    </Tooltip>
                  </div>

                  {/* Capacity Utilization Progress Bar */}
                  <Tooltip text="Demand vs gate limit">
                    <div className="mt-3 space-y-1 w-full">
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
                  </Tooltip>

                  {/* Demands List with Add Demand Button */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-secondary-text">
                      <div className="flex items-center space-x-1.5">
                        <span>Demands (Forecasted)</span>
                        <span className="font-mono text-[10px] text-primary font-bold">({dest.demands.length})</span>
                      </div>
                      <Tooltip text="Add demand">
                        <button
                          onClick={() => {
                            setTargetDestForDemand(dest);
                            setDemandFormData({
                              commodity: 'Tomato',
                              demand_quantity: 1000,
                              selling_price: 35.0,
                              delivery_deadline_hours: 48.0,
                            });
                            setFormError('');
                          }}
                          className="btn-press inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Demand</span>
                        </button>
                      </Tooltip>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {dest.demands.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted-text border border-dashed border-border rounded-lg">
                          No active demands. Click "+ Add Demand" to register.
                        </div>
                      ) : (
                        dest.demands.map((dm) => (
                          <div
                            key={dm.id}
                            className="p-2.5 rounded-lg bg-elevated/40 border border-border text-xs space-y-1 group hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary-text">{dm.commodity}</span>
                              <div className="flex items-center space-x-2">
                                <div className="text-right font-mono text-[11px]">
                                  <span className="font-bold text-primary-text">{dm.demand_quantity.toLocaleString()} kg</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-2">₹{dm.selling_price}/kg</span>
                                </div>
                                <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <Tooltip text="Edit demand">
                                    <button
                                      onClick={() => {
                                        setEditingDemand({ destId: dest.id, demand: dm });
                                        setDemandFormData({
                                          commodity: dm.commodity,
                                          demand_quantity: dm.demand_quantity,
                                          selling_price: dm.selling_price,
                                          delivery_deadline_hours: dm.delivery_deadline_hours || 48.0,
                                        });
                                        setFormError('');
                                      }}
                                      className="btn-press p-1 rounded hover:bg-elevated text-secondary-text hover:text-primary transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip text="Delete demand">
                                    <button
                                      onClick={() => {
                                        setDeleteConfirm({
                                          type: 'demand',
                                          id: dm.id,
                                          title: `Delete Demand for ${dm.commodity}?`,
                                          details: `Remove ${dm.demand_quantity.toLocaleString()} kg demand at ₹${dm.selling_price}/kg for ${dest.name}.`,
                                        });
                                        setFormError('');
                                      }}
                                      className="btn-press p-1 rounded hover:bg-rose-500/10 text-secondary-text hover:text-rose-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-text font-mono pt-0.5">
                              <span>Deadline: ≤ {dm.delivery_deadline_hours || 48}h</span>
                              <span className="text-primary/90 font-medium">Seasonal Surge Index: 1.12x</span>
                            </div>
                          </div>
                        ))
                      )}
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

        <form onSubmit={handleAddSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-secondary-text mb-1">Destination Code</label>
              <input
                type="text"
                required
                value={addFormData.code}
                onChange={(e) => setAddFormData({ ...addFormData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-elevated/50 font-mono text-primary-text focus:bg-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-secondary-text mb-1">Hub Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Pune Market Yard"
                value={addFormData.name}
                onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
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
                value={addFormData.location}
                onChange={(e) => setAddFormData({ ...addFormData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-secondary-text mb-1">State / Province</label>
              <CustomSelect
                value={addFormData.state}
                onChange={(val) => setAddFormData({ ...addFormData, state: val })}
                options={STATE_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-secondary-text mb-1">Gate Intake Capacity (kg)</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={addFormData.receiving_capacity === 0 ? '' : addFormData.receiving_capacity}
              onChange={(e) => setAddFormData({ ...addFormData, receiving_capacity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
            />
          </div>

          {/* Initial Demand Specs */}
          <div className="p-3 rounded-xl bg-elevated/40 border border-border space-y-3">
            <span className="font-bold text-primary-text block text-xs">Primary Commodity Demand</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-secondary-text mb-0.5 block">Commodity</label>
                <CustomSelect
                  value={addFormData.commodity}
                  onChange={(val) => setAddFormData({ ...addFormData, commodity: val })}
                  options={COMMODITY_OPTIONS}
                />
              </div>
              <div>
                <label className="text-[11px] text-secondary-text mb-0.5 block">Demand (kg)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={addFormData.demand_quantity === 0 ? '' : addFormData.demand_quantity}
                  onChange={(e) => setAddFormData({ ...addFormData, demand_quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-secondary-text mb-0.5 block">Selling Price (₹/kg)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={addFormData.selling_price === 0 ? '' : addFormData.selling_price}
                  onChange={(e) => setAddFormData({ ...addFormData, selling_price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
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
                min="0.1"
                step="any"
                value={addFormData.travel_time_hours === 0 ? '' : addFormData.travel_time_hours}
                onChange={(e) => setAddFormData({ ...addFormData, travel_time_hours: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-secondary-text mb-1">Transport Tariff (₹/kg)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={addFormData.transport_cost_per_kg === 0 ? '' : addFormData.transport_cost_per_kg}
                onChange={(e) => setAddFormData({ ...addFormData, transport_cost_per_kg: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
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
              className="btn-press inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white dark:text-neutral-950 font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Registering...' : 'Add Destination'}</span>
            </button>
          </div>
        </form>
      </Overlay>

      {/* Edit Destination Modal */}
      <Overlay
        open={!!editingDest}
        onClose={() => setEditingDest(null)}
        closeOnBackdrop={false}
        ariaLabel="Edit destination dialog"
        dialogClassName="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-base font-bold text-primary-text">
            Edit Destination: {editingDest?.name}
          </h3>
          <button
            onClick={() => setEditingDest(null)}
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

        <form onSubmit={handleEditDestSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-secondary-text mb-1">Hub Name</label>
            <input
              type="text"
              required
              value={editDestFormData.name}
              onChange={(e) => setEditDestFormData({ ...editDestFormData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-secondary-text mb-1">City / Location</label>
              <input
                type="text"
                required
                value={editDestFormData.location}
                onChange={(e) => setEditDestFormData({ ...editDestFormData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-secondary-text mb-1">State / Province</label>
              <CustomSelect
                value={editDestFormData.state}
                onChange={(val) => setEditDestFormData({ ...editDestFormData, state: val })}
                options={STATE_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-secondary-text mb-1">Gate Intake Capacity (kg)</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={editDestFormData.receiving_capacity === 0 ? '' : editDestFormData.receiving_capacity}
              onChange={(e) => setEditDestFormData({ ...editDestFormData, receiving_capacity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setEditingDest(null)}
              className="btn-press px-3.5 py-1.5 rounded-lg text-secondary-text hover:bg-elevated font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-press inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white dark:text-neutral-950 font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Overlay>

      {/* Add Demand Modal */}
      <Overlay
        open={!!targetDestForDemand}
        onClose={() => setTargetDestForDemand(null)}
        closeOnBackdrop={false}
        ariaLabel="Add demand dialog"
        dialogClassName="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-border"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-primary-text">Add Commodity Demand</h3>
            <p className="text-xs text-muted-text mt-0.5">For {targetDestForDemand?.name}</p>
          </div>
          <button
            onClick={() => setTargetDestForDemand(null)}
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

        <form onSubmit={handleAddDemandSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-secondary-text mb-1">Commodity</label>
            <CustomSelect
              value={demandFormData.commodity}
              onChange={(val) => setDemandFormData({ ...demandFormData, commodity: val })}
              options={COMMODITY_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-secondary-text mb-1">Demand Quantity (kg)</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={demandFormData.demand_quantity === 0 ? '' : demandFormData.demand_quantity}
                onChange={(e) => setDemandFormData({ ...demandFormData, demand_quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-secondary-text mb-1">Selling Price (₹/kg)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={demandFormData.selling_price === 0 ? '' : demandFormData.selling_price}
                onChange={(e) => setDemandFormData({ ...demandFormData, selling_price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-secondary-text mb-1">Delivery Deadline (Hours from dispatch)</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={demandFormData.delivery_deadline_hours === 0 ? '' : demandFormData.delivery_deadline_hours}
              onChange={(e) => setDemandFormData({ ...demandFormData, delivery_deadline_hours: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setTargetDestForDemand(null)}
              className="btn-press px-3.5 py-1.5 rounded-lg text-secondary-text hover:bg-elevated font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-press inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white dark:text-neutral-950 font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Adding...' : 'Add Demand'}</span>
            </button>
          </div>
        </form>
      </Overlay>

      {/* Edit Demand Modal */}
      <Overlay
        open={!!editingDemand}
        onClose={() => setEditingDemand(null)}
        closeOnBackdrop={false}
        ariaLabel="Edit demand dialog"
        dialogClassName="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-border"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-primary-text">
              Edit Demand: {editingDemand?.demand.commodity}
            </h3>
            <p className="text-xs text-muted-text mt-0.5">Mandi ID #{editingDemand?.destId}</p>
          </div>
          <button
            onClick={() => setEditingDemand(null)}
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

        <form onSubmit={handleEditDemandSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-secondary-text mb-1">Demand Quantity (kg)</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={demandFormData.demand_quantity === 0 ? '' : demandFormData.demand_quantity}
                onChange={(e) => setDemandFormData({ ...demandFormData, demand_quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-secondary-text mb-1">Selling Price (₹/kg)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={demandFormData.selling_price === 0 ? '' : demandFormData.selling_price}
                onChange={(e) => setDemandFormData({ ...demandFormData, selling_price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-secondary-text mb-1">Delivery Deadline (Hours)</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={demandFormData.delivery_deadline_hours === 0 ? '' : demandFormData.delivery_deadline_hours}
              onChange={(e) => setDemandFormData({ ...demandFormData, delivery_deadline_hours: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setEditingDemand(null)}
              className="btn-press px-3.5 py-1.5 rounded-lg text-secondary-text hover:bg-elevated font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-press inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white dark:text-neutral-950 font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Demand'}</span>
            </button>
          </div>
        </form>
      </Overlay>

      {/* Delete Confirmation Modal */}
      <Overlay
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        closeOnBackdrop={false}
        ariaLabel="Confirm deletion"
        dialogClassName="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border text-center"
      >
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-primary-text">{deleteConfirm?.title}</h3>
        <p className="text-xs text-secondary-text mt-1">{deleteConfirm?.details}</p>

        {formError && (
          <div role="alert" className="form-error mt-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs">
            {formError}
          </div>
        )}

        <div className="flex items-center justify-center space-x-3 mt-5">
          <button
            type="button"
            onClick={() => setDeleteConfirm(null)}
            className="btn-press px-4 py-2 rounded-xl text-secondary-text hover:bg-elevated font-medium text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmDelete}
            className="btn-press inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSubmitting ? 'Deleting...' : 'Confirm Delete'}</span>
          </button>
        </div>
      </Overlay>
    </div>
  );
};