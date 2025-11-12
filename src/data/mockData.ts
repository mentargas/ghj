// This file has been deprecated - all data has been migrated to Supabase
// Types are exported from services for backward compatibility

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'organization' | 'family';
  organizationId?: string;
  familyId?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
  beneficiariesCount: number;
  packagesCount: number;
  completionRate: number;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  packagesAvailable: number;
  templatesCount: number;
  isPopular: boolean;
}

export interface Family {
  id: string;
  name: string;
  headOfFamily: string;
  headOfFamilyId: string;
  familyMembers: string[];
  totalChildren: number;
  totalMedicalCases: number;
  averageAge: number;
  phone: string;
  membersCount: number;
  packagesDistributed: number;
  completionRate: number;
  location: string;
  createdAt: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phone: string;
  address: string;
  detailedAddress: {
    governorate: string;
    city: string;
    district: string;
    street: string;
    additionalInfo: string;
  };
  location: { lat: number; lng: number };
  organizationId?: string;
  familyId?: string;
  relationToFamily?: string;
  isHeadOfFamily: boolean;
  spouseId?: string | null;
  childrenIds: string[];
  parentId?: string | null;
  medicalConditions: string[];
  profession: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  economicLevel: 'very_poor' | 'poor' | 'moderate' | 'good';
  membersCount: number;
  additionalDocuments: { name: string; url: string; type: string; }[];
  identityStatus: 'verified' | 'pending' | 'rejected';
  identityImageUrl?: string;
  status: 'active' | 'pending' | 'suspended';
  eligibilityStatus: 'eligible' | 'under_review' | 'rejected';
  lastReceived: string;
  totalPackages: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PackageTemplate {
  id: string;
  name: string;
  type: 'food' | 'medical' | 'clothing' | 'hygiene' | 'emergency';
  organization_id: string;
  description: string;
  contents: PackageItem[];
  status: 'active' | 'draft' | 'inactive';
  createdAt: string;
  usageCount: number;
  totalWeight: number;
  estimatedCost: number;
}

export interface PackageItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  weight: number;
  notes?: string;
}

export interface Package {
  id: string;
  name: string;
  type: string;
  description: string;
  value: number;
  funder: string;
  organizationId?: string;
  familyId?: string;
  beneficiaryId?: string;
  status: 'pending' | 'assigned' | 'in_delivery' | 'delivered' | 'failed';
  createdAt: string;
  deliveredAt?: string;
  expiryDate?: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'busy' | 'offline';
  rating: number;
  completedTasks: number;
  currentLocation?: { lat: number; lng: number };
  isHumanitarianApproved: boolean;
}

export interface Task {
  id: string;
  packageId: string;
  beneficiaryId: string;
  courierId?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'delivered' | 'failed' | 'rescheduled';
  createdAt: string;
  scheduledAt?: string;
  deliveredAt?: string;
  deliveryLocation?: { lat: number; lng: number };
  notes?: string;
  courierNotes?: string;
  deliveryProofImageUrl?: string;
  digitalSignatureImageUrl?: string;
  estimatedArrivalTime?: string;
  remainingDistance?: number;
  photoUrl?: string;
  failureReason?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  type: 'create' | 'verify' | 'approve' | 'update' | 'deliver' | 'review';
  beneficiaryId?: string;
  details?: string;
}

export interface Alert {
  id: string;
  type: 'delayed' | 'failed' | 'expired' | 'urgent';
  title: string;
  description: string;
  relatedId: string;
  relatedType: 'package' | 'beneficiary' | 'task';
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'delete' | 'approve' | 'manage';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  associatedId: string | null;
  associatedType: 'organization' | 'family' | null;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
}

// All mock data arrays are empty - use Supabase services instead
export const mockOrganizations: Organization[] = [];
export const mockFamilies: Family[] = [];
export const mockBeneficiaries: Beneficiary[] = [];
export const mockPackageTemplates: PackageTemplate[] = [];
export const mockPackages: Package[] = [];
export const mockCouriers: Courier[] = [];
export const mockTasks: Task[] = [];
export const mockAlerts: Alert[] = [];
export const mockActivityLog: ActivityLog[] = [];
export const mockPermissions: Permission[] = [];
export const mockRoles: Role[] = [];
export const mockSystemUsers: SystemUser[] = [];

// Legacy exports - use Supabase services instead
export const beneficiaries = mockBeneficiaries;
export const calculateStats = () => ({
  totalBeneficiaries: 0,
  totalPackages: 0,
  deliveredPackages: 0,
  activeTasks: 0,
  criticalAlerts: 0,
  deliveryRate: 0
});

// Helper functions - deprecated, use services instead
export const getFamilyMembers = (): Beneficiary[] => [];
export const getHeadOfFamily = (): Beneficiary | undefined => undefined;
export const getSpouse = (): Beneficiary | undefined => undefined;
export const getChildren = (): Beneficiary[] => [];
export const getFamilyHierarchy = () => null;
export const validateFamilyMemberAddition = () => ({ isValid: false, error: 'Use Supabase services' });
export const getOrganizationById = (): Organization | undefined => undefined;
export const getFamilyById = (): Family | undefined => undefined;
export const getBeneficiariesByOrganization = (): Beneficiary[] => [];
export const getBeneficiariesByFamily = (): Beneficiary[] => [];
export const getPackagesByBeneficiary = (): Package[] => [];
export const getTasksByStatus = (): Task[] => [];
export const getUnreadAlerts = (): Alert[] => [];
export const getCriticalAlerts = (): Alert[] => [];
export const getTemplatesByOrganization = (): PackageTemplate[] => [];
export const getTemplateById = (): PackageTemplate | undefined => undefined;
