// Contact status constants
export const CONTACT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  BLOCKED: 'blocked',
  ARCHIVED: 'archived',
} as const;

export const CONTACT_STATUS_LABELS = {
  [CONTACT_STATUS.ACTIVE]: 'Active',
  [CONTACT_STATUS.INACTIVE]: 'Inactive', 
  [CONTACT_STATUS.PENDING]: 'Pending',
  [CONTACT_STATUS.BLOCKED]: 'Blocked',
  [CONTACT_STATUS.ARCHIVED]: 'Archived',
} as const;

export const CONTACT_STATUS_COLORS = {
  [CONTACT_STATUS.ACTIVE]: 'bg-green-100 text-green-800',
  [CONTACT_STATUS.INACTIVE]: 'bg-gray-100 text-gray-800',
  [CONTACT_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [CONTACT_STATUS.BLOCKED]: 'bg-red-100 text-red-800',
  [CONTACT_STATUS.ARCHIVED]: 'bg-blue-100 text-blue-800',
} as const;

export type ContactStatus = typeof CONTACT_STATUS[keyof typeof CONTACT_STATUS];