import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  Clock, 
  Warehouse, 
  X
} from 'lucide-react';
import type { Batch } from '../types';
import { useTheme } from '../components/ThemeToggle';

interface InventoryPageProps {
  batches: Batch[];
  loading: boolean;
  onAddBatch: (data: Partial<Batch>) => Promise<void>;
  onUpdateBatch: (id: number, data: Partial<Batch>) => Promise<void>;
  onDeleteBatch: (id: number) => Promise<void>;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  batches,
  loading,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    batch_code: '',
    commodity: 'Tomato',
    quantity: 1000,
    remaining_shelf_life: 24,
    storage_location: 'Nashik Agro Hub',
    handling_cost: 1.5,
    procurement_cost: 15.0,
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commodities = ['All', 'Tomato', 'Mango', 'Spinach', 'Banana', 'Onion'];

  const filteredBatches = batches.filter((b) => {
    const matchesSearch = 
      b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.storage_location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesComm = selectedCommodity === 'All' || b.commodity.toLowerCase() === selectedCommodity.toLowerCase();
    return matchesSearch && matchesComm;
  });

  const handleOpenAdd = () => {
    setEditingBatch(null);
    setFormData({
      batch_code: `BATCH-${Date.now().toString().slice(-4)}`,
      commodity: 'Tomato',
      quantity: 1500,
      remaining_shelf_life: 24,
      storage_location: 'Nashik Agro Hub',
      handling_cost: 1.2,
      procurement_cost: 14.0,
      notes: '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      batch_code: batch.batch_code,
      commodity: batch.commodity,
      quantity: batch.quantity,
      remaining_shelf_life: batch.remaining_shelf_life,
      storage_location: batch.storage_location,
      handling_cost: batch.handling_cost,
      procurement_cost: batch.procurement_cost,
      notes: batch.notes || '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantity <= 0) {
      setFormError('Quantity must be greater than zero kg');
      return;
    }
    if (formData.remaining_shelf_life <= 0) {
      setFormError('Remaining shelf life must be greater than 0 hours');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingBatch) {
        await onUpdateBatch(editingBatch.id, formData);
      } else {
        await onAddBatch(formData);
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShelfLifeBadge = (hours: number) => {
    if (hours <= 12) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning border border-warning/30">
          <Clock className="w-3 h-3 text-warning animate-pulse" />
          <span>{hours.toFixed(1)}h (Critical)</span>
        </span>
      );
    }
    if (hours <= 24) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
          <Clock className="w-3 h-3 text-primary" />
          <span>{hours.toFixed(1)}h (Urgent)</span>
        </span>
      );
    }
    if (hours <= 48) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface/50 text-var(--primary) border border-primary/30">
          <Clock className="w-3 h-3 text-var(--primary)" />
          <span>{hours.toFixed(1)}h (Fresh)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface/50 text-var(--muted-text) border border-border/30">
        <Clock className="w-3 h-3 text-var(--muted-text)" />
        <span>{hours.toFixed(1)}h (Sturdy)</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const base = 'inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase';
    if (status === 'Available') {
      return `${base} bg-primary/20 text-primary border var(--primary)/30`;
    }
    if (status === 'Allocated') {
      return `${base} bg-surface/20 text-var(--muted-text) border var(--border)/30`;
    }
    return `${base} bg-warning/20 text-warning border var(--warning)/30`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-body dark:text-[color:var(--primary-text)]">
            Inventory & Batch Management
          </h2>
          <p className="text-xs text-var(--muted-text) mt-0.5">
            Real-time batch tracking with shelf-life degradation monitors and warehouse handling costs.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-surface font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Batch</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-var(--muted-text)" />
          <input
            type="text"
            placeholder="Search by batch ID, commodity, or warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface/50 text-sm"
          />
        </div>

