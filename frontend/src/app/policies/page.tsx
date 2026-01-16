'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchPolicies,
  selectPolicies,
  selectPoliciesLoading,
} from '@/store/policiesSlice';
import { PolicyCard } from '@/components/policies/PolicyCard';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function PoliciesPage() {
  const dispatch = useAppDispatch();
  const policies = useAppSelector(selectPolicies);
  const loading = useAppSelector(selectPoliciesLoading);

  useEffect(() => {
    dispatch(fetchPolicies());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Policy Configuration</h1>
        <p className="text-gray-600 mt-1">
          Configure moderation thresholds for each policy category
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900">How thresholds work</h3>
        <p className="text-sm text-blue-700 mt-1">
          When content is classified with a confidence score, it is compared against these
          thresholds. Thresholds must be ordered: Warn &lt; Mute &lt; Flag.
        </p>
        <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
          <li><strong>Warn</strong>: Send a warning to the participant</li>
          <li><strong>Mute</strong>: Temporarily mute the participant</li>
          <li><strong>Flag for Review</strong>: Add to review queue for human review</li>
        </ul>
      </div>

      {/* Policies list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : policies.length === 0 ? (
        <div className="card p-8 text-center">
          <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Policies Found</h3>
          <p className="text-gray-500">
            Policies will be initialized when the backend starts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <PolicyCard key={policy.policy_id} policy={policy} />
          ))}
        </div>
      )}
    </div>
  );
}
