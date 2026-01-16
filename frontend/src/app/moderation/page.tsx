'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchDecisions,
  selectDecisions,
  selectModerationLoading,
  selectModerationFilters,
  setFilters,
  clearFilters,
} from '@/store/moderationSlice';
import type { ModerationDecision, ModerationAction, PolicyCategory, ModerationStatus } from '@/types';
import { DataTable, Column } from '@/components/shared/DataTable';
import {
  ModerationActionBadge,
  ModerationStatusBadge,
  PolicyCategoryBadge,
} from '@/components/shared/StatusBadge';
import { ConfidenceBar } from '@/components/shared/ConfidenceBar';
import { TimeAgo } from '@/components/shared/TimeAgo';
import { DecisionModal } from '@/components/moderation/DecisionModal';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ModerationPage() {
  const dispatch = useAppDispatch();
  const decisions = useAppSelector(selectDecisions);
  const loading = useAppSelector(selectModerationLoading);
  const filters = useAppSelector(selectModerationFilters);

  const [selectedDecision, setSelectedDecision] = useState<ModerationDecision | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchDecisions({ filters, limit: 50 }));
  }, [dispatch, filters]);

  const columns: Column<ModerationDecision>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      width: '120px',
      render: (item) => <TimeAgo timestamp={item.timestamp} className="text-xs" />,
    },
    {
      key: 'participant_identity',
      header: 'Participant',
      render: (item) => (
        <div className="max-w-[150px] truncate" title={item.participant_identity}>
          {item.participant_identity}
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Content',
      render: (item) => (
        <div className="max-w-[250px] truncate text-gray-600" title={item.content}>
          {item.content}
        </div>
      ),
    },
    {
      key: 'classification',
      header: 'Category',
      render: (item) => <PolicyCategoryBadge category={item.classification} />,
    },
    {
      key: 'confidence_score',
      header: 'Confidence',
      sortable: true,
      width: '150px',
      render: (item) => <ConfidenceBar value={item.confidence_score} size="sm" />,
    },
    {
      key: 'action',
      header: 'Action',
      render: (item) => <ModerationActionBadge action={item.action} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <ModerationStatusBadge status={item.status} />,
    },
  ];

  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderation Decisions</h1>
          <p className="text-gray-600 mt-1">Review and manage AI moderation decisions</p>
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
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Action</label>
              <select
                className="form-select"
                value={filters.action || ''}
                onChange={(e) =>
                  dispatch(setFilters({ ...filters, action: e.target.value as ModerationAction || undefined }))
                }
              >
                <option value="">All</option>
                <option value="none">None</option>
                <option value="warn">Warn</option>
                <option value="mute">Mute</option>
                <option value="flag_for_review">Flagged</option>
              </select>
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={filters.classification || ''}
                onChange={(e) =>
                  dispatch(setFilters({ ...filters, classification: e.target.value as PolicyCategory || undefined }))
                }
              >
                <option value="">All</option>
                <option value="harassment">Harassment</option>
                <option value="hate_speech">Hate Speech</option>
                <option value="spam">Spam</option>
                <option value="violence">Violence</option>
                <option value="adult_content">Adult Content</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status || ''}
                onChange={(e) =>
                  dispatch(setFilters({ ...filters, status: e.target.value as ModerationStatus || undefined }))
                }
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="executed">Executed</option>
                <option value="reviewed">Reviewed</option>
                <option value="overturned">Overturned</option>
              </select>
            </div>
            <div>
              <label className="form-label">Min Confidence</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="1"
                step="0.1"
                value={filters.min_confidence ?? ''}
                onChange={(e) =>
                  dispatch(setFilters({ ...filters, min_confidence: e.target.value ? parseFloat(e.target.value) : undefined }))
                }
                placeholder="0.0 - 1.0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Decisions table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={decisions}
            keyExtractor={(item) => item.decision_id}
            onRowClick={setSelectedDecision}
            emptyMessage="No moderation decisions found"
          />
        )}
      </div>

      {/* Decision detail modal */}
      {selectedDecision && (
        <DecisionModal
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
        />
      )}
    </div>
  );
}
