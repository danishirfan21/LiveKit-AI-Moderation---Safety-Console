'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/store';
import { reviewDecision, overturnDecision } from '@/store/moderationSlice';
import type { ModerationDecision } from '@/types';
import {
  ModerationActionBadge,
  ModerationStatusBadge,
  PolicyCategoryBadge,
} from '@/components/shared/StatusBadge';
import { ConfidenceBar } from '@/components/shared/ConfidenceBar';
import { TimeAgo } from '@/components/shared/TimeAgo';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DecisionModalProps {
  decision: ModerationDecision;
  onClose: () => void;
}

export function DecisionModal({ decision, onClose }: DecisionModalProps) {
  const dispatch = useAppDispatch();
  const [reviewNotes, setReviewNotes] = useState('');
  const [overturnReason, setOverturnReason] = useState('');
  const [showOverturn, setShowOverturn] = useState(false);

  const handleReview = (approved: boolean) => {
    dispatch(reviewDecision({
      decisionId: decision.decision_id,
      approved,
      notes: reviewNotes || undefined,
    }));
    onClose();
  };

  const handleOverturn = () => {
    if (!overturnReason.trim()) return;
    dispatch(overturnDecision({
      decisionId: decision.decision_id,
      reason: overturnReason,
    }));
    onClose();
  };

  const canReview = decision.action === 'flag_for_review' && decision.status !== 'reviewed';
  const canOverturn = decision.status !== 'overturned';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Decision Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Status badges */}
            <div className="flex items-center space-x-2">
              <PolicyCategoryBadge category={decision.classification} />
              <ModerationActionBadge action={decision.action} />
              <ModerationStatusBadge status={decision.status} />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Decision ID</p>
                <p className="font-mono text-gray-900">{decision.decision_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Timestamp</p>
                <p className="text-gray-900">
                  <TimeAgo timestamp={decision.timestamp} />
                </p>
              </div>
              <div>
                <p className="text-gray-500">Room ID</p>
                <p className="font-mono text-gray-900 truncate">{decision.room_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Participant</p>
                <p className="text-gray-900">{decision.participant_identity}</p>
              </div>
            </div>

            {/* Confidence */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Confidence Score</p>
              <ConfidenceBar value={decision.confidence_score} size="lg" />
            </div>

            {/* Content */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Content</p>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900">
                {decision.content}
              </div>
            </div>

            {/* Reasoning */}
            {decision.reasoning && (
              <div>
                <p className="text-sm text-gray-500 mb-2">AI Reasoning</p>
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
                  {decision.reasoning}
                </div>
              </div>
            )}

            {/* Metadata JSON */}
            {decision.metadata && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Metadata</p>
                <JsonViewer data={decision.metadata} />
              </div>
            )}

            {/* Review actions */}
            {canReview && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-900 mb-3">Review Decision</p>
                <textarea
                  className="form-input mb-3"
                  rows={2}
                  placeholder="Optional review notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReview(true)}
                    className="btn btn-primary"
                  >
                    Approve Decision
                  </button>
                  <button
                    onClick={() => handleReview(false)}
                    className="btn btn-secondary"
                  >
                    Reject Decision
                  </button>
                </div>
              </div>
            )}

            {/* Overturn actions */}
            {canOverturn && (
              <div className="border-t border-gray-200 pt-4">
                {!showOverturn ? (
                  <button
                    onClick={() => setShowOverturn(true)}
                    className="btn btn-danger btn-sm"
                  >
                    Overturn Decision
                  </button>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-3">Overturn Decision</p>
                    <textarea
                      className="form-input mb-3"
                      rows={2}
                      placeholder="Reason for overturning (required)..."
                      value={overturnReason}
                      onChange={(e) => setOverturnReason(e.target.value)}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleOverturn}
                        disabled={!overturnReason.trim()}
                        className="btn btn-danger"
                      >
                        Confirm Overturn
                      </button>
                      <button
                        onClick={() => setShowOverturn(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
