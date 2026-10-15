import type {
  Batch,
  Destination,
  DistributionPlan,
  EvaluationComparison,
  DashboardMetrics,
  Scenario
} from './types';

const BASE_URL = '/api';

export async function fetchDashboard(): Promise<DashboardMetrics> {
  const res = await fetch(`${BASE_URL}/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
  return res.json();
}

export async function fetchBatches(commodity?: string): Promise<Batch[]> {
  const url = commodity ? `${BASE_URL}/batches?commodity=${encodeURIComponent(commodity)}` : `${BASE_URL}/batches`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch batches');
  return res.json();
}

export async function createBatch(data: Partial<Batch>): Promise<Batch> {
  const res = await fetch(`${BASE_URL}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create batch');
  }
  return res.json();
}

export async function updateBatch(id: number, data: Partial<Batch>): Promise<Batch> {
  const res = await fetch(`${BASE_URL}/batches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update batch');
  return res.json();
}

export async function deleteBatch(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/batches/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete batch');
}

export async function fetchDestinations(): Promise<Destination[]> {
  const res = await fetch(`${BASE_URL}/destinations`);
  if (!res.ok) throw new Error('Failed to fetch destinations');
  return res.json();
}

export async function createDestination(data: any): Promise<Destination> {
  const res = await fetch(`${BASE_URL}/destinations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create destination');
  }
  return res.json();
}

export async function updateDestination(id: number, data: any): Promise<Destination> {
  const res = await fetch(`${BASE_URL}/destinations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update destination');
  }
  return res.json();
}

export async function deleteDestination(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/destinations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete destination');
}

export async function createDemand(destinationId: number, data: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/destinations/${destinationId}/demands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to add demand');
  }
  return res.json();
}

export async function updateDemand(demandId: number, data: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/demands/${demandId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update demand');
  }
  return res.json();
}

export async function deleteDemand(demandId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/demands/${demandId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete demand');
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${BASE_URL}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function runOptimizePlan(params: {
  scenario_key?: string;
  enable_discounts?: boolean;
  min_shelf_life_buffer_hours?: number;
}): Promise<DistributionPlan> {
  const res = await fetch(`${BASE_URL}/plans/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      strategy: 'freshroute',
      scenario_key: params.scenario_key || 'normal',
      enable_discounts: params.enable_discounts ?? true,
      min_shelf_life_buffer_hours: params.min_shelf_life_buffer_hours ?? 4.0,
    }),
  });
  if (!res.ok) throw new Error('Optimization failed');
  return res.json();
}

export async function runBaselinePlan(params: {
  scenario_key?: string;
  min_shelf_life_buffer_hours?: number;
}): Promise<DistributionPlan> {
  const res = await fetch(`${BASE_URL}/plans/baseline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      strategy: 'baseline',
      scenario_key: params.scenario_key || 'normal',
      enable_discounts: false,
      min_shelf_life_buffer_hours: params.min_shelf_life_buffer_hours ?? 4.0,
    }),
  });
  if (!res.ok) throw new Error('Baseline generation failed');
  return res.json();
}

export async function runSimulation(scenario_key: string, enable_discounts = true): Promise<EvaluationComparison> {
  const res = await fetch(`${BASE_URL}/simulations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario_key,
      enable_discounts,
    }),
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function resetDatabaseSeed(): Promise<void> {
  const res = await fetch(`${BASE_URL}/system/reset-seed`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset dataset');
}
