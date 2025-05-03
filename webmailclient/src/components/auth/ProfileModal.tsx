// src/components/ProfileModal.tsx

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";

const ProfileModal: React.FC = () => {
  const { isProfileModalOpen, toggleProfileModal, updatePassword } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState<string|null>(null);
  const [success, setSuccess] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isProfileModalOpen) return null;

  const onClose = () => {
    setError(null);
    setSuccess(false);
    toggleProfileModal(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next !== confirm) {
      setError("New password doesn't match");
      return;
    }
    try {
      await updatePassword(current, next);
      setSuccess(true);
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Update failed');
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggleShow: () => void
  ) => (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          className="w-full border rounded px-2 py-1 pr-10"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute inset-y-0 right-2 flex items-center text-gray-500"
          tabIndex={-1}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {renderField(
            'Current password',
            current,
            setCurrent,
            showCurrent,
            () => setShowCurrent(v => !v)
          )}
          {renderField(
            'New password',
            next,
            setNext,
            showNext,
            () => setShowNext(v => !v)
          )}
          {renderField(
            'Confirm password',
            confirm,
            setConfirm,
            showConfirm,
            () => setShowConfirm(v => !v)
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">Password updated!</p>}
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
