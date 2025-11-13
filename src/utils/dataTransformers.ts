/**
 * Data Transformers Utility
 * تحويل البيانات من snake_case (Database) إلى camelCase (Frontend)
 */

import type { Database } from '../types/database';
import type { Beneficiary as BeneficiaryType } from '../data/mockData';

type DatabaseBeneficiary = Database['public']['Tables']['beneficiaries']['Row'];

/**
 * تحويل بيانات مستفيد من snake_case إلى camelCase
 */
export function transformBeneficiary(dbBeneficiary: DatabaseBeneficiary): BeneficiaryType {
  return {
    id: dbBeneficiary.id,
    name: dbBeneficiary.name,
    fullName: dbBeneficiary.full_name,
    nationalId: dbBeneficiary.national_id,
    dateOfBirth: dbBeneficiary.date_of_birth,
    gender: dbBeneficiary.gender,
    phone: dbBeneficiary.phone,
    address: dbBeneficiary.address,
    detailedAddress: dbBeneficiary.detailed_address || {
      governorate: '',
      city: '',
      district: '',
      street: '',
      additionalInfo: ''
    },
    location: dbBeneficiary.location || { lat: 0, lng: 0 },
    organizationId: dbBeneficiary.organization_id,
    familyId: dbBeneficiary.family_id,
    relationToFamily: dbBeneficiary.relation_to_family,
    isHeadOfFamily: false, // سيتم حسابه من العلاقات
    spouseId: null, // سيتم حسابه من العلاقات
    childrenIds: [], // سيتم حسابه من العلاقات
    parentId: null, // سيتم حسابه من العلاقات
    medicalConditions: [], // سيتم إضافته لاحقاً
    profession: dbBeneficiary.profession,
    maritalStatus: dbBeneficiary.marital_status,
    economicLevel: dbBeneficiary.economic_level,
    membersCount: dbBeneficiary.members_count || 1,
    additionalDocuments: dbBeneficiary.additional_documents || [],
    identityStatus: dbBeneficiary.identity_status,
    identityImageUrl: dbBeneficiary.identity_image_url,
    status: dbBeneficiary.status,
    eligibilityStatus: dbBeneficiary.eligibility_status,
    lastReceived: dbBeneficiary.last_received || new Date().toISOString(),
    totalPackages: dbBeneficiary.total_packages || 0,
    notes: dbBeneficiary.notes || '',
    createdAt: dbBeneficiary.created_at,
    updatedAt: dbBeneficiary.updated_at,
    createdBy: dbBeneficiary.created_by || 'system',
    updatedBy: dbBeneficiary.updated_by || 'system'
  };
}

/**
 * تحويل قائمة مستفيدين
 */
export function transformBeneficiaries(dbBeneficiaries: DatabaseBeneficiary[]): BeneficiaryType[] {
  return dbBeneficiaries.map(transformBeneficiary);
}

/**
 * تحويل بيانات من camelCase إلى snake_case للإرسال إلى Database
 */
export function transformBeneficiaryToDB(beneficiary: Partial<BeneficiaryType>): Partial<DatabaseBeneficiary> {
  const dbData: any = {};
  
  if (beneficiary.name) dbData.name = beneficiary.name;
  if (beneficiary.fullName) dbData.full_name = beneficiary.fullName;
  if (beneficiary.nationalId) dbData.national_id = beneficiary.nationalId;
  if (beneficiary.dateOfBirth) dbData.date_of_birth = beneficiary.dateOfBirth;
  if (beneficiary.gender) dbData.gender = beneficiary.gender;
  if (beneficiary.phone) dbData.phone = beneficiary.phone;
  if (beneficiary.address) dbData.address = beneficiary.address;
  if (beneficiary.detailedAddress) dbData.detailed_address = beneficiary.detailedAddress;
  if (beneficiary.location) dbData.location = beneficiary.location;
  if (beneficiary.organizationId !== undefined) dbData.organization_id = beneficiary.organizationId;
  if (beneficiary.familyId !== undefined) dbData.family_id = beneficiary.familyId;
  if (beneficiary.relationToFamily) dbData.relation_to_family = beneficiary.relationToFamily;
  if (beneficiary.profession) dbData.profession = beneficiary.profession;
  if (beneficiary.maritalStatus) dbData.marital_status = beneficiary.maritalStatus;
  if (beneficiary.economicLevel) dbData.economic_level = beneficiary.economicLevel;
  if (beneficiary.membersCount !== undefined) dbData.members_count = beneficiary.membersCount;
  if (beneficiary.additionalDocuments) dbData.additional_documents = beneficiary.additionalDocuments;
  if (beneficiary.identityStatus) dbData.identity_status = beneficiary.identityStatus;
  if (beneficiary.identityImageUrl !== undefined) dbData.identity_image_url = beneficiary.identityImageUrl;
  if (beneficiary.status) dbData.status = beneficiary.status;
  if (beneficiary.eligibilityStatus) dbData.eligibility_status = beneficiary.eligibilityStatus;
  if (beneficiary.lastReceived) dbData.last_received = beneficiary.lastReceived;
  if (beneficiary.totalPackages !== undefined) dbData.total_packages = beneficiary.totalPackages;
  if (beneficiary.notes !== undefined) dbData.notes = beneficiary.notes;
  if (beneficiary.createdBy) dbData.created_by = beneficiary.createdBy;
  if (beneficiary.updatedBy) dbData.updated_by = beneficiary.updatedBy;
  
  return dbData;
}

/**
 * تحويل عام من snake_case إلى camelCase
 */
export function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const camelObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camelObj[camelKey] = snakeToCamel(obj[key]);
      }
    }
    return camelObj;
  }
  
  return obj;
}

/**
 * تحويل عام من camelCase إلى snake_case
 */
export function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const snakeObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeObj[snakeKey] = camelToSnake(obj[key]);
      }
    }
    return snakeObj;
  }
  
  return obj;
}
