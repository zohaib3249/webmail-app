import React from 'react';
import { Combobox } from '@headlessui/react';
import { X } from 'lucide-react';

interface EmailMultiSelectProps {
  value: { email: string; name?: string }[];
  onChange: (value: { email: string; name?: string }[]) => void;
  contacts: { email: string; name?: string }[];
  placeholder?: string;
}

export const EmailMultiSelect: React.FC<EmailMultiSelectProps> = ({ value, onChange, contacts, placeholder }) => {
  return (
    <Combobox multiple value={value} onChange={onChange}>
      <div className="relative flex flex-wrap items-center gap-1 border-b border-gray-300 px-2 py-1 text-sm focus-within:border-blue-500">
        {Array.isArray(value) && value.map((person, idx) => (
  <div
    key={idx}
    className="flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs"
  >
    {person.email}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(value.filter((_, i) => i !== idx));
      }}
      className="ml-1 text-blue-800 hover:text-red-500"
    >
      <X size={12} />
    </button>
  </div>
))}

        <Combobox.Input
          className="flex-1 min-w-[120px] bg-transparent focus:outline-none"
          displayValue={() => ''}
          placeholder={placeholder || 'Type to search'}
        />
        <Combobox.Options className="absolute left-0 top-full z-10 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white border shadow-lg">
          {contacts.map((contact) => (
            <Combobox.Option key={contact.email} value={{ email: contact.email, name: contact.name }}>
              {({ active }) => (
                <div
                  className={`px-4 py-2 cursor-pointer ${
                    active ? 'bg-blue-500 text-white' : 'text-gray-900'
                  }`}
                >
                  {contact.name} ({contact.email})
                </div>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

export default EmailMultiSelect;
