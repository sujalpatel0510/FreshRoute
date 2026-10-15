import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  Clock, 
  Warehouse, 
  X,
  ArrowUpDown,
  CheckCircle2,
  PackageCheck,
  Loader2,
  Thermometer
} from 'lucide-react';
import type { Batch } from '../types';
import { Overlay } from './Overlay';
import { Tooltip } from './Tooltip';

interface InventoryPageProps {
  batches: Batch[];
  loading: boolean;
  onAddBatch: (data: Partial<Batch>) => Promise<void>;
  onUpdateBatch: (id: number, data: Partial<Batch>) => Promise<void>;
  onDeleteBatch: (id: number) => Promise<void>;
}

type SortField = 'remaining_shelf_life' | 'quantity' | 'batch_code' | 'commodity';

export const InventoryPage: React.FC<InventoryPageProps> = ({
  batches,
  loading,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('All');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('remaining_shelf_life');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const commodities = ['All', 'Tomato', 'Mango', 'Spinach', 'Banana', 'Onion', 'Potato'];

  const getCommodityEmoji = (comm: string) => {
    switch (comm.toLowerCase()) {
      case 'tomato': return '🍅';
      case 'mango': return '🥭';
      case 'spinach': return '🥬';
      case 'banana': return '🍌';
      case 'onion': return '🧅';
      case 'potato': return '🥔';
      default: return '📦';
    }
  };

  const matchesFilters = (b: Batch) => {
    const matchesSearch = 
      b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.storage_location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesComm = selectedCommodity === 'All' || b.commodity.toLowerCase() === selectedCommodity.toLowerCase();
    
    let matchesUrgency = true;
    if (selectedUrgency === 'Critical') matchesUrgency = b.remaining_shelf_life <= 12;
    else if (selectedUrgency === 'Urgent') matchesUrgency = b.remaining_shelf_life > 12 && b.remaining_shelf_life <= 24;
    else if (selectedUrgency === 'Fresh') matchesUrgency = b.remaining_shelf_life > 24;

    return matchesSearch && matchesComm && matchesUrgency;
  };

  const compareBatches = (a: Batch, b: Batch) => {
    let comp = 0;
    if (sortField === 'remaining_shelf_life') comp = a.remaining_shelf_life - b.remaining_shelf_life;
    else if (sortField === 'quantity') comp = a.quantity - b.quantity;
    else if (sortField === 'batch_code') comp = a.batch_code.localeCompare(b.batch_code);
    else if (sortField === 'commodity') comp = a.commodity.localeCompare(b.commodity);
    return sortAsc ? comp : -comp;
  };

  const filteredBatches = batches.filter(matchesFilters).sort(compareBatches);

  // ---- Row lifecycle animations ---------------------------------------
  // Deletions: keep a "ghost" of each removed row mounted for 240ms so it
  // can fade/collapse out instead of vanishing.
  // Edits: rows whose values actually changed flash a brief highlight.
  // Skipped while `loading` (full reloads replace the whole dataset).
  const batchSig = (b: Batch) =>
    `${b.quantity}|${b.remaining_shelf_life}|${b.storage_location}|${b.status}|${b.handling_cost}|${b.procurement_cost}|${b.notes ?? ''}`;
  const prevBatchesRef = useRef<Batch[]>(batches);
  const rowTimersRef = useRef<number[]>([]);
  const [ghostRows, setGhostRows] = useState<{ batch: Batch; index: number }[]>([]);
  const [flashIds, setFlashIds] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    const prev = prevBatchesRef.current;
    prevBatchesRef.current = batches;
    if (prev === batches || loading) return;

    const currentIds = new Set(batches.map((b) => b.id));
    const removed = prev.filter((b) => !currentIds.has(b.id));
    if (removed.length > 0) {
      // Position ghosts at their previous spot in the *visible* list
      const prevVisible = prev.filter(matchesFilters).sort(compareBatches);
      const removedWithIndex = removed.map((b) => ({
        batch: b,
        index: Math.max(0, prevVisible.findIndex((v) => v.id === b.id)),
      }));
      setGhostRows((g) => [...g, ...removedWithIndex]);
      removedWithIndex.forEach(({ batch }) => {
        rowTimersRef.current.push(
          window.setTimeout(() => setGhostRows((g) => g.filter((x) => x.batch.id !== batch.id)), 240)
        );
      });
    }

    const prevMap = new Map(prev.map((b) => [b.id, b] as const));
    const changed = batches.filter((b) => {
      const old = prevMap.get(b.id);
      return old !== undefined && batchSig(old) !== batchSig(b);
    });
    if (changed.length > 0) {
      const ids = changed.map((b) => b.id);
      setFlashIds((s) => {
        const next = new Set(s);
        ids.forEach((id) => next.add(id));
        return next;
      });
      ids.forEach((id) => {
        rowTimersRef.current.push(
          window.setTimeout(() => {
            setFlashIds((s) => {
              const next = new Set(s);
              next.delete(id);
              return next;
            });
          }, 780)
        );
      });
    }
    // Signature intentionally omits filter/sort state deps: the effect only
    // needs to fire when the dataset itself changes, and it reads the
    // current filter/sort values from this render's closure.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, loading]);

  useEffect(() => () => rowTimersRef.current.forEach((t) => window.clearTimeout(t)), []);

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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getShelfLifeBadge = (hours: number) => {
    if (hours <= 12) {
      return (
        <div className="flex flex-col space-y-1">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{hours.toFixed(1)}h (Critical)</span>
          </span>
          <div className="flex items-center justify-between w-24 text-[9px] font-mono text-muted-text">
            <span>±1.0h band</span>
          </div>
          <div className="w-24 h-1 bg-elevated rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full" style={{ width: `${Math.min(100, (hours / 48) * 100)}%` }} />
          </div>
        </div>
      );
    }
    if (hours <= 24) {
      return (
        <div className="flex flex-col space-y-1">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{hours.toFixed(1)}h (Urgent)</span>
          </span>
          <div className="flex items-center justify-between w-24 text-[9px] font-mono text-muted-text">
            <span>±1.5h band</span>
          </div>
          <div className="w-24 h-1 bg-elevated rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, (hours / 48) * 100)}%` }} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col space-y-1">
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>{hours.toFixed(1)}h (Fresh)</span>
        </span>
        <div className="flex items-center justify-between w-24 text-[9px] font-mono text-muted-text">
          <span>±2.0h band</span>
        </div>
        <div className="w-24 h-1 bg-elevated rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (hours / 72) * 100)}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-primary-text">
              Inventory & Batch Tracking
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
              {filteredBatches.length} batches
            </span>
          </div>
          <p className="text-xs text-secondary-text mt-0.5">
            Real-time FEFO batch management with automated shelf-life decay calculation and storage hub attribution.
          </p>
        </div>

        <Tooltip text="Register a newly harvested or received agricultural produce batch">
          <button
            onClick={handleOpenAdd}
            className="btn-press flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-neutral-950 font-bold text-xs shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Batch</span>
          </button>
        </Tooltip>
      </div>

      {/* Filters, Search & View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" />
          <input
            type="text"
            placeholder="Search lot code, produce, or warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-elevated/60 border border-border rounded-lg text-primary-text placeholder:text-muted-text focus:bg-surface focus:border-primary focus:outline-none transition-all"
          />
        </div>

        {/* Commodity Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 lg:pb-0">
          {commodities.map((comm) => (
            <Tooltip key={comm} text={`Filter inventory for ${comm}`}>
              <button
                onClick={() => setSelectedCommodity(comm)}
                className={`btn-press px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCommodity.toLowerCase() === comm.toLowerCase()
                    ? 'bg-primary/15 text-primary border border-primary/30 font-semibold shadow-xs'
                    : 'bg-elevated/70 text-secondary-text hover:text-primary-text hover:bg-border/60 border border-transparent'
                }`}
              >
                {comm !== 'All' && <span className="mr-1">{getCommodityEmoji(comm)}</span>}
                <span>{comm}</span>
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Urgency Filter */}
        <div className="flex items-center space-x-1 shrink-0">
          {['All', 'Critical', 'Urgent', 'Fresh'].map((urgency) => (
            <Tooltip key={urgency} text={`Filter by ${urgency} shelf-life category`}>
              <button
                onClick={() => setSelectedUrgency(urgency)}
                className={`btn-press px-2 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                  selectedUrgency === urgency
                    ? 'bg-primary text-white dark:text-neutral-950 font-bold'
                    : 'text-secondary-text hover:bg-elevated'
                }`}
              >
                {urgency}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-elevated/70 border-b border-border text-secondary-text uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-primary-text transition-colors" onClick={() => toggleSort('batch_code')}>
                  <Tooltip text="Click to sort by batch ID">
                    <div className="flex items-center space-x-1">
                      <span>Batch ID</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'batch_code' ? 'text-primary' : 'text-muted-text'}`} />
                    </div>
                  </Tooltip>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-primary-text transition-colors" onClick={() => toggleSort('commodity')}>
                  <Tooltip text="Click to sort by commodity crop type">
                    <div className="flex items-center space-x-1">
                      <span>Commodity</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'commodity' ? 'text-primary' : 'text-muted-text'}`} />
                    </div>
                  </Tooltip>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-primary-text transition-colors" onClick={() => toggleSort('quantity')}>
                  <Tooltip text="Click to sort by available quantity">
                    <div className="flex items-center justify-end space-x-1">
                      <span>Available Qty</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'quantity' ? 'text-primary' : 'text-muted-text'}`} />
                    </div>
                  </Tooltip>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-primary-text transition-colors" onClick={() => toggleSort('remaining_shelf_life')}>
                  <Tooltip text="Click to sort by remaining shelf life (FEFO)">
                    <div className="flex items-center space-x-1">
                      <span>Remaining Shelf Life</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'remaining_shelf_life' ? 'text-primary' : 'text-muted-text'}`} />
                    </div>
                  </Tooltip>
                </th>
                <th className="py-3 px-4">
                  <Tooltip text="Storage hub facility and climate control">
                    <span>Storage Location</span>
                  </Tooltip>
                </th>
                <th className="py-3 px-4 text-right">
                  <Tooltip text="Inland handling and procurement tariffs per kg">
                    <span>Tariffs (₹/kg)</span>
                  </Tooltip>
                </th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium text-primary-text">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-text">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading inventory batches from PostgreSQL...</span>
                  </td>
                </tr>
              ) : (() => {
                // Surviving rows, then deletion ghosts re-inserted at their
                // previous position so rows below don't jump.
                const ghostIds = new Set(ghostRows.map((g) => g.batch.id));
                const merged = filteredBatches.filter((b) => !ghostIds.has(b.id));
                [...ghostRows]
                  .filter((g) => matchesFilters(g.batch))
                  .sort((a, b) => a.index - b.index)
                  .forEach((g) => merged.splice(Math.min(g.index, merged.length), 0, g.batch));

                if (merged.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-text">
                        <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <span>No matching batches found. Try clearing filters or adding a new batch.</span>
                      </td>
                    </tr>
                  );
                }

                return merged.map((batch, rowIdx) => {
                  const isGhost = ghostIds.has(batch.id);
                  const rowClass = isGhost
                    ? 'row-exit'
                    : flashIds.has(batch.id)
                      ? 'row-flash'
                      : 'row-enter';
                  return (
                    <tr
                      key={batch.id}
                      className={`${rowClass} hover:bg-elevated/50 transition-colors`}
                      style={isGhost ? undefined : { animationDelay: `${Math.min(rowIdx, 10) * 25}ms` }}
                    >
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {batch.batch_code}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="text-base select-none">{getCommodityEmoji(batch.commodity)}</span>
                        <span>{batch.commodity}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-primary-text">
                      {batch.quantity.toLocaleString()} <span className="text-[10px] text-muted-text">kg</span>
                    </td>
                    <td className="py-3 px-4">
                      {getShelfLifeBadge(batch.remaining_shelf_life)}
                    </td>
                    <td className="py-3 px-4 text-secondary-text">
                      <div className="flex items-center space-x-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-muted-text shrink-0" />
                        <span className="truncate max-w-[140px] font-medium text-primary-text">{batch.storage_location}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] font-mono mt-0.5 text-emerald-600 dark:text-emerald-400">
                        <Thermometer className="w-3 h-3 shrink-0" />
                        <span>{batch.remaining_shelf_life > 20 ? '3.2°C Reefer (Optimal)' : '8.4°C Ambient (Expedite)'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] tabular-nums">
                      <div>
                        <span className="text-muted-text">Handling:</span> ₹{batch.handling_cost.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-muted-text">
                        Proc: ₹{batch.procurement_cost.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        batch.status === 'Available'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-500/10 text-secondary-text border-border'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Tooltip text="Edit batch details">
                          <button
                            onClick={() => handleOpenEdit(batch)}
                            className="btn-press p-1.5 text-muted-text hover:text-primary hover:bg-elevated rounded-lg transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Delete batch from database">
                          <button
                            onClick={() => { setDeletingBatch(batch); setDeleteOpen(true); }}
                            className="btn-press p-1.5 text-muted-text hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Overlay
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        closeOnBackdrop={false}
        ariaLabel={editingBatch ? 'Edit batch dialog' : 'Register new batch dialog'}
        dialogClassName="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border"
      >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-primary-text">
                {editingBatch ? `Edit Batch: ${editingBatch.batch_code}` : 'Register New Inventory Batch'}
              </h3>
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
                  <label className="block font-semibold text-secondary-text mb-1">Batch Identifier</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingBatch}
                    value={formData.batch_code}
                    onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-elevated/50 font-mono text-primary-text focus:bg-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Commodity</label>
                  <select
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
                  >
                    <option value="Tomato">Tomato 🍅</option>
                    <option value="Mango">Mango 🥭</option>
                    <option value="Spinach">Spinach 🥬</option>
                    <option value="Banana">Banana 🍌</option>
                    <option value="Onion">Onion 🧅</option>
                    <option value="Potato">Potato 🥔</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.quantity === 0 ? '' : formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Shelf Life Remaining (Hours)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={formData.remaining_shelf_life === 0 ? '' : formData.remaining_shelf_life}
                    onChange={(e) => setFormData({ ...formData, remaining_shelf_life: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-secondary-text mb-1">Storage Hub</label>
                <select
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
                >
                  <option value="Nashik Agro Hub">Nashik Agro Hub (Central Maharashtra)</option>
                  <option value="Pune Cold Facility">Pune Cold Facility (Western Maharashtra)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Handling Cost (₹/kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.handling_cost === 0 ? '' : formData.handling_cost}
                    onChange={(e) => setFormData({ ...formData, handling_cost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-secondary-text mb-1">Procurement Cost (₹/kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.procurement_cost === 0 ? '' : formData.procurement_cost}
                    onChange={(e) => setFormData({ ...formData, procurement_cost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-secondary-text mb-1">Quality Inspection Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Firmness index, respiration rating, harvesting date..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-primary-text focus:border-primary focus:outline-none"
                />
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
                  <span>{isSubmitting ? 'Saving to Database...' : editingBatch ? 'Update Batch' : 'Register Batch'}</span>
                </button>
              </div>
            </form>
      </Overlay>

      {/* Delete Confirmation Dialog */}
      <Overlay
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeletingBatch(null); }}
        ariaLabel="Confirm batch deletion"
        dialogClassName="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-xl border border-border space-y-3"
      >
        {deletingBatch && (
          <>
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-primary-text">Confirm Batch Deletion</h4>
            </div>

            <p className="text-xs text-secondary-text leading-relaxed">
              Are you sure you want to delete batch <strong className="font-mono text-primary-text">{deletingBatch.batch_code}</strong> ({deletingBatch.quantity} kg of {deletingBatch.commodity})? This will permanently remove it from PostgreSQL.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="btn-press px-3 py-1.5 text-xs text-secondary-text hover:bg-elevated rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteBatch(deletingBatch.id);
                    setDeleteOpen(false);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="btn-press inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Batch'}</span>
              </button>
            </div>
          </>
        )}
      </Overlay>
    </div>
  );
};