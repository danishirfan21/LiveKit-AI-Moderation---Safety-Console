'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchAuditLogs,
  selectAuditEntries,
  selectAuditLoading,
  selectAuditFilters,
  setFilters,
  clearFilters,
} from '@/store/auditSlice';
import { auditApi } from '@/lib/api';
import type { AuditLogEntry, AuditActionType, AuditActor } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TimeAgo } from '@/components/shared/TimeAgo';
import { JsonViewer } from '@/components/shared/JsonViewer';
import {
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

function ActionTypeBadge({ actionType }: { actionType: AuditActionType }) {
  const config: Record<AuditActionType, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'gray' }> = {
    decision_created: { label: 'Created', variant: 'info' },
    action_executed: { label: 'Executed', variant: 'success' },
    policy_updated: { label: 'Policy Update', variant: 'warning' },
    decision_reviewed: { label: 'Reviewed', variant: 'success' },
    decision_overturned: { label: 'Overturned', variant: 'danger' },
    participant_warned: { label: 'Warned', variant: 'warning' },
    participant_muted: { label: 'Muted', variant: 'danger' },
    content_flagged: { label: 'Flagged', variant: 'info' },
  };

  const { label, variant } = config[actionType];
  return <StatusBadge label={label} variant={variant} />;
}

function ActorBadge({ actor }: { actor: AuditActor }) {
  const config: Record<AuditActor, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'gray' }> = {
    system: { label: 'System', variant: 'gray' },
    ai: { label: 'AI', variant: 'info' },
    admin: { label: 'Admin', variant: 'success' },
  };

  const { label, variant } = config[actor];
  return <StatusBadge label={label} variant={variant} />;
}

export default function AuditPage() {
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectAuditEntries);
  const loading = useAppSelector(selectAuditLoading);
  const filters = useAppSelector(selectAuditFilters);

  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    dispatch(fetchAuditLogs({ filters, limit: 50 }));
  }, [dispatch, filters]);

  const toggleRow = (auditId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(auditId)) {
      newExpanded.delete(auditId);
    } else {
      newExpanded.add(auditId);
    }
    setExpandedRows(newExpanded);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const data = await auditApi.export(format, filters);
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'expand',
      header: '',
      width: '40px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRow(item.audit_id);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          {expandedRows.has(item.audit_id) ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      width: '120px',
      render: (item) => <TimeAgo timestamp={item.timestamp} className="text-xs" />,
    },
    {
      key: 'action_type',
      header: 'Action',
      render: (item) => <ActionTypeBadge actionType={item.action_type} />,
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (item) => <ActorBadge actor={item.actor} />,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (item) => (
        <div className="max-w-[400px] truncate text-gray-600" title={item.reason}>
          {item.reason}
        </div>
      ),
    },
    {
      key: 'decision_id',
      header: 'Decision ID',
      render: (item) =>
        item.decision_id ? (
          <span className="font-mono text-xs text-gray-500">{item.decision_id}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600 mt-1">
            Complete audit trail of all moderation actions and system events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary ${showFilters ? 'bg-primary-50' : ''}`}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {hasFilters && (
              <span className="ml-2 bg-primary-600 text-white text-xs px-1.5 rounded-full">
                !
              </span>
            )}
          </button>
          {hasFilters && (
            <button onClick={() => dispatch(clearFilters())} className="btn btn-secondary">
              <XMarkIcon className="h-4 w-4 mr-2" />
              Clear
            </button>
          )}
          <div className="relative group">
            <button
              disabled={exporting}
              className="btn btn-secondary"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 hidden group-hover:block z-10">
              <button
                onClick={() => handleExport('json')}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
              >
                Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Action Type</label>
              <select
                className="form-select"
                value={filters.action_type || ''}
                onChange={(e) =>
                  dispatch(setFilters({ ...filters, action_type: e.target.value as AuditActionType || undefined }))
                }
              >
                <option value="">All</option>
                <option value="decision_created">Decision Created</option>
                <option value="action_executed">Action Executed</option>
                <option value="policy_updated">Policy Updated</option>
                <option value="decision_reviewed">Decision Reviewed</option>
                <option value="decision_overturned">Decision Overturned</option>
                <option value="participant_warned">Participant Warned</option>
                <option value="participant_muted">Participant Muted</option>
                <option value="content_flagged">Content Flagged</option>
              </select>
            </div>
            <div>
              <label className="form-label">Actor</label>
              <select
                className="form-select"
                value={filters.actor || ''}
                onChange={(e) =>
                  dispatch(setFilters({ ...filters, actor: e.target.value as AuditActor || undefined }))
                }
              >
                <option value="">All</option>
                <option value="system">System</option>
                <option value="ai">AI</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="form-label">Decision ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Filter by decision ID..."
                value={filters.decision_id || ''}
                onChange={(e) =>
                  dispatch(setFilters({ ...filters, decision_id: e.target.value || undefined }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Audit log table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div>
            <DataTable
              columns={columns}
              data={entries}
              keyExtractor={(item) => item.audit_id}
              emptyMessage="No audit log entries found"
            />

            {/* Expanded rows with metadata */}
            {entries.map((entry) =>
              expandedRows.has(entry.audit_id) && entry.metadata ? (
                <div
                  key={`${entry.audit_id}-expanded`}
                  className="px-4 py-3 bg-gray-50 border-t border-gray-200"
                >
                  <p className="text-xs text-gray-500 mb-2">Metadata</p>
                  <JsonViewer data={entry.metadata} initialExpanded />
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
