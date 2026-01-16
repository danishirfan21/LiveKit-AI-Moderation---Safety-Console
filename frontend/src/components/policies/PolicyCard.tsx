'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { updatePolicy, togglePolicy, selectPoliciesSaving } from '@/store/policiesSlice';
import type { Policy } from '@/types';
import { PolicyCategoryBadge } from '@/components/shared/StatusBadge';

interface PolicyCardProps {
  policy: Policy;
}

export function PolicyCard({ policy }: PolicyCardProps) {
  const dispatch = useAppDispatch();
  const saving = useAppSelector(selectPoliciesSaving);

  const [warnThreshold, setWarnThreshold] = useState(policy.warn_threshold);
  const [muteThreshold, setMuteThreshold] = useState(policy.mute_threshold);
  const [flagThreshold, setFlagThreshold] = useState(policy.flag_threshold);
  const [hasChanges, setHasChanges] = useState(false);

  const handleThresholdChange = (
    setter: (v: number) => void,
    value: number
  ) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate thresholds
    if (warnThreshold > muteThreshold || muteThreshold > flagThreshold) {
      alert('Thresholds must be ordered: Warn ≤ Mute ≤ Flag');
      return;
    }

    dispatch(updatePolicy({
      policyId: policy.policy_id,
      update: {
        warn_threshold: warnThreshold,
        mute_threshold: muteThreshold,
        flag_threshold: flagThreshold,
      },
    }));
    setHasChanges(false);
  };

  const handleReset = () => {
    setWarnThreshold(policy.warn_threshold);
    setMuteThreshold(policy.mute_threshold);
    setFlagThreshold(policy.flag_threshold);
    setHasChanges(false);
  };

  const handleToggle = () => {
    dispatch(togglePolicy(policy.policy_id));
  };

  return (
    <div className={`card ${!policy.enabled ? 'opacity-60' : ''}`}>
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold text-gray-900">{policy.name}</h3>
          <PolicyCategoryBadge category={policy.category} />
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          <span className="ml-2 text-sm text-gray-600">
            {policy.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      <div className="card-body space-y-6">
        <p className="text-sm text-gray-600">{policy.description}</p>

        {/* Threshold sliders */}
        <div className="space-y-4">
          {/* Warn threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-warning-700">
                Warn Threshold
              </label>
              <span className="text-sm font-mono text-gray-600">
                {Math.round(warnThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={warnThreshold * 100}
              onChange={(e) =>
                handleThresholdChange(setWarnThreshold, parseInt(e.target.value) / 100)
              }
              className="w-full h-2 bg-warning-200 rounded-lg appearance-none cursor-pointer accent-warning-500"
              disabled={!policy.enabled}
            />
          </div>

          {/* Mute threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-danger-700">
                Mute Threshold
              </label>
              <span className="text-sm font-mono text-gray-600">
                {Math.round(muteThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={muteThreshold * 100}
              onChange={(e) =>
                handleThresholdChange(setMuteThreshold, parseInt(e.target.value) / 100)
              }
              className="w-full h-2 bg-danger-200 rounded-lg appearance-none cursor-pointer accent-danger-500"
              disabled={!policy.enabled}
            />
          </div>

          {/* Flag threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-primary-700">
                Flag for Review Threshold
              </label>
              <span className="text-sm font-mono text-gray-600">
                {Math.round(flagThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={flagThreshold * 100}
              onChange={(e) =>
                handleThresholdChange(setFlagThreshold, parseInt(e.target.value) / 100)
              }
              className="w-full h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              disabled={!policy.enabled}
            />
          </div>
        </div>

        {/* Save/Reset buttons */}
        {hasChanges && (
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <button onClick={handleReset} className="btn btn-secondary btn-sm">
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
