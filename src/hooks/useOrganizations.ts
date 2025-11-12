import { useState, useEffect, useMemo } from 'react';
import { organizationsService } from '../services/supabaseService';
import type { Organization } from '../data/mockData';

interface UseOrganizationsOptions {
  searchTerm?: string;
  statusFilter?: string;
  typeFilter?: string;
}

export const useOrganizations = (options: UseOrganizationsOptions = {}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await organizationsService.getAll();
        setOrganizations(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'خطأ في تحميل المؤسسات';
        setError(errorMessage);
        console.error(errorMessage, err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const filteredOrganizations = useMemo(() => {
    let filtered = [...organizations];

    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(searchLower) ||
        org.type.toLowerCase().includes(searchLower) ||
        org.location.toLowerCase().includes(searchLower)
      );
    }

    if (options.statusFilter && options.statusFilter !== 'all') {
      filtered = filtered.filter(org => org.status === options.statusFilter);
    }

    if (options.typeFilter && options.typeFilter !== 'all') {
      filtered = filtered.filter(org => org.type.includes(options.typeFilter!));
    }

    return filtered;
  }, [organizations, options.searchTerm, options.statusFilter, options.typeFilter]);

  const statistics = useMemo(() => {
    return {
      total: organizations.length,
      active: organizations.filter(org => org.status === 'active').length,
      pending: organizations.filter(org => org.status === 'pending').length,
      suspended: organizations.filter(org => org.status === 'suspended').length,
      totalBeneficiaries: organizations.reduce((sum, org) => sum + org.beneficiariesCount, 0),
      totalPackages: organizations.reduce((sum, org) => sum + org.packagesCount, 0)
    };
  }, [organizations]);

  const addOrganization = async (orgData: Partial<Organization>) => {
    try {
      setLoading(true);
      const newOrganization = await organizationsService.create(orgData);
      setOrganizations(prev => [newOrganization, ...prev]);
      return newOrganization;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في إضافة المؤسسة';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    try {
      setLoading(true);
      await organizationsService.update(id, updates);
      setOrganizations(prev =>
        prev.map(org =>
          org.id === id
            ? { ...org, ...updates }
            : org
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحديث المؤسسة';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      setLoading(true);
      await organizationsService.delete(id);
      setOrganizations(prev => prev.filter(org => org.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في حذف المؤسسة';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    const data = await organizationsService.getAll();
    setOrganizations(data);
  };

  return {
    organizations: filteredOrganizations,
    allOrganizations: organizations,
    loading,
    error,
    statistics,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    refetch
  };
};

export const useOrganization = (id: string) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (id) {
        setLoading(true);
        try {
          const data = await organizationsService.getById(id);
          setOrganization(data);
          setError(data ? null : 'المؤسسة غير موجودة');
        } catch (err) {
          setError('خطأ في تحميل بيانات المؤسسة');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchOrganization();
  }, [id]);

  return { organization, loading, error };
};
