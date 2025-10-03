import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listLenders, createLender } from '@/features/lenders/actions';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, RefreshCw, Building2 } from 'lucide-react';
import EditLenderModal from './EditLenderModal';
import CreateLenderButton from '@/components/lenders/CreateLenderButton';
import { lower } from '@/lib/dedupe';

type Lender = {
  id: string;
  name: string;
  company_name: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  min_loan_amount: number;
  max_loan_amount: number;
  is_active: boolean;
  notes: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
};

export default function LenderListPage() {
  const queryClient = useQueryClient();
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New robust loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lenders, setLenders] = useState<Lender[]>([]);
  

  const loadLenders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const siloItem = localStorage.getItem("silo");
      const silo = siloItem ? lower(siloItem) : undefined;
      
      const result = await listLenders({ 
        silo,
        limit: 100
      });
      setLenders(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load lenders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLenders();
  }, [loadLenders]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/lenders/${id}`, { 
      method: 'DELETE'}),
    onSuccess: () => {
      loadLenders(); // Reload data after delete
    },
  });

  const handleEdit = (lender: Lender) => {
    setSelectedLender(lender);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedLender(null);
    setIsModalOpen(true);
  };

  const handleQuickAdd = async () => {
    try {
      await createLender({ 
        name: 'Sample Lender ' + Date.now(), 
        status: 'active' 
      });
      await loadLenders();
    } catch (error) {
      setError('Failed to create sample lender');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this lender?')) {
      deleteMutation.mutate(id);
    }
  };

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-gray-600">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading lenders...
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="text-red-600 mb-4">⚠️ {error}</div>
      <Button onClick={loadLenders} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );

  return (
    <div className="p-6" data-page="lender-list">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Lenders ({lenders.length})</h1>
        <div className="flex gap-2">
          <Button onClick={loadLenders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <CreateLenderButton>
            Add Lender
          </CreateLenderButton>
        </div>
      </div>


      {/* Empty state */}
      {!loading && !error && lenders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No lenders found</h3>
          <p className="mb-4">Get started by adding your first lender.</p>
          <Button onClick={handleQuickAdd} variant="outline">
            + Add Sample Lender
          </Button>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loan Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lenders.map((lender: Lender) => (
              <tr key={lender.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {lender.company_name || lender.name || '(No name)'}
                  </div>
                  <div className="text-sm text-gray-500">{lender.website}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{lender.email}</div>
                  <div className="text-sm text-gray-500">{lender.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lender.country || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${lender.min_loan_amount?.toLocaleString() || '0'} - 
                  ${lender.max_loan_amount?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    lender.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {lender.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(lender)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(lender.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {lenders.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No lenders found. <Button variant="ghost" onClick={handleAdd}>Add the first lender</Button>
          </div>
        )}
      </div>

      <EditLenderModal
        lender={selectedLender}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['lenders'] });
        }}
      />
    </div>
  );
}