        {/* Commodity Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-3 md:pb-0">
          {commodities.map((comm) => (
            <button
              key={comm}
              onClick={() => setSelectedCommodity(comm)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCommodity.toLowerCase() === comm.toLowerCase()
                  ? 'bg-primary/20 text-primary border var(--primary)/30'
                  : 'bg-surface/50 text-var(--muted-text) hover:bg-surface/80'
              }`}
            >
              {comm}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 border-b border-border/30 text-var(--muted-text) uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4 text-right">Available Qty</th>
                <th className="py-3 px-4">Remaining Shelf Life</th>
                <th className="py-3 px-4">Storage Hub</th>
                <th className="py-3 px-4 text-right">Costs (₹/kg)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-medium text-body dark:text-[color:var(--primary-text)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-var(--muted-text)">
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-var(--muted-text)">
                    No matching inventory batches found.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-body dark:text-[color:var(--primary-text)]">
                      {batch.batch_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-body dark:text-[color:var(--primary-text)]">
                      {batch.commodity}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-body dark:text-[color:var(--primary-text)]">
                      {batch.quantity.toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4">
                      {getShelfLifeBadge(batch.remaining_shelf_life)}
                    </td>
                    <td className="py-3 px-4 text-var(--muted-text) flex items-center space-x-1.5 pt-3.5">
                      <Warehouse className="w-3.5 h-3.5 text-var(--muted-text)" />
                      <span>{batch.storage_location}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-var(--muted-text)">
                      <div className="text-sm">
                        <span className="text-var(--muted-text)">Handl:</span> ₹{batch.handling_cost.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-var(--muted-text)">
                        Proc: ₹{batch.procurement_cost.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={getStatusBadge(batch.status)}>
                        {batch.status === 'Available' ? 'Available' : 'Allocated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(batch)}
                          className="p-1.5 text-var(--muted-text) hover:text-primary rounded-lg transition-all"
                          title="Edit batch"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete batch ${batch.batch_code}?`)) {
                              onDeleteBatch(batch.id);
                            }
                          }}
                          className="p-1.5 text-var(--muted-text) hover:text-error rounded-lg transition-all"
                          title="Delete batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/60 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <h3 className="text-lg font-bold text-body dark:text-[color:var(--primary-text)]">
                {editingBatch ? `Edit Batch: ${editingBatch.batch_code}` : 'Register New Inventory Batch'}
              </h3>
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
                  <label className="block font-semibold text-var(--muted-text) mb-1">Batch Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingBatch}
                    value={formData.batch_code}
                    onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-surface/50 text-mono font-medium disabled:bg-surface/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Commodity</label>
                  <select
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="Tomato">Tomato</option>
                    <option value="Mango">Mango</option>
                    <option value="Spinach">Spinach</option>
                    <option value="Banana">Banana</option>
                    <option value="Onion">Onion</option>
                    <option value="Potato">Potato</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Remaining Shelf Life (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={formData.remaining_shelf_life}
                    onChange={(e) => setFormData({ ...formData, remaining_shelf_life: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Storage Location (Warehouse)</label>
                  <select
                    value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="Nashik Agro Hub">Nashik Agro Hub (Central Hub)</option>
                    <option value="Pune Cold Facility">Pune Cold Facility (Rural Hub)</option>
                  </select>
                </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Handling Cost (₹/kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.handling_cost}
                    onChange={(e) => setFormData({ ...formData, handling_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Procurement Cost (₹/kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.procurement_cost}
                    onChange={(e) => setFormData({ ...formData, procurement_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus-border"
                  />
                </div>
              </div>

                <div>
                  <label className="block font-semibold text-var(--muted-text) mb-1">Quality Inspection Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Firmness index, respiration rate, harvest taluka..."
                    className="w-full px-3 py-2 rounded-full border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary focus-border"
                  ></textarea>
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
                    {isSubmitting ? 'Saving...' : editingBatch ? 'Save Changes' : 'Register Batch'}
                  </button>
                </div>
                </div>
              </form>
            </div>
          </div>
        </div>
    </div>
  );
};