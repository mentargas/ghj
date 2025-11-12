import { useState, useEffect, useMemo } from 'react';
import { beneficiariesService } from '../services/supabaseService';
import type { Beneficiary } from '../data/mockData';

interface UseBeneficiariesOptions {
  organizationId?: string;
  familyId?: string;
  searchTerm?: string;
  statusFilter?: string;
  identityStatusFilter?: string;
}

export const useBeneficiaries = (options: UseBeneficiariesOptions = {}) => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBeneficiaries = async () => {
      try {
        setLoading(true);
        setError(null);

        let data: Beneficiary[];
        if (options.organizationId) {
          data = await beneficiariesService.getByOrganization(options.organizationId);
        } else if (options.familyId) {
          data = await beneficiariesService.getByFamily(options.familyId);
        } else {
          data = await beneficiariesService.getAll();
        }

        setBeneficiaries(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'خطأ في تحميل المستفيدين';
        setError(errorMessage);
        console.error(errorMessage, err);
      } finally {
        setLoading(false);
      }
    };

    fetchBeneficiaries();
  }, [options.organizationId, options.familyId]);

  const filteredBeneficiaries = useMemo(() => {
    let filtered = [...beneficiaries];

    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(searchLower) ||
        b.nationalId.includes(options.searchTerm!) ||
        b.phone.includes(options.searchTerm!)
      );
    }

    if (options.statusFilter && options.statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === options.statusFilter);
    }

    if (options.identityStatusFilter && options.identityStatusFilter !== 'all') {
      filtered = filtered.filter(b => b.identityStatus === options.identityStatusFilter);
    }

    return filtered;
  }, [beneficiaries, options.searchTerm, options.statusFilter, options.identityStatusFilter]);

  const statistics = useMemo(() => {
    return {
      total: beneficiaries.length,
      verified: beneficiaries.filter(b => b.identityStatus === 'verified').length,
      pending: beneficiaries.filter(b => b.identityStatus === 'pending').length,
      rejected: beneficiaries.filter(b => b.identityStatus === 'rejected').length,
      active: beneficiaries.filter(b => b.status === 'active').length,
      suspended: beneficiaries.filter(b => b.status === 'suspended').length
    };
  }, [beneficiaries]);

  const addBeneficiary = async (beneficiaryData: Partial<Beneficiary>) => {
    try {
      setLoading(true);
      const newBeneficiary = await beneficiariesService.create(beneficiaryData);
      setBeneficiaries(prev => [newBeneficiary, ...prev]);
      return newBeneficiary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في إضافة المستفيد';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBeneficiary = async (id: string, updates: Partial<Beneficiary>) => {
    try {
      setLoading(true);
      await beneficiariesService.update(id, updates);
      setBeneficiaries(prev =>
        prev.map(b =>
          b.id === id
            ? { ...b, ...updates, updatedAt: new Date().toISOString() }
            : b
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحديث المستفيد';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBeneficiary = async (id: string) => {
    try {
      setLoading(true);
      await beneficiariesService.delete(id);
      setBeneficiaries(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في حذف المستفيد';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    const data = await beneficiariesService.getAll();
    setBeneficiaries(data);
  };

  return {
    beneficiaries: filteredBeneficiaries,
    allBeneficiaries: beneficiaries,
    loading,
    error,
    statistics,
    addBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    refetch
  };
};

export const useBeneficiary = (id: string) => {
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBeneficiary = async () => {
      if (id) {
        setLoading(true);
        try {
          const data = await beneficiariesService.getById(id);
          setBeneficiary(data);
          setError(data ? null : 'المستفيد غير موجود');
        } catch (err) {
          setError('خطأ في تحميل بيانات المستفيد');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBeneficiary();
  }, [id]);

  return { beneficiary, loading, error };
};
